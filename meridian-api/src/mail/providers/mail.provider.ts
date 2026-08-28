import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { name } from 'ejs';
import { User } from 'src/users/user.entity';

@Injectable()
export class MailProvider {
  constructor(
    //inject the mailer Service
    private readonly mailerService: MailerService,
  ) {}

  public async WelcomeEmail(user: User): Promise<void> {
    await this.mailerService.sendMail({
      to: user.email,
      from: `helpdesk from estate-management.com`,
      subject: `welcome to estate_managment`,
      template: './welcome',
      context: {
        name: user.firstName,
        email: user.email,
        loginUrl: 'http://localhost:3000/',
      },
    });
  }

  /**
   * Email verification mail (issue #435). The raw token is delivered only in
   * this mail — only the hash lives on the user row. The link path is
   * `/auth/verify-email?token=...` so a client-side page can post the
   * token back to POST /auth/verify-email.
   */
  public async VerificationEmail(
    user: User,
    rawToken: string,
    expiresAt: Date,
  ): Promise<void> {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const link = `${appUrl}/auth/verify-email?token=${rawToken}`;

    await this.mailerService.sendMail({
      to: user.email,
      from: 'no-reply@estate-management.com',
      subject: 'Verify your Meridian account',
      template: './verification',
      context: {
        name: user.firstName,
        email: user.email,
        link,
        expiresAt,
      },
    });
  }
}
