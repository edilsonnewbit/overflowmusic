import 'dotenv/config';
import { EmailService } from './src/email/email.service';

/**
 * Script de teste para verificar configuração do Gmail SMTP
 * 
 * Execute: npx ts-node test-email.ts
 */

async function testEmailConfiguration() {
  console.log('🧪 Testando configuração de email...\n');

  // Verificar variáveis de ambiente
  console.log('📋 Variáveis de ambiente:');
  console.log(`   SMTP_USER: ${process.env.SMTP_USER || '❌ NÃO CONFIGURADO'}`);
  console.log(`   SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '✅ Configurado (' + process.env.SMTP_PASSWORD.length + ' caracteres)' : '❌ NÃO CONFIGURADO'}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ NÃO CONFIGURADO'}`);
  console.log(`   APP_NAME: ${process.env.APP_NAME || 'Overflow Music (padrão)'}\n`);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('❌ Erro: Configure SMTP_USER e SMTP_PASSWORD no arquivo .env');
    console.log('\nVeja o guia em: docs/GMAIL_SETUP.md');
    process.exit(1);
  }

  try {
    const emailService = new EmailService();

    // Testar conexão
    console.log('🔌 Testando conexão SMTP...');
    const isConnected = await emailService.verifyConnection();

    if (isConnected) {
      console.log('✅ Conexão SMTP estabelecida com sucesso!\n');

      // Perguntar se quer enviar email de teste
      console.log('📧 Para enviar um email de teste, execute:');
      console.log(`   npx ts-node test-email.ts ${process.env.SMTP_USER}\n`);

      // Se passou um email como argumento, enviar teste
      if (process.argv[2]) {
        const testEmail = process.argv[2];
        console.log(`📨 Enviando email de teste para: ${testEmail}...`);
        
        const testToken = 'test-token-' + Math.random().toString(36).substring(7);
        await emailService.sendVerificationEmail(testEmail, testToken);
        
        console.log('✅ Email de teste enviado com sucesso!');
        console.log(`   Verifique a caixa de entrada de: ${testEmail}\n`);
      }
    } else {
      console.error('❌ Falha na conexão SMTP');
      console.log('\n⚠️  Verifique:');
      console.log('   1. SMTP_USER está correto (seu email do Gmail)');
      console.log('   2. SMTP_PASSWORD é a senha de app de 16 caracteres');
      console.log('   3. Verificação em duas etapas está ativa no Google');
      console.log('   4. Não há espaços na senha de app');
      console.log('\nVeja o guia completo em: docs/GMAIL_SETUP.md\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro ao testar configuração de email:', error);
    console.log('\nVeja o guia de troubleshooting em: docs/GMAIL_SETUP.md\n');
    process.exit(1);
  }
}

testEmailConfiguration();
