import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import {
  GoogleAuthDto,
  LoginDto,
  RegisterDto,
  SendVerificationDto,
  VerifyEmailDto,
} from './auth.dto.js';
import { Role, Roles } from './decorators/roles.decorator.js';
import { RolesGuard } from './guards/roles.guard.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User account created successfully.',
  })
  @ApiResponse({
    status: 409,
    description: 'Username or email already exists.',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send 6-digit email OTP verification code via Resend',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification code sent successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Account not found or cooldown period active.',
  })
  async sendVerificationEmail(@Body() dto: SendVerificationDto) {
    return this.authService.sendVerificationEmail(dto.email);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email using 6-digit OTP code' })
  @ApiResponse({ status: 200, description: 'Account successfully verified.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification code.',
  })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.code);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google OAuth login and registration' })
  @ApiResponse({
    status: 200,
    description: 'Google authentication successful.',
  })
  @ApiResponse({ status: 400, description: 'Invalid Google ID token.' })
  async googleAuth(
    @Body()
    dto: GoogleAuthDto & {
      userInfo?: { email: string; name?: string; picture?: string };
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.googleAuth(dto.idToken, res, dto.userInfo);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with username/email and password' })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh Access Token using HttpOnly Refresh Cookie',
  })
  @ApiResponse({ status: 200, description: 'Access token refreshed.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refreshTokens(req, res);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out and revoke current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req, res);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force logout all users by revoking every active session',
  })
  @ApiResponse({
    status: 200,
    description: 'All sessions revoked successfully.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required.' })
  async logoutAllUsers() {
    return this.authService.logoutAllUsers();
  }
}
