"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("El enlace de restablecimiento no contiene token.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const fallbackMessage = "No fue posible actualizar la contraseña.";
        let messageValue = fallbackMessage;

        try {
          const payload = (await response.json()) as { message?: string | string[] };
          if (Array.isArray(payload.message)) {
            messageValue = payload.message.join(", ") || fallbackMessage;
          } else if (payload.message) {
            messageValue = payload.message;
          }
        } catch {
          // keep fallback message
        }

        throw new Error(messageValue);
      }

      setMessage("Contraseña actualizada. Ya puedes iniciar sesion con la nueva clave.");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible actualizar la contraseña.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="login-shell">
      <div className="login-backdrop" aria-hidden="true" />

      <div className="login-frame">
        <div className="login-panel">
          <div className="login-intro">
            <p className="login-kicker">Uni Transport</p>
            <h1 className="login-title">Asignar nueva contraseña</h1>
            <p className="panel-description">
              Usa este formulario para definir la clave inicial del operador dentro de las 48 horas del enlace.
            </p>
          </div>

          {!token ? <p className="form-error">El enlace no contiene un token valido.</p> : null}

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field-block" htmlFor="password">
              Nueva contraseña
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
                placeholder="••••••••"
              />
            </label>

            <label className="field-block" htmlFor="confirmPassword">
              Confirmar contraseña
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
                placeholder="••••••••"
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}
            {message ? <p className="form-success">{message}</p> : null}

            <button type="submit" className="login-button" disabled={isSaving || !token}>
              {isSaving ? "Guardando..." : "Actualizar contraseña"}
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