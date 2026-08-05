import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resendClient: Resend | null = null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>(
      'MAIL_FROM',
      'Flock Social <onboarding@resend.dev>',
    );
    this.resendClient = new Resend(apiKey);
  }

  async sendVerificationCode(toEmail: string, code: string): Promise<boolean> {
    const subject = `[Flock Social] Your Verification Code: ${code}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb; text-align: center;">Flock Social Network</h2>
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 14px; color: #555;">Thank you for registering at Flock Social! Please use the OTP verification code below to verify your email address:</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1d4ed8;">${code}</span>
        </div>
        <p style="font-size: 12px; color: #888;">This verification code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #aaa; text-align: center;">&copy; 2026 Flock Social Network Inc.</p>
      </div>
    `;

    if (!this.resendClient) {
      this.logger.warn('Resend client not initialized (missing API key).');
      return true;
    }

    try {
      const { data, error } = await this.resendClient.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject,
        html,
      });

      if (error) {
        this.logger.error(
          `Failed to send email via Resend: ${error.name} - ${error.message}`,
        );
        this.logger.log(`VERIFICATION EMAIL TO: ${toEmail}`);
        this.logger.log(`OTP CODE: ${code}`);
        return false;
      }

      this.logger.log(
        `Verification email sent to ${toEmail} via Resend. (id: ${data?.id})`,
      );
      return true;
    } catch (err: any) {
      this.logger.error(`Unexpected error sending email: ${err.message}`);
      this.logger.log(`VERIFICATION EMAIL TO: ${toEmail}`);
      this.logger.log(`OTP CODE: ${code}`);
      return false;
    }
  }
}