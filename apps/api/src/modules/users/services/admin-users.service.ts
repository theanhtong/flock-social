import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../../common/snowflake/snowflake.service.js';
import {
  AdminQueryUsersDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  BanUserDto,
  UnbanUserDto,
  SystemStatsDto,
} from '../admin-users.dto.js';
import {
  AuditActionType,
  AuditLogType,
  SanctionStatus,
  SanctionType,
  UserRole,
  UserStatus,
} from '../../../generated/prisma/enums.js';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflakeService: SnowflakeService,
  ) {}

  async getUsers(query: AdminQueryUsersDto) {
    const limit = Number(query.limit) || 20;
    const cursor = query.cursor;

    const where: any = {};

    if (query.search?.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { username: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { displayName: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.role) {
      where.role = query.role;
    }

    const users = await this.prisma.user.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: BigInt(cursor) } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'desc' },
    });

    let nextCursor: string | null = null;
    if (users.length > limit) {
      const nextItem = users.pop();
      nextCursor = nextItem!.id.toString();
    }

    const items = users.map((user) => {
      const { passwordHash, ...rest } = user;
      return {
        ...rest,
        id: user.id.toString(),
      };
    });

    return {
      data: items,
      meta: {
        limit,
        nextCursor,
        hasNextPage: !!nextCursor,
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: {
        settings: true,
        sanctions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const { passwordHash, ...rest } = user;

    return {
      ...rest,
      id: user.id.toString(),
      sanctions: user.sanctions.map((s) => ({
        ...s,
        id: s.id.toString(),
        userId: s.userId.toString(),
        issuedById: s.issuedById.toString(),
        liftedById: s.liftedById?.toString() || null,
        reportId: s.reportId?.toString() || null,
      })),
    };
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { role: dto.role },
    });

    await this.logAudit({
      adminId,
      action: AuditActionType.update,
      targetId: userId,
      targetType: AuditLogType.user,
      metadata: { field: 'role', oldRole: user.role, newRole: dto.role },
    });

    const { passwordHash, ...rest } = updated;
    return {
      ...rest,
      id: updated.id.toString(),
    };
  }

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { status: dto.status },
    });

    await this.logAudit({
      adminId,
      action: AuditActionType.update,
      targetId: userId,
      targetType: AuditLogType.user,
      metadata: { field: 'status', oldStatus: user.status, newStatus: dto.status },
    });

    const { passwordHash, ...rest } = updated;
    return {
      ...rest,
      id: updated.id.toString(),
    };
  }

  async banUser(userId: string, dto: BanUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const sanctionType = dto.type || SanctionType.ban;
    const targetStatus = sanctionType === SanctionType.ban ? UserStatus.banned : UserStatus.suspended;

    let expiresAt: Date | undefined = undefined;
    if (dto.durationDays && dto.durationDays > 0) {
      expiresAt = new Date(Date.now() + dto.durationDays * 24 * 60 * 60 * 1000);
    }

    const sanctionId = this.snowflakeService.generate();

    const [sanction] = await this.prisma.$transaction([
      this.prisma.userSanction.create({
        data: {
          id: sanctionId,
          userId: BigInt(userId),
          issuedById: BigInt(adminId),
          type: sanctionType,
          reason: dto.reason,
          status: SanctionStatus.active,
          expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: { status: targetStatus },
      }),
      this.prisma.session.deleteMany({
        where: { userId: BigInt(userId) },
      }),
    ]);

    await this.logAudit({
      adminId,
      action: AuditActionType.create,
      targetId: userId,
      targetType: AuditLogType.sanction,
      metadata: { sanctionId: sanctionId.toString(), type: sanctionType, reason: dto.reason },
    });

    return {
      message: `User ${user.username} has been ${targetStatus}`,
      sanction: {
        ...sanction,
        id: sanction.id.toString(),
        userId: sanction.userId.toString(),
        issuedById: sanction.issuedById.toString(),
      },
    };
  }

  async unbanUser(userId: string, dto: UnbanUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.userSanction.updateMany({
        where: {
          userId: BigInt(userId),
          status: SanctionStatus.active,
        },
        data: {
          status: SanctionStatus.lifted,
          liftedById: BigInt(adminId),
          liftedAt: new Date(),
          liftReason: dto.liftReason,
        },
      }),
      this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: { status: UserStatus.active },
      }),
    ]);

    await this.logAudit({
      adminId,
      action: AuditActionType.update,
      targetId: userId,
      targetType: AuditLogType.sanction,
      metadata: { action: 'unban', liftReason: dto.liftReason },
    });

    return { message: `User ${user.username} unbanned successfully` };
  }

  async getUserSanctions(userId: string) {
    const sanctions = await this.prisma.userSanction.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
    });

    return sanctions.map((s) => ({
      ...s,
      id: s.id.toString(),
      userId: s.userId.toString(),
      issuedById: s.issuedById.toString(),
      liftedById: s.liftedById?.toString() || null,
      reportId: s.reportId?.toString() || null,
    }));
  }

  async deleteUser(userId: string, adminId: string): Promise<{ message: string }> {
    const targetId = BigInt(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    await this.prisma.user.delete({
      where: { id: targetId },
    });

    await this.logAudit({
      adminId,
      action: AuditActionType.delete,
      targetId: userId,
      targetType: AuditLogType.user,
      metadata: { username: user.username, role: user.role, email: user.email },
    });

    return { message: `User @${user.username} deleted permanently` };
  }

  async getAuditLogs(cursor?: string, limit: number = 20) {
    const limitNum = Number(limit) || 20;
    const logs = await this.prisma.auditLog.findMany({
      take: limitNum + 1,
      cursor: cursor ? { id: BigInt(cursor) } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (logs.length > limit) {
      const nextItem = logs.pop();
      nextCursor = nextItem!.id.toString();
    }

    return {
      data: logs.map((log) => ({
        ...log,
        id: log.id.toString(),
        adminId: log.adminId.toString(),
        targetId: log.targetId.toString(),
        admin: {
          ...log.admin,
          id: log.admin.id.toString(),
        },
      })),
      meta: {
        limit,
        nextCursor,
        hasNextPage: !!nextCursor,
      },
    };
  }

  async getSystemStats(): Promise<SystemStatsDto> {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      totalPosts,
      pendingReports,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.active } }),
      this.prisma.user.count({ where: { status: UserStatus.suspended } }),
      this.prisma.user.count({ where: { status: UserStatus.banned } }),
      this.prisma.post.count(),
      this.prisma.report.count({ where: { status: 'pending' as any } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      totalPosts,
      pendingReports,
    };
  }

  private async logAudit(params: {
    adminId: string;
    action: AuditActionType;
    targetId: string;
    targetType: AuditLogType;
    metadata?: any;
  }) {
    const auditId = this.snowflakeService.generate();
    await this.prisma.auditLog.create({
      data: {
        id: auditId,
        adminId: BigInt(params.adminId),
        action: params.action,
        targetId: BigInt(params.targetId),
        targetType: params.targetType,
        metadata: params.metadata || {},
      },
    });
  }
}
