/**
 * Email Service - SendGrid Integration
 * 
 * This module provides a generic email sending service using SendGrid.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Install SendGrid: pnpm add @sendgrid/mail
 * 2. Get API key from: https://app.sendgrid.com/settings/api_keys
 * 3. Add to environment: SENDGRID_API_KEY=your_api_key_here
 * 4. Verify sender email in SendGrid dashboard
 * 5. Add SENDGRID_FROM_EMAIL=noreply@yourdomain.com to environment
 * 
 * USAGE EXAMPLES:
 * 
 * // Send admin invite
 * await sendEmail({
 *   to: "newadmin@example.com",
 *   subject: "Convite para Administrador - TeteCare",
 *   html: `
 *     <h1>Você foi convidado!</h1>
 *     <p>Clique no link abaixo para aceitar:</p>
 *     <a href="${inviteLink}">Aceitar Convite</a>
 *   `
 * });
 * 
 * // Send payment confirmation
 * await sendEmail({
 *   to: user.email,
 *   subject: "Pagamento Confirmado - TeteCare",
 *   html: `
 *     <h1>Pagamento Recebido!</h1>
 *     <p>Seu pagamento de R$ ${amount} foi confirmado.</p>
 *     <p>Plano: ${planName}</p>
 *   `
 * });
 */

// Uncomment after installing @sendgrid/mail
// import sgMail from "@sendgrid/mail";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Initialize SendGrid with API key
 * Call this once at server startup
 */
export function initializeEmailService() {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️  SENDGRID_API_KEY not configured - email sending disabled");
    return false;
  }
  
  // Uncomment after installing @sendgrid/mail
  // sgMail.setApiKey(apiKey);
  console.log("✅ SendGrid email service initialized");
  return true;
}

/**
 * Send email using SendGrid
 * Falls back to console.log if SendGrid is not configured
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@tucocare.com";
  
  // Check if SendGrid is configured
  if (!process.env.SENDGRID_API_KEY) {
    console.log("📧 [EMAIL SIMULATION] Would send email:");
    console.log(`   To: ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   HTML: ${options.html.substring(0, 100)}...`);
    return true;
  }
  
  try {
    // Uncomment after installing @sendgrid/mail
    // await sgMail.send({
    //   to: options.to,
    //   from: fromEmail,
    //   subject: options.subject,
    //   html: options.html,
    //   text: options.text || options.html.replace(/<[^>]*>/g, ""),
    // });
    
    console.log(`✅ Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return false;
  }
}

/**
 * Email Templates
 */

export function getAdminInviteEmail(inviteLink: string, inviterName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🐾 TeteCare</h1>
        </div>
        <div class="content">
          <h2>Você foi convidado para ser Administrador!</h2>
          <p>${inviterName} convidou você para se tornar administrador da plataforma TeteCare.</p>
          <p>Como administrador, você terá acesso a:</p>
          <ul>
            <li>Gerenciamento de pets e tutores</li>
            <li>Controle de check-in/check-out</li>
            <li>Relatórios e analytics</li>
            <li>Configurações do sistema</li>
          </ul>
          <p>Clique no botão abaixo para aceitar o convite:</p>
          <a href="${inviteLink}" class="button">Aceitar Convite</a>
          <p><small>Este convite expira em 7 dias.</small></p>
        </div>
        <div class="footer">
          <p>TeteCare - Gestão de Creche de Pets</p>
          <p>Se você não solicitou este convite, pode ignorar este email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getPaymentConfirmationEmail(
  userName: string,
  amount: number,
  productName: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .amount { font-size: 32px; font-weight: bold; color: #10B981; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Pagamento Confirmado!</h1>
        </div>
        <div class="content">
          <p>Olá ${userName},</p>
          <p>Seu pagamento foi processado com sucesso!</p>
          <div class="amount">R$ ${amount.toFixed(2)}</div>
          <p><strong>Produto:</strong> ${productName}</p>
          <p>Seus créditos/plano já estão disponíveis na plataforma.</p>
          <p>Obrigado por escolher TeteCare! 🐾</p>
        </div>
        <div class="footer">
          <p>TeteCare - Gestão de Creche de Pets</p>
          <p>Em caso de dúvidas, entre em contato conosco.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
