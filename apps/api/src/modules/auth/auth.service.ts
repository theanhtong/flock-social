import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { SessionService } from './session/session.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import { MailService } from '../../common/mail/mail.service.js';
import {
  AuthResponseDto,
  LoginDto,
  RegisterDto,
  RegisterResponseDto,
} from './auth.dto.js';
import { SessionValidationResult } from './session/session.enum.js';

@Injectable()
export class AuthService {
  private readonly cookieName = 'refreshToken';
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sessionService: SessionService,
    private readonly snowflake: SnowflakeService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.googleClient = new OAuth2Client();
  }

  async register(
    dto: RegisterDto,
    res: Response,
  ): Promise<AuthResponseDto> {
    const verifiedKey = `email_verified:${dto.email}`;
    const isEmailVerified = await this.redis.get(verifiedKey);

    if (!isEmailVerified) {
      throw new BadRequestException(
        'Email not verified. Please verify your OTP code first.',
      );
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: dto.username, mode: 'insensitive' } },
          { email: { equals: dto.email, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        existing.username.toLowerCase() === dto.username.toLowerCase()
          ? 'Username is already taken'
          : 'Email is already registered',
      );
    }

    const passwordHash = await argon2.hash(dto.password);
    const userId = this.snowflake.generate();

    const user = await this.prisma.user.create({
      data: {
        id: userId,
        username: dto.username,
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        status: 'active',
        isVerified: true,
      },
    });

    await this.redis.del(verifiedKey);

    const sessionId = this.snowflake.generateString();
    const tokens = await this.generateTokens(
      user.id.toString(),
      user.username,
      user.role,
      sessionId,
    );

    await this.sessionService.save(
      user.id.toString(),
      sessionId,
      tokens.refreshToken,
    );

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async sendVerificationEmail(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (existingUser && existingUser.status === 'active') {
      throw new ConflictException('An account with this email already exists.');
    }

    const cooldownKey = `send_otp_cooldown:${email}`;
    const inCooldown = await this.redis.get(cooldownKey);
    if (inCooldown) {
      throw new BadRequestException(
        'Please wait 60 seconds before requesting a new verification code.',
      );
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `verify_otp:${email}`;
    await this.redis.set(redisKey, otpCode, 600);
    await this.redis.set(cooldownKey, 'true', 60);

    const emailSent = await this.mailService.sendVerificationCode(
      email,
      otpCode,
    );

    if (!emailSent) {
      throw new BadRequestException(
        'Failed to send verification email. Please try again later.',
      );
    }

    return {
      success: true,
      message:
        'A 6-digit code has been sent to your email. Please enter it to verify your account.',
    };
  }

  async verifyEmail(
    email: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    const redisKey = `verify_otp:${email}`;
    const savedOtp = await this.redis.get(redisKey);

    if (!savedOtp || savedOtp !== code) {
      throw new BadRequestException(
        'Invalid or expired verification OTP code.',
      );
    }

    const verifiedKey = `email_verified:${email}`;
    await this.redis.set(verifiedKey, 'true', 900);
    await this.redis.del(redisKey);

    return {
      success: true,
      message: 'Email verified successfully! Please complete your profile.',
    };
  }

  async googleAuth(
    idToken: string,
    res: Response,
  ): Promise<AuthResponseDto> {
    let email: string;
    let name: string;
    let picture: string | undefined;

    try {
      const isAccessToken = idToken.startsWith('ya29.') || idToken.split('.').length !== 3;
      if (isAccessToken) {
        // Verify real Google OAuth Access Token via Google's official UserInfo API
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!userinfoRes.ok) {
          throw new BadRequestException('Google access token verification failed');
        }
        const userinfo = (await userinfoRes.json()) as { email?: string; name?: string; picture?: string };
        if (!userinfo || !userinfo.email) {
          throw new BadRequestException('Invalid Google Access Token response');
        }
        email = userinfo.email;
        name = userinfo.name || email.split('@')[0];
        picture = userinfo.picture;
      } else {
        // Strictly verify real Google ID Token via Google Auth Library
        const googleClientId =
          this.configService.get<string>('GOOGLE_CLIENT_ID');
        const ticket = await this.googleClient.verifyIdToken({
          idToken,
          audience: googleClientId || undefined,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new BadRequestException('Invalid Google ID Token');
        }
        email = payload.email;
        name = payload.name || payload.email.split('@')[0];
        picture = payload.picture;
      }
    } catch (err: any) {
      throw new BadRequestException(
        `Google authentication failed: ${err.message || 'Invalid token'}`,
      );
    }

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // create new user with google identity (pre-verified!)
      const rawUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      const uniqueUsername = `${rawUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      const randomPassword = await argon2.hash(this.snowflake.generateString());
      const userId = this.snowflake.generate();

      user = await this.prisma.user.create({
        data: {
          id: userId,
          username: uniqueUsername,
          email,
          passwordHash: randomPassword,
          displayName: name,
          avatarUrl: picture,
          status: 'active',
          isVerified: true,
        },
      });
    } else if (user.status !== 'active') {
      // auto-activate google accounts
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'active', isVerified: true },
      });
    }

    const sessionId = this.snowflake.generateString();
    const tokens = await this.generateTokens(
      user.id.toString(),
      user.username,
      user.role,
      sessionId,
    );

    await this.sessionService.save(
      user.id.toString(),
      sessionId,
      tokens.refreshToken,
    );
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async login(dto: LoginDto, res: Response): Promise<AuthResponseDto> {
    const target = dto.identifier || dto.email || dto.username;
    if (!target) {
      throw new UnauthorizedException('Please enter your email or username');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: target, mode: 'insensitive' } },
          { username: { equals: target, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isDeleted || user.deletedAt) {
      throw new UnauthorizedException('This account has been deleted.');
    }

    if (user.status === 'banned') {
      throw new UnauthorizedException('Your account has been banned');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Account is not active. Please verify your email.',
      );
    }

    const validPassword = await argon2.verify(user.passwordHash, dto.password);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionId = this.snowflake.generateString();
    const tokens = await this.generateTokens(
      user.id.toString(),
      user.username,
      user.role,
      sessionId,
    );

    await this.sessionService.save(
      user.id.toString(),
      sessionId,
      tokens.refreshToken,
    );
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async refreshTokens(
    req: Request,
    res: Response,
  ): Promise<AuthResponseDto> {
    const submittedToken = req.cookies?.[this.cookieName];
    if (!submittedToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(submittedToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const result = await this.sessionService.validate(
      payload.sub,
      payload.sid,
      submittedToken,
    );

    if (result === SessionValidationResult.NOT_FOUND) {
      res.clearCookie(this.cookieName, { path: '/' });
      throw new UnauthorizedException(
        'Session has been revoked. Please log in again.',
      );
    }

    if (result === SessionValidationResult.MISMATCH) {
      await this.sessionService.revoke(payload.sid);
      res.clearCookie(this.cookieName, { path: '/' });
      throw new UnauthorizedException(
        'Token reuse detected. Session terminated for security.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
    });

    if (!user) {
      res.clearCookie(this.cookieName, { path: '/' });
      throw new UnauthorizedException('User not found');
    }

    const newTokens = await this.generateTokens(
      payload.sub,
      payload.username,
      payload.role,
      payload.sid,
    );

    await this.sessionService.save(
      payload.sub,
      payload.sid,
      newTokens.refreshToken,
    );
    this.setRefreshTokenCookie(res, newTokens.refreshToken);

    return {
      accessToken: newTokens.accessToken,
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
      },
    };
  }

  async logout(req: Request, res: Response): Promise<{ message: string }> {
    const refreshToken = req.cookies?.[this.cookieName];
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync(refreshToken, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
        await this.sessionService.revoke(payload.sid);
      } catch {
        // suppress invalid token error on logout
      }
    }

    res.clearCookie(this.cookieName, { path: '/' });
    return { message: 'Logged out successfully' };
  }

  async logoutAllUsers(): Promise<{ message: string; revokedCount: number }> {
    const revokedCount = await this.sessionService.revokeAllSessions();

    return {
      message:
        'All active sessions have been revoked. Every user must log in again.',
      revokedCount,
    };
  }

  private async generateTokens(
    userId: string,
    username: string,
    role: string,
    sessionId: string,
  ) {
    const payload = { sub: userId, username, role, sid: sessionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
