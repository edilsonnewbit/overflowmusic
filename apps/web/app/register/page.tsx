"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";

const VOLUNTEER_TERMS_VERSION = "1.0-2026";

type VolunteerArea = "MUSICA" | "MIDIA" | "DANCA" | "INTERCESSAO" | "SUPORTE";

const VOLUNTEER_AREAS: Record<VolunteerArea, { label: string; icon: string; skills: string[] }> = {
  MUSICA: { label: "Música", icon: "🎵", skills: ["Vocal", "Violão", "Guitarra", "Baixo", "Bateria", "Teclado", "Piano", "Trompete", "Saxofone", "Violino", "Flauta", "Percussão", "Gaita", "Contrabaixo"] },
  MIDIA: { label: "Mídia", icon: "🎬", skills: ["Câmera", "Transmissão ao vivo", "Edição de vídeo", "Fotografia", "Slides/ProPresenter", "Iluminação", "Som/PA"] },
  DANCA: { label: "Dança", icon: "💃", skills: ["Coreógrafo(a)", "Bailarino(a)", "Dança contemporânea", "Dança circular"] },
  INTERCESSAO: { label: "Intercessão", icon: "🙏", skills: ["Intercessor(a)", "Líder de oração", "Grupo de jejum"] },
  SUPORTE: { label: "Suporte", icon: "🤝", skills: ["Recepção", "Logística", "Segurança", "Ministério infantil", "Limpeza/organização"] },
};

const AREA_KEYS = Object.keys(VOLUNTEER_AREAS) as VolunteerArea[];

const VOLUNTEER_TERMS_TEXT = `TERMO DE ADESÃO AO SERVIÇO VOLUNTÁRIO
Banda Overflow Music – Overflow Movement

Este Termo de Adesão ao Serviço Voluntário ("Termo") é celebrado em conformidade com a Lei nº 9.608, de 18 de fevereiro de 1998, que dispõe sobre o serviço voluntário, e com o Código Civil Brasileiro (Lei nº 10.406/2002), entre:

RECEBEDOR DO SERVIÇO: Equipe ministerial da Banda Overflow Music, pertencente ao Overflow Movement, com sede no Brasil ("Organização").

VOLUNTÁRIO(A): o(a) cadastrante identificado(a) nos dados do presente aplicativo ("Voluntário(a)").

──────────────────────────────────────────

CLÁUSULA 1ª – DO OBJETO

O(A) Voluntário(a) se dispõe a prestar serviços não remunerados como músico(a), vocalista, técnico(a) de som ou em outras funções compatíveis com sua capacidade, junto à Banda Overflow Music.

CLÁUSULA 2ª – DA NATUREZA VOLUNTÁRIA

O serviço prestado tem caráter essencialmente civil e não gera vínculo empregatício, nem obrigação de natureza trabalhista, previdenciária ou congênere, conforme a Lei nº 9.608/1998.

CLÁUSULA 3ª – DAS OBRIGAÇÕES DO VOLUNTÁRIO

O(A) Voluntário(a) compromete-se a participar com assiduidade, zelar pelo bom nome da Organização, observar as diretrizes da liderança e manter sigilo de informações confidenciais.

CLÁUSULA 4ª – DAS OBRIGAÇÕES DA ORGANIZAÇÃO

A Organização compromete-se a fornecer condições necessárias para o desempenho das atividades e tratar o(a) Voluntário(a) com dignidade e respeito.

CLÁUSULA 5ª – DA DURAÇÃO E RESCISÃO

Este Termo é firmado por prazo indeterminado, podendo ser rescindido a qualquer momento por qualquer das partes, sem ônus.

CLÁUSULA 6ª – DO USO DE IMAGEM E VOZ

O(A) Voluntário(a) autoriza, a título gratuito, o uso de imagem e voz captadas durante as atividades para divulgação ministerial, incluindo redes sociais, vedado o uso comercial sem consentimento expresso.

CLÁUSULA 7ª – DA PROTEÇÃO DE DADOS

Os dados pessoais serão tratados em conformidade com a LGPD (Lei nº 13.709/2018), utilizados exclusivamente para coordenação das atividades voluntárias.

CLÁUSULA 8ª – DO FORO

As partes elegem o foro da comarca onde a Organização está sediada para dirimir quaisquer controvérsias.

══════════════════════════════════════════

Ao marcar a opção abaixo, o(a) Voluntário(a) declara ter lido integralmente, compreendido e concordado com todas as cláusulas deste Termo. Sua manifestação digital tem validade jurídica equivalente à assinatura manuscrita, nos termos da MP nº 2.200-2/2001 e da Lei nº 14.063/2020.

Versão do Termo: ${VOLUNTEER_TERMS_VERSION}`;

type RegisterResponse = {
  ok: boolean;
  message?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [volunteerArea, setVolunteerArea] = useState<VolunteerArea | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    if (!termsAccepted) {
      setError("É necessário aceitar o Termo de Adesão ao Serviço Voluntário para se cadastrar.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, volunteerTermsAccepted: true, volunteerArea: volunteerArea ?? undefined, instruments: skills.length > 0 ? skills : undefined }),
      });
      const data = (await res.json()) as RegisterResponse;

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.message || "Erro ao criar conta.");
      }
    } catch {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 40 }}>✉️</span>
          </div>
          <h1 style={titleStyle}>Verifique seu email</h1>
          <p style={{ margin: "12px 0 24px", fontSize: 14, color: "#b3c6e0", textAlign: "center", lineHeight: 1.6 }}>
            Enviamos um link de verificação para{" "}
            <strong style={{ color: "#f4f8ff" }}>{email}</strong>.{" "}
            Confirme seu email para ativar a conta.
          </p>
          <Link href="/login" style={{ ...primaryButtonStyle, display: "block", textAlign: "center", textDecoration: "none" }}>
            Ir para o login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div style={cardStyle}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#7cf2a2", marginBottom: 4 }}>
            OVERFLOW MUSIC
          </p>
          <h1 style={titleStyle}>Criar conta</h1>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nome completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Seu nome"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }}
            />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }}
            />
          </div>

          <div>
            <label style={labelStyle}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }}
            />
          </div>

          <div>
            <label style={labelStyle}>Confirmar senha</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repita a senha"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#1ecad3"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2d4b6d"; }}
            />
          </div>

          {/* Área de voluntariado */}
          <div>
            <label style={labelStyle}>Área de voluntariado <span style={{ color: "#5a7a9a", fontWeight: 400 }}>(opcional)</span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {AREA_KEYS.map((area) => {
                const { label, icon } = VOLUNTEER_AREAS[area];
                const selected = volunteerArea === area;
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => { setVolunteerArea(selected ? null : area); setSkills([]); }}
                    style={{
                      padding: "6px 13px",
                      borderRadius: 20,
                      border: selected ? "1px solid #1ecad3" : "1px solid #2d4b6d",
                      background: selected ? "rgba(30,202,211,0.12)" : "rgba(6,20,35,0.7)",
                      color: selected ? "#1ecad3" : "#8fa9c8",
                      fontSize: 13,
                      cursor: "pointer",
                      fontWeight: selected ? 700 : 400,
                    }}
                  >
                    {icon} {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Habilidades dinâmicas */}
          {volunteerArea && (
            <div>
              <label style={labelStyle}>
                {volunteerArea === "MUSICA" ? "Instrumentos / Vocal" : "Habilidades"}
                {" "}<span style={{ color: "#5a7a9a", fontWeight: 400 }}>(opcional)</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {VOLUNTEER_AREAS[volunteerArea].skills.map((skill) => {
                  const selected = skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => setSkills((prev) => selected ? prev.filter((s) => s !== skill) : [...prev, skill])}
                      style={{
                        padding: "5px 11px",
                        borderRadius: 16,
                        border: selected ? "1px solid #7cf2a2" : "1px solid #2d4b6d",
                        background: selected ? "rgba(124,242,162,0.1)" : "rgba(6,20,35,0.7)",
                        color: selected ? "#7cf2a2" : "#8fa9c8",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div style={errorBannerStyle}>
              <span style={{ fontSize: 14 }}>⚠</span>
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}

          {/* Termo de Adesão */}
          <div>
            <label style={labelStyle}>Termo de Adesão ao Serviço Voluntário</label>
            <div
              style={{
                maxHeight: 160,
                overflowY: "auto",
                background: "rgba(6, 20, 35, 0.7)",
                border: "1px solid #2d4b6d",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 11,
                color: "#b3c6e0",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
              }}
            >
              {VOLUNTEER_TERMS_TEXT}
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginTop: 10,
                cursor: "pointer",
                fontSize: 13,
                color: "#b3c6e0",
              }}
            >
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ marginTop: 2, accentColor: "#1ecad3", flexShrink: 0 }}
              />
              Li e aceito o Termo de Adesão ao Serviço Voluntário da Banda Overflow Music.
            </label>
          </div>

          <button type="submit" disabled={loading || !termsAccepted} style={{ ...primaryButtonStyle, opacity: (loading || !termsAccepted) ? 0.6 : 1 }}>
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p style={{ margin: "20px 0 0", textAlign: "center", fontSize: 13, color: "#b3c6e0" }}>
          Já tem conta?{" "}
          <Link href="/login" style={{ color: "#1ecad3", fontWeight: 600, textDecoration: "none" }}>
            Entrar
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px 16px" }}>
      {children}
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
  background: "rgba(18, 40, 64, 0.92)",
  border: "1px solid #2d4b6d",
  borderRadius: 16,
  padding: "32px 28px",
  backdropFilter: "blur(8px)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: "#f4f8ff",
  textAlign: "center",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 500,
  color: "#b3c6e0",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(6, 20, 35, 0.7)",
  border: "1px solid #2d4b6d",
  borderRadius: 10,
  color: "#f4f8ff",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  background: "linear-gradient(90deg, #1ecad3 0%, #7cf2a2 100%)",
  color: "#061420",
  border: "none",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const errorBannerStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  padding: "10px 12px",
  background: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.4)",
  borderRadius: 8,
  color: "#fca5a5",
};
