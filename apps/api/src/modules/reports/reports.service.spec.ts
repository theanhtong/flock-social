import { jest, describe, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { MessagesGateway } from '../messages/messages.gateway.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import { ReportStatus, ReportType } from '../../generated/prisma/enums.js';
import { ConfigService } from '@nestjs/config';
import 'dotenv/config';

const snowflake = new SnowflakeService(new ConfigService());
const REPORTER_ID = snowflake.generateString();
const TARGET_ID = snowflake.generateString();
const REPORT_ID = snowflake.generateString();
const MODERATOR_ID = snowflake.generateString();

function makeReport(overrides: any = {}) {
  return {
    id: BigInt(REPORT_ID),
    reporterId: BigInt(REPORTER_ID),
    targetType: ReportType.post,
    targetId: BigInt(TARGET_ID),
    reason: 'spam',
    details: 'Spam content',
    status: ReportStatus.pending,
    reviewedById: null,
    createdAt: new Date(),
    reporter: {
      id: BigInt(REPORTER_ID),
      username: 'reporter',
      displayName: 'Reporter User',
      avatarUrl: null,
    },
    reviewedBy: null,
    ...overrides,
  };
}

function makeMockPrisma() {
  const report = makeReport();
  return {
    post: {
      findUnique: jest.fn<any>().mockResolvedValue({ id: BigInt(TARGET_ID), content: 'Post content' }),
      deleteMany: jest.fn<any>().mockResolvedValue({ count: 1 }),
    },
    comment: {
      findUnique: jest.fn<any>().mockResolvedValue({ id: BigInt(TARGET_ID), content: 'Comment content' }),
      deleteMany: jest.fn<any>().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: jest.fn<any>().mockResolvedValue({ id: BigInt(TARGET_ID), username: 'reporteduser' }),
      update: jest.fn<any>().mockResolvedValue(undefined),
    },
    report: {
      create: jest.fn<any>().mockResolvedValue(report),
      findMany: jest.fn<any>().mockResolvedValue([report]),
      findUnique: jest.fn<any>().mockResolvedValue(report),
      count: jest.fn<any>().mockResolvedValue(1),
      update: jest.fn<any>().mockResolvedValue(report),
    },
    userSanction: {
      create: jest.fn<any>().mockResolvedValue({ id: BigInt('123') }),
    },
    auditLog: {
      create: jest.fn<any>().mockResolvedValue({ id: BigInt('456') }),
    },
    $transaction: jest.fn<any>().mockImplementation((arg: any) =>
      typeof arg === 'function' ? arg(makeMockPrisma()) : Promise.resolve([]),
    ),
  };
}

const mockMessagesGateway = {
  server: {
    emit: jest.fn<any>(),
  },
};

async function makeService(mockPrisma = makeMockPrisma()) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ReportsService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: SnowflakeService, useValue: snowflake },
      { provide: MessagesGateway, useValue: mockMessagesGateway },
    ],
  }).compile();

  return module.get<ReportsService>(ReportsService);
}

describe('ReportsService', () => {
  it('should be defined', async () => {
    const service = await makeService();
    expect(service).toBeDefined();
  });

  describe('createReport', () => {
    it('should create report for post target successfully', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.createReport(REPORTER_ID, {
        targetType: ReportType.post,
        targetId: TARGET_ID,
        reason: 'spam',
        details: 'Spam post details',
      });

      expect(prisma.post.findUnique).toHaveBeenCalled();
      expect(prisma.report.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe(REPORT_ID);
    });

    it('should throw NotFoundException if reported target post does not exist', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findUnique = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(
        service.createReport(REPORTER_ID, {
          targetType: ReportType.post,
          targetId: TARGET_ID,
          reason: 'spam',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReports', () => {
    it('should return paginated list of reports for admin', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.getReports({ limit: 10 });

      expect(prisma.report.findMany).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('resolveReport', () => {
    it('should resolve report and delete content if requested', async () => {
      const prisma = makeMockPrisma();
      prisma.$transaction = jest.fn<any>().mockImplementation((fn: any) => fn(prisma));
      const service = await makeService(prisma);

      const result = await service.resolveReport(REPORT_ID, MODERATOR_ID, {
        deleteContent: true,
      });

      expect(prisma.post.deleteMany).toHaveBeenCalled();
      expect(prisma.report.update).toHaveBeenCalled();
      expect(result.id).toBe(REPORT_ID);
    });

    it('should throw NotFoundException if report missing', async () => {
      const prisma = makeMockPrisma();
      prisma.report.findUnique = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(
        service.resolveReport(REPORT_ID, MODERATOR_ID, { deleteContent: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('dismissReport', () => {
    it('should dismiss report', async () => {
      const prisma = makeMockPrisma();
      prisma.$transaction = jest.fn<any>().mockImplementation((fn: any) => fn(prisma));
      const service = await makeService(prisma);

      const result = await service.dismissReport(REPORT_ID, MODERATOR_ID, {
        resolution: 'Invalid report',
      });

      expect(prisma.report.update).toHaveBeenCalled();
      expect(result.id).toBe(REPORT_ID);
    });
  });
});
