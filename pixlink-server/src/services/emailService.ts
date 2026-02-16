import nodemailer from 'nodemailer';
import config from '../config';
import logger from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface RegistrationEmailData {
  email: string;
  nickname: string;
  activationToken?: string;
  activationUrl?: string;
}

export interface PasswordResetEmailData {
  email: string;
  nickname: string;
  resetUrl: string;
  resetToken: string;
}

export interface PermitEmailData {
  email: string;
  nickname: string;
  permitContent: string;
  certificateId: string;
  deviceName?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      family: 4,
      connectionTimeout: 30000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
      pool: true,
      maxConnections: 5,
      rateDelta: 1000,
      rateLimit: 5,
    } as any);

    logger.info('Email service initialized', {
      host: config.smtp.host,
      port: config.smtp.port,
      family: 4,
    });
  }

  private async sendEmail(options: EmailOptions, maxRetries: number = 3): Promise<void> {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const info = await this.transporter.sendMail({
          from: `"PixLink" <${config.smtp.user}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        logger.info('Email sent successfully', {
          to: options.to,
          subject: options.subject,
          messageId: info.messageId,
          attempt,
        });
        return;
      } catch (error: any) {
        lastError = error;
        logger.warn(`Email send attempt ${attempt} failed`, {
          to: options.to,
          subject: options.subject,
          error: error.message,
          attempt,
          maxRetries,
        });
        
        if (attempt < maxRetries) {
          const delay = attempt * 1000;
          logger.info(`Retrying email send in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    logger.error('Failed to send email after all retries', {
      to: options.to,
      subject: options.subject,
      error: lastError.message,
    });
    throw new Error(`Failed to send email: ${lastError.message}`);
  }

  async sendRegistrationEmail(data: RegistrationEmailData): Promise<void> {
    const html = this.getRegistrationEmailTemplate(data);
    const text = this.getRegistrationEmailText(data);

    await this.sendEmail({
      to: data.email,
      subject: 'Welcome to PixLink - Account Registration',
      html,
      text,
    });
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    const html = this.getPasswordResetEmailTemplate(data);
    const text = this.getPasswordResetEmailText(data);

    await this.sendEmail({
      to: data.email,
      subject: 'PixLink - Password Reset Request',
      html,
      text,
    });
  }

  async sendPermitEmail(data: PermitEmailData): Promise<void> {
    const html = this.getPermitEmailTemplate(data);
    const text = this.getPermitEmailText(data);

    await this.sendEmail({
      to: data.email,
      subject: 'PixLink - Your ZTM Permit File',
      html,
      text,
    });
  }

  async sendActivationEmail(email: string, nickname: string, activationToken: string): Promise<void> {
    const activationUrl = `${config.frontend.url}/activate?token=${activationToken}`;
    const html = this.getRegistrationEmailTemplate({
      email,
      nickname,
      activationToken,
      activationUrl,
    });
    const text = this.getRegistrationEmailText({
      email,
      nickname,
      activationToken,
      activationUrl,
    });

    await this.sendEmail({
      to: email,
      subject: 'PixLink - Account Activation',
      html,
      text,
    });
  }

  private getRegistrationEmailTemplate(data: RegistrationEmailData): string {
    const ttlMinutes = Math.ceil(config.activationToken.ttl / 60);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to PixLink</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #4a90e2;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 20px;
        }
        .welcome {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #2c3e50;
        }
        .message {
            margin-bottom: 15px;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #4a90e2;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #357abd;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 12px;
        }
        .info {
            background-color: #f8f9fa;
            border-left: 4px solid #4a90e2;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">PixLink</div>
        </div>
        
        <div class="content">
            <div class="welcome">Welcome to PixLink!</div>
            
            <div class="message">
                <p>Hi ${data.nickname},</p>
                <p>Thank you for registering with PixLink. Your account has been successfully created.</p>
            </div>

            <div class="info">
                <p><strong>Account Information:</strong></p>
                <ul>
                    <li>Email: ${data.email}</li>
                    <li>Nickname: ${data.nickname}</li>
                </ul>
            </div>

            <div class="message">
                <p>Your account is currently pending activation. Please activate your account within ${ttlMinutes} minutes to complete the registration process.</p>
                ${data.activationUrl ? `<a href="${data.activationUrl}" class="button">Activate Account</a>` : ''}
                ${data.activationToken ? `<p><strong>Activation Token:</strong> <code>${data.activationToken}</code></p>` : ''}
            </div>

            <div class="message">
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                <p>Best regards,<br>The PixLink Team</p>
            </div>
        </div>

        <div class="footer">
            <p>&copy; 2026 PixLink. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private getRegistrationEmailText(data: RegistrationEmailData): string {
    const ttlMinutes = Math.ceil(config.activationToken.ttl / 60);

    return `
Welcome to PixLink!

Hi ${data.nickname},

Thank you for registering with PixLink. Your account has been successfully created.

Account Information:
- Email: ${data.email}
- Nickname: ${data.nickname}

You can now log in to your account and start using PixLink services.
${data.activationUrl ? `Please activate your account by visiting: ${data.activationUrl}` : ''}
${data.activationToken ? `Activation Token: ${data.activationToken}` : ''}

Important: Your account will be automatically deleted if not activated within ${ttlMinutes} minutes.

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The PixLink Team

© 2026 PixLink. All rights reserved.
    `;
  }

  private getPasswordResetEmailTemplate(data: PasswordResetEmailData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - PixLink</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #4a90e2;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 20px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #2c3e50;
        }
        .message {
            margin-bottom: 15px;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #4a90e2;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #357abd;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 12px;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }
        .token {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">PixLink</div>
        </div>
        
        <div class="content">
            <div class="title">Password Reset Request</div>
            
            <div class="message">
                <p>Hi ${data.nickname},</p>
                <p>We received a request to reset your password for your PixLink account.</p>
            </div>

            <div class="warning">
                <p><strong>Important:</strong> If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
            </div>

            <div class="message">
                <p>To reset your password, click the button below:</p>
                <a href="${data.resetUrl}" class="button">Reset Password</a>
            </div>

            <div class="message">
                <p>Or use the following reset token:</p>
                <div class="token">${data.resetToken}</div>
            </div>

            <div class="message">
                <p>This link will expire in 1 hour for security reasons.</p>
            </div>

            <div class="message">
                <p>If you have any questions or need assistance, please contact our support team.</p>
                <p>Best regards,<br>The PixLink Team</p>
            </div>
        </div>

        <div class="footer">
            <p>&copy; 2026 PixLink. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private getPasswordResetEmailText(data: PasswordResetEmailData): string {
    return `
Password Reset Request - PixLink

Hi ${data.nickname},

We received a request to reset your password for your PixLink account.

Important: If you did not request this password reset, please ignore this email and your password will remain unchanged.

To reset your password, visit: ${data.resetUrl}

Or use the following reset token: ${data.resetToken}

This link will expire in 1 hour for security reasons.

If you have any questions or need assistance, please contact our support team.

Best regards,
The PixLink Team

© 2026 PixLink. All rights reserved.
    `;
  }

  private getPermitEmailTemplate(data: PermitEmailData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your ZTM Permit - PixLink</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #4a90e2;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 20px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #2c3e50;
        }
        .message {
            margin-bottom: 15px;
        }
        .permit-box {
            background-color: #f8f9fa;
            border: 2px solid #4a90e2;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .permit-label {
            font-weight: bold;
            margin-bottom: 10px;
            color: #4a90e2;
        }
        .permit-content {
            background-color: #ffffff;
            border: 1px solid #dee2e6;
            padding: 15px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            word-break: break-all;
            max-height: 300px;
            overflow-y: auto;
        }
        .permit-content pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .info {
            background-color: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 20px 0;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">PixLink</div>
        </div>
        
        <div class="content">
            <div class="title">Your ZTM Permit File</div>
            
            <div class="message">
                <p>Hi ${data.nickname},</p>
                <p>Your ZTM permit file has been generated and is ready for use.</p>
            </div>

            <div class="info">
                <p><strong>Device Information:</strong></p>
                <ul>
                    <li>Certificate ID: ${data.certificateId}</li>
                    ${data.deviceName ? `<li>Device Name: ${data.deviceName}</li>` : ''}
                </ul>
            </div>

            <div class="permit-box">
                <div class="permit-label">ZTM Permit Content:</div>
                <div class="permit-content"><pre>${data.permitContent}</pre></div>
            </div>

            <div class="warning">
                <p><strong>Important Security Notice:</strong></p>
                <ul>
                    <li>This permit file is unique to your device and should not be shared with anyone.</li>
                    <li>Keep this permit file secure and do not upload it to public repositories.</li>
                    <li>If you suspect your permit has been compromised, please revoke it immediately.</li>
                </ul>
            </div>

            <div class="message">
                <p><strong>How to use your permit:</strong></p>
                <ol>
                    <li>Copy the permit content above</li>
                    <li>Import it into your ZTM agent</li>
                    <li>Start using PixLink services</li>
                </ol>
            </div>

            <div class="message">
                <p>If you have any questions or need assistance with importing your permit, please don't hesitate to contact our support team.</p>
                <p>Best regards,<br>The PixLink Team</p>
            </div>
        </div>

        <div class="footer">
            <p>&copy; 2026 PixLink. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private getPermitEmailText(data: PermitEmailData): string {
    return `
Your ZTM Permit File - PixLink

Hi ${data.nickname},

Your ZTM permit file has been generated and is ready for use.

Device Information:
- Certificate ID: ${data.certificateId}
${data.deviceName ? `- Device Name: ${data.deviceName}` : ''}

ZTM Permit Content:
${data.permitContent}

Important Security Notice:
- This permit file is unique to your device and should not be shared with anyone.
- Keep this permit file secure and do not upload it to public repositories.
- If you suspect your permit has been compromised, please revoke it immediately.

How to use your permit:
1. Copy the permit content above
2. Import it into your ZTM agent
3. Start using PixLink services

If you have any questions or need assistance with importing your permit, please don't hesitate to contact our support team.

Best regards,
The PixLink Team

© 2026 PixLink. All rights reserved.
`;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
      return true;
    } catch (error: any) {
      logger.error('SMTP connection verification failed', { error: error.message });
      return false;
    }
  }
}

export default new EmailService();