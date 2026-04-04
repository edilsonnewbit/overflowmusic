/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
