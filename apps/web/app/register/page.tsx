"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";

type RegisterResponse = {
  ok: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  message?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("As senhas não coincidem");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setMessage("A senha deve ter pelo menos 8 caracteres");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = (await response.json()) as RegisterResponse;

      if (response.ok && data.ok) {
        setSuccess(true);
        setMessage(data.message || "Cadastro realizado! Verifique seu email.");
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setMessage(data.message || "Erro ao cadastrar usuário");
      }
    } catch {
      setMessage("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
      padding: "16px"
    }}>
      <div style={{
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        padding: "32px",
        width: "100%",
        maxWidth: "400px"
      }}>
        <h1 style={{
          fontSize: "24px",
          fontWeight: "bold",
          marginBottom: "8px",
          color: "#1f2937"
        }}>
          Criar Conta
        </h1>
        <p style={{
          color: "#6b7280",
          marginBottom: "24px"
        }}>
          Preencha os dados para se cadastrar
        </p>

        {success ? (
          <div style={{
            background: "#d1fae5",
            border: "1px solid #10b981",
            borderRadius: "8px",
            padding: "16px",
            color: "#065f46",
            marginBottom: "16px"
          }}>
            {message}
          </div>
        ) : message ? (
          <div style={{
            background: "#fee2e2",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            padding: "16px",
            color: "#991b1b",
            marginBottom: "16px"
          }}>
            {message}
          </div>
        ) : null}

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "8px"
            }}>
              Nome completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px"
              }}
              placeholder="Seu nome"
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "8px"
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px"
              }}
              placeholder="seu@email.com"
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "8px"
            }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px"
              }}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "8px"
            }}>
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px"
              }}
              placeholder="Digite a senha novamente"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#9ca3af" : "#3b82f6",
              color: "white",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: "16px"
            }}
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <div style={{
          textAlign: "center",
          fontSize: "14px",
          color: "#6b7280"
        }}>
          Já tem uma conta?{" "}
          <Link href="/login" style={{ color: "#3b82f6", fontWeight: "600" }}>
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  );
}
