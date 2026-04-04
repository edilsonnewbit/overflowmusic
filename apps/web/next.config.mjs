import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Necessário para o Next.js rastrear arquivos fora de apps/web no modo standalone
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Transpilar pacotes do monorepo (TypeScript-only, sem build step próprio)
  transpilePackages: ["@overflow/types"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Permite que o popup do Google Sign-In comunique via postMessage
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
