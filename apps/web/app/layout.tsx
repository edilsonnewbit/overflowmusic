import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GlobalHeader } from "@/components/GlobalHeader";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Overflow Music",
  description: "Overflow Music Platform",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <GlobalHeader />
          <div className="app-shell">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
