"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type LoginResponse = {
  accessToken: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function applyQuickAccess(type: "ADMIN" | "OPERADOR") {
    setError(null);
    if (type === "ADMIN") {
      setEmail("admin@universidad.edu");
      setPassword("admin123456");
      return;
    }
    setEmail("operador@universidad.edu");
    setPassword("operador123456");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const fallbackMessage = "Credenciales invalidas. Intenta nuevamente.";
        let message = fallbackMessage;

        try {
          const payload = (await response.json()) as { message?: string | string[] };
          if (Array.isArray(payload.message)) {
            message = payload.message.join(", ") || fallbackMessage;
          } else if (payload.message) {
            message = payload.message;
          }
        } catch {
          // Keep fallback message when backend does not return JSON payload.
        }

        throw new Error(message);
      }

      const data = (await response.json()) as LoginResponse;

      localStorage.setItem("auth_token", data.accessToken);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      document.cookie = `auth_token=${data.accessToken}; Path=/; Max-Age=86400; SameSite=Lax`;

      router.replace("/resumen");
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "No fue posible iniciar sesion.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="login-shell">
      <div className="login-backdrop" aria-hidden="true" />

      <div className="login-frame">
        <div className="login-panel">
          <div className="login-intro">
            <p className="login-kicker">Uni Transport</p>
            <h1 className="login-title">Iniciar sesion</h1>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field-block" htmlFor="email">
              Correo
              <input
                id="email"
                name="email"
                type="email"
                placeholder="admin@universidad.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field-block" htmlFor="password">
              Contraseña
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

              <div className="quick-access" aria-label="Accesos rapidos">
                <div className="quick-access-actions">
                  <button type="button" className="quick-button" onClick={() => applyQuickAccess("ADMIN")}>
                    Administrador
                  </button>
                  <button
                    type="button"
                    className="quick-button quick-button-alt"
                    onClick={() => applyQuickAccess("OPERADOR")}
                  >
                    Operador
                  </button>
                </div>
              </div>

              {error ? <p className="form-error">{error}</p> : null}

              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
        </div>

        <aside className="login-visual" aria-hidden="true">
          <Image
            src="/uni-transport-logo.svg"
            alt="Uni Transport"
            width={220}
            height={64}
            className="visual-corner-logo"
            priority
          />
        </aside>
      </div>
    </section>
  );
}
