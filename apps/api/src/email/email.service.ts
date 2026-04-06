import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;

  constructor() {
    // Configuração do transporter SMTP
    // Variáveis de ambiente usadas: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: (process.env.SMTP_PORT || '587') === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // docker-compose e CI/CD usam SMTP_PASS
      },
    });
  }

  /**
   * Envia email de verificação após registro
   */
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Overflow Music'}" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Verifique seu email - Overflow Music',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
              .logo { width: 120px; height: auto; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
              .content { background: #ffffff; padding: 40px 30px; }
              .content p { margin: 0 0 15px 0; font-size: 16px; color: #4b5563; }
              .button-container { text-align: center; margin: 30px 0; }
              .button { display: inline-block; background: #3b82f6; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
              .button:hover { background: #2563eb; }
              .link-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0; word-break: break-all; }
              .link-box a { color: #3b82f6; text-decoration: none; font-size: 14px; }
              .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
              .footer p { margin: 5px 0; }
              .footer a { color: #3b82f6; text-decoration: none; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="icon">🎵</div>
                <h1>Bem-vindo ao Overflow Music!</h1>
              </div>
              <div class="content">
                <p>Olá!</p>
                <p>Obrigado por se registrar no <strong>Overflow Music</strong>. Para começar a usar sua conta, precisamos verificar seu endereço de email.</p>
                <div class="button-container">
                  <a href="${verificationUrl}" class="button">✓ Verificar Email</a>
                </div>
                <p>Ou copie e cole este link no seu navegador:</p>
                <div class="link-box">
                  <a href="${verificationUrl}">${verificationUrl}</a>
                </div>
                <div class="alert">
                  <strong>⏱ Importante:</strong> Este link expira em 24 horas.
                </div>
                <p style="color: #9ca3af; font-size: 14px;">Se você não criou uma conta no Overflow Music, pode ignorar este email com segurança.</p>
              </div>
              <div class="footer">
                <p><strong>Overflow Music</strong></p>
                <p>&copy; ${new Date().getFullYear()} Overflow Music. Todos os direitos reservados.</p>
                <p style="margin-top: 10px;">
                  <a href="${process.env.FRONTEND_URL}">Acessar plataforma</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Bem-vindo ao Overflow Music!
        
        Para verificar seu email, acesse: ${verificationUrl}
        
        Este link expira em 24 horas.
        
        Se você não criou uma conta, ignore este email.
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Email de verificação enviado para: ${to}`);
    } catch (error) {
      console.error('[EmailService] Erro ao enviar email de verificação:', error);
      throw new Error('Falha ao enviar email de verificação');
    }
  }

  /**
   * Envia email de recuperação de senha
   */
  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Overflow Music'}" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Recuperação de Senha - Overflow Music',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
              .logo { width: 120px; height: auto; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
              .content { background: #ffffff; padding: 40px 30px; }
              .content p { margin: 0 0 15px 0; font-size: 16px; color: #4b5563; }
              .button-container { text-align: center; margin: 30px 0; }
              .button { display: inline-block; background: #3b82f6; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
              .button:hover { background: #2563eb; }
              .link-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0; word-break: break-all; }
              .link-box a { color: #3b82f6; text-decoration: none; font-size: 14px; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
              .warning ul { margin: 10px 0 0 0; padding-left: 20px; }
              .warning li { margin: 8px 0; color: #92400e; }
              .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
              .footer p { margin: 5px 0; }
              .footer a { color: #3b82f6; text-decoration: none; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="icon">🔐</div>
                <h1>Recuperação de Senha</h1>
              </div>
              <div class="content">
                <p>Olá!</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Overflow Music</strong>.</p>
                <div class="button-container">
                  <a href="${resetUrl}" class="button">🔑 Redefinir Senha</a>
                </div>
                <p>Ou copie e cole este link no seu navegador:</p>
                <div class="link-box">
                  <a href="${resetUrl}">${resetUrl}</a>
                </div>
                <div class="warning">
                  <strong>⚠️ Importante:</strong>
                  <ul>
                    <li>Este link expira em <strong>1 hora</strong></li>
                    <li>Se você não solicitou esta recuperação, ignore este email</li>
                    <li>Sua senha atual permanece válida até que você a altere</li>
                  </ul>
                </div>
                <p style="color: #9ca3af; font-size: 14px;">Por segurança, nunca compartilhe este link com outras pessoas.</p>
              </div>
              <div class="footer">
                <p><strong>Overflow Music</strong></p>
                <p>&copy; ${new Date().getFullYear()} Overflow Music. Todos os direitos reservados.</p>
                <p style="margin-top: 10px;">
                  <a href="${process.env.FRONTEND_URL}">Acessar plataforma</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Recuperação de Senha - Overflow Music
        
        Para redefinir sua senha, acesse: ${resetUrl}
        
        Este link expira em 1 hora.
        
        Se você não solicitou esta recuperação, ignore este email.
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Email de recuperação enviado para: ${to}`);
    } catch (error) {
      console.error('[EmailService] Erro ao enviar email de recuperação:', error);
      throw new Error('Falha ao enviar email de recuperação');
    }
  }

  /**
   * Testa a conexão SMTP
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('[EmailService] Conexão SMTP verificada com sucesso');
      return true;
    } catch (error) {
      console.error('[EmailService] Erro na conexão SMTP:', error);
      return false;
    }
  }
}
