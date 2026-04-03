import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <section
        style={{
          width: "100%",
          maxWidth: 620,
          background: "rgba(74, 31, 41, 0.5)",
          border: "1px solid #80414c",
          borderRadius: 16,
          padding: 20,
          display: "grid",
          gap: 12,
        }}
      >
        <p style={{ margin: 0, letterSpacing: 2, textTransform: "uppercase", color: "#ffd8dd", fontSize: 12 }}>
          Access Control
        </p>
        <h1 style={{ margin: 0 }}>Acesso negado</h1>
        <p style={{ margin: 0, color: "#ffd8dd" }}>
          Sua conta está autenticada, mas não possui permissão para esta área. Atualmente apenas perfis ADMIN/SUPER_ADMIN podem acessar os módulos operacionais.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/" style={buttonStyle}>
            Voltar ao Hub
          </Link>
          <Link href="/login" style={buttonStyle}>
            Trocar conta
          </Link>
        </div>
      </section>
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#061420",
  background: "linear-gradient(90deg, #ff6c7a 0%, #ffd8dd 100%)",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
};
