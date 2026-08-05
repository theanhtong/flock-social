import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { SessionService } from './session/session.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import { MailService } from '../../common/mail/mail.service.js';
import { SessionValidationResult } from './session/session.enum.js';

jest.mock('argon2');

const CONFIG: Record<string, string> = {
  JWT_SECRET: 'test-secret',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
};

const mockUser = {
  id: 123456789n,
  username: 'johndoe',
  email: 'john@example.com',
  displayName: 'John Doe',
  passwordHash: 'hashed-password',
  role: 'user',
  status: 'active',
  isVerified: true,
  avatarUrl: undefined,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

function makeRes() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as any;
}

function makeReq(cookies: Record<string, string> = {}) {
  return { cookies } as any;
}

async function makeService(
  overrides: {
    prisma?: Partial<Record<string, jest.Mock>>;
    redis?: Partial<Record<string, jest.Mock>>;
    sessionService?: Partial<Record<string, jest.Mock>>;
    snowflake?: Partial<Record<string, jest.Mock>>;
    jwtService?: Partial<Record<string, jest.Mock>>;
    mailService?: Partial<Record<string, jest.Mock>>;
  } = {},
): Promise<{
  service: AuthService;
  prisma: any;
  redis: any;
  sessionService: any;
  snowflake: any;
  jwtService: any;
  mailService: any;
}> {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ...overrides.prisma,
  };

  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    ...overrides.redis,
  };

  const sessionService = {
    save: jest.fn(),
    validate: jest.fn(),
    revoke: jest.fn(),
    revokeAllSessions: jest.fn(),
    ...overrides.sessionService,
  };

  const snowflake = {
    generate: jest.fn().mockReturnValue(123456789n),
    generateString: jest.fn().mockReturnValue('987654321'),
    ...overrides.snowflake,
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
    ...overrides.jwtService,
  };

  const mailService = {
    sendVerificationCode: jest.fn().mockResolvedValue(true),
    ...overrides.mailService,
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: PrismaService, useValue: prisma },
      { provide: RedisService, useValue: redis },
      { provide: SessionService, useValue: sessionService },
      { provide: SnowflakeService, useValue: snowflake },
      { provide: JwtService, useValue: jwtService },
      { provide: MailService, useValue: mailService },
      {
        provide: ConfigService,
        useValue: {
          get: (key: string, defaultValue?: string) =>
            key in CONFIG ? CONFIG[key] : defaultValue,
        },
      },
    ],
  }).compile();

  return {
    service: module.get<AuthService>(AuthService),
    prisma,
    redis,
    sessionService,
    snowflake,
    jwtService,
    mailService,
  };
}

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', async () => {
    const { service } = await makeService();
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException when username or email already exists', async () => {
      const { service, prisma } = await makeService();
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.register({
          username: 'johndoe',
          email: 'john@example.com',
          password: 'password123',
          displayName: 'John Doe',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should create a pending_verification user and send OTP email', async () => {
      const { service, prisma, redis, mailService } = await makeService();
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      redis.get.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        status: 'pending_verification',
        isVerified: false,
      });

      const result = await service.register({
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123',
        displayName: 'John Doe',
      } as any);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'pending_verification',
            isVerified: false,
          }),
        }),
      );
      expect(mailService.sendVerificationCode).toHaveBeenCalled();
      expect(result.email).toBe('john@example.com');
    });
  });

  describe('sendVerificationEmail', () => {
    it('should throw BadRequestException when account not found', async () => {
      const { service, prisma } = await makeService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.sendVerificationEmail('missing@example.com'),
      ).rejects.toThrow(/account not found/i);
    });

    it('should throw BadRequestException when in cooldown', async () => {
      const { service, prisma, redis } = await makeService();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      redis.get.mockResolvedValue('true');

      await expect(
        service.sendVerificationEmail(mockUser.email),
      ).rejects.toThrow(/wait 60 seconds/i);
    });

    it('should store OTP in redis with 10 minute TTL and set cooldown', async () => {
      const { service, prisma, redis } = await makeService();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      redis.get.mockResolvedValue(null);

      await service.sendVerificationEmail(mockUser.email);

      expect(redis.set).toHaveBeenCalledWith(
        `verify_otp:${mockUser.email}`,
        expect.stringMatching(/^\d{6}$/),
        600,
      );
      expect(redis.set).toHaveBeenCalledWith(
        `send_otp_cooldown:${mockUser.email}`,
        'true',
        60,
      );
    });

    it('should throw BadRequestException when email fails to send', async () => {
      const { service, prisma, redis, mailService } = await makeService();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      redis.get.mockResolvedValue(null);
      mailService.sendVerificationCode.mockResolvedValue(false);

      await expect(
        service.sendVerificationEmail(mockUser.email),
      ).rejects.toThrow(/failed to send verification email/i);
    });

    it('should return success when email sent', async () => {
      const { service, prisma, redis, mailService } = await makeService();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      redis.get.mockResolvedValue(null);
      mailService.sendVerificationCode.mockResolvedValue(true);

      const result = await service.sendVerificationEmail(mockUser.email);

      expect(result.success).toBe(true);
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException when otp is missing or mismatched', async () => {
      const { service, redis } = await makeService();
      redis.get.mockResolvedValue(null);

      await expect(
        service.verifyEmail(mockUser.email, '123456'),
      ).rejects.toThrow(/invalid or expired/i);
    });

    it('should throw BadRequestException when otp does not match', async () => {
      const { service, redis } = await makeService();
      redis.get.mockResolvedValue('654321');

      await expect(
        service.verifyEmail(mockUser.email, '123456'),
      ).rejects.toThrow(/invalid or expired/i);
    });

    it('should activate the user and clear otp on success', async () => {
      const { service, redis, prisma } = await makeService();
      redis.get.mockResolvedValue('123456');
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        status: 'active',
        isVerified: true,
      });

      const result = await service.verifyEmail(mockUser.email, '123456');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: mockUser.email },
        data: { status: 'active', isVerified: true },
      });
      expect(redis.del).toHaveBeenCalledWith(`verify_otp:${mockUser.email}`);
      expect(result.success).toBe(true);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException when user does not exist', async () => {
      const { service, prisma } = await makeService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@x.com', password: 'x' } as any, makeRes()),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when account is not active', async () => {
      const { service, prisma } = await makeService();
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'pending_verification',
      });

      await expect(
        service.login(
          { email: mockUser.email, password: 'x' } as any,
          makeRes(),
        ),
      ).rejects.toThrow(/not active/i);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const { service, prisma } = await makeService();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(
          { email: mockUser.email, password: 'wrong' } as any,
          makeRes(),
        ),
      ).rejects.toThrow(/invalid credentials/i);
    });

    it('should return tokens and set refresh cookie on success', async () => {
      const { service, prisma, sessionService } = await makeService();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      const res = makeRes();

      const result = await service.login(
        { email: mockUser.email, password: 'correct' } as any,
        res,
      );

      expect(sessionService.save).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe(mockUser.email);
    });
  });

  describe('refreshTokens', () => {
    it('should throw UnauthorizedException when refresh token cookie is missing', async () => {
      const { service } = await makeService();

      await expect(service.refreshTokens(makeReq(), makeRes())).rejects.toThrow(
        /refresh token missing/i,
      );
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      const { service, jwtService } = await makeService();
      jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));

      await expect(
        service.refreshTokens(makeReq({ refreshToken: 'bad' }), makeRes()),
      ).rejects.toThrow(/invalid refresh token/i);
    });

    it('should clear cookie and throw when session not found', async () => {
      const { service, jwtService, sessionService } = await makeService();
      jwtService.verifyAsync.mockResolvedValue({
        sub: '1',
        sid: 'sid-1',
        username: 'x',
        role: 'user',
      });
      sessionService.validate.mockResolvedValue(
        SessionValidationResult.NOT_FOUND,
      );
      const res = makeRes();

      await expect(
        service.refreshTokens(makeReq({ refreshToken: 'valid' }), res),
      ).rejects.toThrow(/session has been revoked/i);
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
    });

    it('should revoke session and throw on token reuse (mismatch)', async () => {
      const { service, jwtService, sessionService } = await makeService();
      jwtService.verifyAsync.mockResolvedValue({
        sub: '1',
        sid: 'sid-1',
        username: 'x',
        role: 'user',
      });
      sessionService.validate.mockResolvedValue(
        SessionValidationResult.MISMATCH,
      );
      const res = makeRes();

      await expect(
        service.refreshTokens(makeReq({ refreshToken: 'stolen' }), res),
      ).rejects.toThrow(/token reuse detected/i);
      expect(sessionService.revoke).toHaveBeenCalledWith('sid-1');
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
    });

    it('should issue new access token and rotate refresh token on success', async () => {
      const { service, jwtService, sessionService } = await makeService();
      jwtService.verifyAsync.mockResolvedValue({
        sub: '1',
        sid: 'sid-1',
        username: 'x',
        role: 'user',
      });
      sessionService.validate.mockResolvedValue(SessionValidationResult.VALID);
      const res = makeRes();

      const result = await service.refreshTokens(
        makeReq({ refreshToken: 'valid' }),
        res,
      );

      expect(sessionService.save).toHaveBeenCalledWith(
        '1',
        'sid-1',
        expect.any(String),
      );
      expect(res.cookie).toHaveBeenCalled();
      expect(result.accessToken).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should clear cookie even when no refresh token present', async () => {
      const { service } = await makeService();
      const res = makeRes();

      const result = await service.logout(makeReq(), res);

      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(result.message).toMatch(/logged out/i);
    });

    it('should revoke session when a valid refresh token is present', async () => {
      const { service, jwtService, sessionService } = await makeService();
      jwtService.verifyAsync.mockResolvedValue({ sid: 'sid-1' });
      const res = makeRes();

      await service.logout(makeReq({ refreshToken: 'valid' }), res);

      expect(sessionService.revoke).toHaveBeenCalledWith('sid-1');
    });

    it('should suppress error and still clear cookie when token verification fails', async () => {
      const { service, jwtService, sessionService } = await makeService();
      jwtService.verifyAsync.mockRejectedValue(new Error('expired'));
      const res = makeRes();

      const result = await service.logout(
        makeReq({ refreshToken: 'bad' }),
        res,
      );

      expect(sessionService.revoke).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(result.message).toMatch(/logged out/i);
    });
  });

  describe('logoutAllUsers', () => {
    it('should revoke all sessions and return the revoked count', async () => {
      const { service, sessionService } = await makeService();
      sessionService.revokeAllSessions.mockResolvedValue(42);

      const result = await service.logoutAllUsers();

      expect(result.revokedCount).toBe(42);
      expect(result.message).toMatch(/every user must log in again/i);
    });
  });

  describe('googleAuth', () => {
    it('should create a new pre-verified user when userInfoObj is provided and no user exists', async () => {
      const { service, prisma, sessionService } = await makeService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        email: 'newuser@gmail.com',
        status: 'active',
        isVerified: true,
      });
      const res = makeRes();

      const result = await service.googleAuth('unused-token', res, {
        email: 'newuser@gmail.com',
        name: 'New User',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'active', isVerified: true }),
        }),
      );
      expect(sessionService.save).toHaveBeenCalled();
      expect(result.user.email).toBe('newuser@gmail.com');
    });

    it('should auto-activate an existing non-active user', async () => {
      const { service, prisma } = await makeService();
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'pending_verification',
      });
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        status: 'active',
        isVerified: true,
      });
      const res = makeRes();

      const result = await service.googleAuth('unused-token', res, {
        email: mockUser.email,
        name: 'John Doe',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { status: 'active', isVerified: true },
      });
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should log in existing active user without touching prisma.update', async () => {
      const { service, prisma } = await makeService();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const res = makeRes();

      await service.googleAuth('unused-token', res, {
        email: mockUser.email,
        name: 'John Doe',
      });

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when verifying a real idToken fails', async () => {
      const { service } = await makeService();
      const res = makeRes();

      await expect(service.googleAuth('garbage-token', res)).rejects.toThrow(
        /google authentication failed/i,
      );
    });
  });
});
