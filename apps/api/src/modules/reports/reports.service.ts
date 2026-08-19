import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import {
  CreateReportDto,
  QueryReportsDto,
  ResolveReportDto,
  DismissReportDto,
  SanctionPayloadDto,
} from './reports.dto.js';
import { MessagesGateway } from '../messages/messages.gateway.js';
import {
  ReportStatus,
  ReportType,
  AuditActionType,
  AuditLogType,
  SanctionType,
  SanctionStatus,
  UserStatus,
} from '../../generated/prisma/enums.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflakeService: SnowflakeService,
    private readonly messagesGateway: MessagesGateway,
  ) {}

  async createReport(reporterId: string, dto: CreateReportDto) {
    const reportId = this.snowflakeService.generate();
    const targetBigInt = BigInt(dto.targetId);

    if (dto.targetType === ReportType.post) {
      const post = await this.prisma.post.findUnique({ where: { id: targetBigInt } });
      if (!post) throw new NotFoundException('Reported post does not exist');
    } else if (dto.targetType === ReportType.comment) {
      const comment = await this.prisma.comment.findUnique({ where: { id: targetBigInt } });
      if (!comment) throw new NotFoundException('Reported comment does not exist');
    } else if (dto.targetType === ReportType.user) {
      const user = await this.prisma.user.findUnique({ where: { id: targetBigInt } });
      if (!user) throw new NotFoundException('Reported user does not exist');
    }

    const created = await this.prisma.report.create({
      data: {
        id: reportId,
        reporterId: BigInt(reporterId),
        targetType: dto.targetType,
        targetId: targetBigInt,
        reason: dto.reason,
        details: dto.details,
        status: ReportStatus.pending,
      },
    });

    await this.notifyPendingReportsCount();

    return {
      ...created,
      id: created.id.toString(),
      reporterId: created.reporterId.toString(),
      targetId: created.targetId.toString(),
    };
  }

  async getReports(query: QueryReportsDto) {
    const limit = Number(query.limit) || 15;
    const reports = await this.prisma.report.findMany({
      where: {
        status: query.status ? query.status : undefined,
        targetType: query.targetType ? query.targetType : undefined,
      },
      take: limit + 1,
      cursor: query.cursor ? { id: BigInt(query.cursor) } : undefined,
      skip: query.cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (reports.length > limit) {
      const nextItem = reports.pop();
      nextCursor = nextItem!.id.toString();
    }

    const hydratedData = await Promise.all(
      reports.map(async (rep) => {
        let targetDetails: any = null;
        try {
          if (rep.targetType === ReportType.post) {
            const p = await this.prisma.post.findUnique({
              where: { id: rep.targetId },
              include: {
                user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                media: { include: { media: true } },
              },
            });
            if (p) {
              targetDetails = {
                id: p.id.toString(),
                content: p.content,
                mediaUrls: p.media?.map((m) => m.media.originalUrl) || [],
                author: { ...p.user, id: p.user.id.toString() },
              };
            }
          } else if (rep.targetType === ReportType.comment) {
            const c = await this.prisma.comment.findUnique({
              where: { id: rep.targetId },
              include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
            });
            if (c) {
              targetDetails = {
                id: c.id.toString(),
                content: c.content,
                postId: c.postId.toString(),
                author: { ...c.user, id: c.user.id.toString() },
              };
            }
          } else if (rep.targetType === ReportType.user) {
            const u = await this.prisma.user.findUnique({
              where: { id: rep.targetId },
              select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
            });
            if (u) {
              targetDetails = {
                id: u.id.toString(),
                username: u.username,
                displayName: u.displayName,
                avatarUrl: u.avatarUrl,
                bio: u.bio,
              };
            }
          }
        } catch {}

        return {
          ...rep,
          id: rep.id.toString(),
          reporterId: rep.reporterId.toString(),
          targetId: rep.targetId.toString(),
          reviewedById: rep.reviewedById?.toString() || null,
          reporter: {
            ...rep.reporter,
            id: rep.reporter.id.toString(),
          },
          reviewedBy: rep.reviewedBy
            ? {
                ...rep.reviewedBy,
                id: rep.reviewedBy.id.toString(),
              }
            : null,
          targetDetails,
        };
      }),
    );

    return {
      data: hydratedData,
      meta: {
        limit,
        nextCursor,
        hasNextPage: !!nextCursor,
      },
    };
  }

  async resolveReport(reportId: string, moderatorId: string, dto: ResolveReportDto) {
    const rId = BigInt(reportId);
    const report = await this.prisma.report.findUnique({ where: { id: rId } });
    if (!report) throw new NotFoundException('Report not found');

    if (dto.deleteContent) {
      if (report.targetType === ReportType.post) {
        await this.prisma.post.deleteMany({ where: { id: report.targetId } });
      } else if (report.targetType === ReportType.comment) {
        await this.prisma.comment.deleteMany({ where: { id: report.targetId } });
      }
    }

    if (dto.sanction) {
      await this.applyUserSanction(dto.sanction, moderatorId, rId);
    }

    const updated = await this.prisma.report.update({
      where: { id: rId },
      data: {
        status: ReportStatus.resolved,
        reviewedById: BigInt(moderatorId),
        reviewedAt: new Date(),
        resolution: dto.resolution || 'Resolved by moderator',
      },
    });

    const auditId = this.snowflakeService.generate();
    await this.prisma.auditLog.create({
      data: {
        id: auditId,
        adminId: BigInt(moderatorId),
        action: AuditActionType.update,
        targetId: rId,
        targetType: AuditLogType.report,
        metadata: {
          action: 'resolve_report',
          deleteContent: !!dto.deleteContent,
          resolution: dto.resolution,
          sanction: dto.sanction ? { type: dto.sanction.type, targetUserId: dto.sanction.targetUserId } : null,
        },
      },
    });

    await this.notifyPendingReportsCount();

    return {
      ...updated,
      id: updated.id.toString(),
      reporterId: updated.reporterId.toString(),
      targetId: updated.targetId.toString(),
      reviewedById: updated.reviewedById?.toString() || null,
    };
  }

  async dismissReport(reportId: string, moderatorId: string, dto: DismissReportDto) {
    const rId = BigInt(reportId);
    const report = await this.prisma.report.findUnique({ where: { id: rId } });
    if (!report) throw new NotFoundException('Report not found');

    if (dto.sanction) {
      await this.applyUserSanction(dto.sanction, moderatorId, rId);
    }

    const updated = await this.prisma.report.update({
      where: { id: rId },
      data: {
        status: ReportStatus.dismissed,
        reviewedById: BigInt(moderatorId),
        reviewedAt: new Date(),
        resolution: dto.resolution || 'Dismissed as invalid or non-violating',
      },
    });

    const auditId = this.snowflakeService.generate();
    await this.prisma.auditLog.create({
      data: {
        id: auditId,
        adminId: BigInt(moderatorId),
        action: AuditActionType.update,
        targetId: rId,
        targetType: AuditLogType.report,
        metadata: {
          action: 'dismiss_report',
          resolution: dto.resolution,
          sanction: dto.sanction ? { type: dto.sanction.type, targetUserId: dto.sanction.targetUserId } : null,
        },
      },
    });

    await this.notifyPendingReportsCount();

    return {
      ...updated,
      id: updated.id.toString(),
      reporterId: updated.reporterId.toString(),
      targetId: updated.targetId.toString(),
      reviewedById: updated.reviewedById?.toString() || null,
    };
  }

  async getPendingReportsCount(): Promise<{ pendingCount: number }> {
    const count = await this.prisma.report.count({
      where: { status: ReportStatus.pending },
    });
    return { pendingCount: count };
  }

  private async applyUserSanction(
    payload: SanctionPayloadDto,
    issuedById: string,
    reportId: bigint,
  ) {
    const userId = BigInt(payload.targetUserId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Target user ${payload.targetUserId} not found`);

    const sanctionId = this.snowflakeService.generate();

    let expiresAt: Date | undefined;
    if (payload.durationDays && payload.durationDays > 0) {
      expiresAt = new Date(Date.now() + payload.durationDays * 24 * 60 * 60 * 1000);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userSanction.create({
        data: {
          id: sanctionId,
          userId,
          issuedById: BigInt(issuedById),
          reportId,
          type: payload.type,
          reason: payload.reason,
          status: SanctionStatus.active,
          expiresAt,
        },
      });

      if (payload.type === SanctionType.warning) {
        const notifId = this.snowflakeService.generate();
        await tx.notification.create({
          data: {
            id: notifId,
            receiverId: userId,
            actorId: BigInt(issuedById),
            type: 'system_warning' as any,
            isRead: false,
            isDeleted: false,
          },
        });
      } else if (payload.type === SanctionType.suspension) {
        await tx.user.update({
          where: { id: userId },
          data: { status: UserStatus.suspended },
        });
        await tx.session.deleteMany({ where: { userId } });
      } else if (payload.type === SanctionType.ban) {
        await tx.user.update({
          where: { id: userId },
          data: { status: UserStatus.banned },
        });
        await tx.session.deleteMany({ where: { userId } });
      }
    });
  }

  private async notifyPendingReportsCount() {
    try {
      const count = await this.prisma.report.count({
        where: { status: ReportStatus.pending },
      });
      this.messagesGateway.emitPendingReportsCount(count);
    } catch {}
  }
}
