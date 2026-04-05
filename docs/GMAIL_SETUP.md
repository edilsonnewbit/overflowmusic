# 📧 Guia de Configuração do Gmail para Envio de Emails

Este guia te orienta no processo de configurar o Gmail para enviar emails de verificação e recuperação de senha no Overflow Music.

## 🎯 Visão Geral

O sistema usa o Gmail SMTP para enviar:
- ✅ Emails de verificação após registro
- 🔐 Emails de recuperação de senha
- 📬 Reenvio de verificação de email

## 📋 Pré-requisitos

- Conta do Gmail ativa
- Verificação em duas etapas habilitada

## 🔐 Passo a Passo: Obter Senha de App do Gmail

### 1️⃣ Ativar Verificação em Duas Etapas (Se ainda não estiver ativa)

1. Acesse: https://myaccount.google.com/security
2. Procure por "Verificação em duas etapas"
3. Clique em "Começar" e siga as instruções
4. Configure com seu telefone

### 2️⃣ Gerar Senha de App

1. Acesse: https://myaccount.google.com/apppasswords
   - **Importante**: Este link só funciona se a verificação em duas etapas estiver ativa

2. Você verá a tela "Senhas de app"

3. Selecione ou digite:
   - **App**: Selecione "E-mail" ou "Outro (nome personalizado)"
   - **Dispositivo**: Digite "Overflow Music API" ou "Node.js App"

4. Clique em "Gerar"

5. O Google mostrará uma senha de 16 caracteres, algo como: `abcd efgh ijkl mnop`

6. **COPIE ESTA SENHA** - ela aparece apenas uma vez!
   - Remova os espaços: `abcdefghijklmnop`
   - Você usará esta senha no arquivo `.env`

### 3️⃣ Configurar Variáveis de Ambiente

1. Na pasta `apps/api`, crie um arquivo `.env` (se ainda não existir):
   ```bash
   cd apps/api
   cp .env.example .env
   ```

2. Abra o arquivo `.env` e configure:

```env
# Email Configuration (Gmail SMTP)
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
APP_NAME="Overflow Music"

# Frontend URL (para links em emails)
FRONTEND_URL=http://localhost:3000
```

**Substitua**:
- `seu-email@gmail.com` → Seu email do Gmail
- `abcdefghijklmnop` → A senha de 16 caracteres gerada no passo anterior
- `http://localhost:3000` → URL do seu frontend (em produção use a URL real)

### 4️⃣ Testar a Configuração

Execute o backend:
```bash
cd apps/api
npm run start:dev
```

O sistema tentará se conectar ao Gmail SMTP ao iniciar. Verifique os logs para:
```
[EmailService] Conexão SMTP verificada com sucesso
```

## 🧪 Como Testar o Envio de Email

### Opção 1: Via Frontend Web

1. Acesse `http://localhost:3000/register`
2. Preencha o formulário de registro
3. Clique em "Criar Conta"
4. Verifique seu email para receber o link de verificação

### Opção 2: Via API diretamente (curl)

```bash
# Registrar novo usuário
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Silva",
    "email": "seu-email-teste@gmail.com",
    "password": "senha12345"
  }'

# Verificar os logs do backend para confirmar envio
```

### Opção 3: Via Mobile

1. Abra o app no emulador/dispositivo
2. Toque em "Criar Conta"
3. Preencha o formulário
4. Verifique seu email

## 🔍 Verificação de Problemas

### ❌ Erro: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Solução**: 
- Verifique se copiou a senha de app corretamente (sem espaços)
- Confirme que está usando o email correto
- Gere uma nova senha de app

### ❌ Erro: "Connection timeout"

**Solução**:
- Verifique sua conexão com a internet
- Confirme que não há firewall bloqueando a porta 587
- Tente usar a porta 465 com `secure: true` no EmailService

### ❌ Email não chega

**Verifique**:
1. Pasta de spam do destinatário
2. Logs do backend para erros
3. Se o SMTP_USER está correto
4. Se o FRONTEND_URL está configurado corretamente

### 🔧 Debug Detalhado

Adicione logs temporários no `email.service.ts`:

```typescript
constructor() {
  console.log('[EmailService] Configuração SMTP:', {
    user: process.env.SMTP_USER,
    passwordLength: process.env.SMTP_PASSWORD?.length,
    frontendUrl: process.env.FRONTEND_URL,
  });
  
  this.transporter = nodemailer.createTransport({
    // ... resto da configuração
  });
}
```

## 🌐 Configuração para Produção

Quando for fazer deploy em produção:

1. **Atualize o FRONTEND_URL**:
   ```env
   FRONTEND_URL=https://overflowmusic.com
   ```

2. **Use variáveis de ambiente do servidor**:
   - Nunca commite o arquivo `.env`
   - Configure as variáveis no painel do hosting (Hostinger, Vercel, etc.)

3. **Considere usar um email profissional**:
   - Gmail tem limite de ~500 emails/dia
   - Para mais volume, considere:
     - SendGrid (100 emails/dia grátis)
     - AWS SES (muito barato)
     - Resend (3000 emails/mês grátis)

## 📊 Limites do Gmail

- **Envios por dia**: ~500 emails (conta gratuita)
- **Destinatários por mensagem**: 100
- **Tamanho máximo**: 25 MB por email

Para aplicações em produção com alto volume, considere usar serviços especializados.

## ✅ Checklist de Configuração

- [ ] Verificação em duas etapas ativada no Google
- [ ] Senha de app gerada
- [ ] Arquivo `.env` criado em `apps/api`
- [ ] `SMTP_USER` configurado
- [ ] `SMTP_PASSWORD` configurado (16 caracteres, sem espaços)
- [ ] `FRONTEND_URL` configurado
- [ ] Backend iniciado sem erros SMTP
- [ ] Teste de registro realizado
- [ ] Email de verificação recebido

## 🆘 Precisa de Ajuda?

Se continuar com problemas:

1. Verifique os logs do backend
2. Teste a conexão SMTP manualmente
3. Confirme que a senha de app está correta
4. Experimente gerar uma nova senha de app

---

**Última atualização**: Abril 2026
