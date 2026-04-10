/**
 * Script para obter o GOOGLE_REFRESH_TOKEN para upload no Google Drive.
 *
 * Pré-requisitos:
 *   1. GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET configurados
 *   2. No Google Cloud Console, adicionar http://localhost:3333/callback
 *      como "URI de redirecionamento autorizado" nas credenciais OAuth
 *
 * Como usar:
 *   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-drive-refresh-token.mjs
 */

import http from "node:http";
import { URL } from "node:url";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3333/callback";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌  Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET antes de rodar.");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // garante que o refresh_token sempre vem
  });

console.log("\n🔗  Abra este link no browser e autorize:\n");
console.log(authUrl);
console.log("\nAguardando callback em http://localhost:3333/callback ...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:3333");
  const code = url.searchParams.get("code");

  if (!code) {
    res.end("Sem código na URL.");
    return;
  }

  res.end("<h2>Pode fechar esta aba.</h2>");
  server.close();

  // Troca o code pelo refresh_token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (tokens.refresh_token) {
    console.log("✅  GOOGLE_REFRESH_TOKEN obtido com sucesso!\n");
    console.log("Adicione este valor como secret no GitHub:");
    console.log("\nGOOGLE_REFRESH_TOKEN=" + tokens.refresh_token + "\n");
  } else {
    console.error("❌  Erro ao obter refresh_token:", tokens);
  }
});

server.listen(3333);
