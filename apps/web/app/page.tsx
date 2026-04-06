import { SessionStatusBanner } from "@/components/SessionStatusBanner";
import { HomeClient } from "@/components/HomeClient";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", padding: "32px 16px 56px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <SessionStatusBanner />
        <HomeClient />
      </div>
    </main>
  );
}

