"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type OperatorRole = "ADMIN" | "TECHNICIAN" | "SUPERVISOR";

type OperatorItem = {
  id: number;
  fullName: string;
  email: string;
  role: OperatorRole;
  active: boolean;
};

type OperatorFormState = {
  fullName: string;
  email: string;
  role: OperatorRole;
  active: boolean;
};

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10.2-10.2a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m13.2 6.8 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PowerIcon({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.1 5.5a8 8 0 1 0 9.8 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.1 5.5a8 8 0 1 0 9.8 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 2" />
      <path d="M9.5 13l5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.5 7l.7 11a1.6 1.6 0 0 0 1.6 1.5h4.4a1.6 1.6 0 0 0 1.6-1.5l.7-11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 11v5M14 11v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const emptyForm: OperatorFormState = {
  fullName: "",
  email: "",
  role: "TECHNICIAN",
  active: true,
};

export default function OperadoresPage() {
  const [operators, setOperators] = useState<OperatorItem[]>([]);
  const [form, setForm] = useState<OperatorFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const formTitle = useMemo(
    () => (editingId ? `Editar operador #${editingId}` : "Crear operador"),
    [editingId],
  );

  useEffect(() => {
    void loadOperators();
  }, []);

  function getAuthToken() {
    return localStorage.getItem("auth_token");
  }

  async function loadOperators() {
    const token = getAuthToken();
    if (!token) {
      setError("No hay sesion activa para consultar operadores.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/operators?includeInactive=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("No fue posible cargar los operadores.");
      }

      const data = (await response.json()) as OperatorItem[];
      setOperators(data);
      setError(null);
    } catch (loadError) {
      const messageValue =
        loadError instanceof Error ? loadError.message : "Error al cargar operadores.";
      setError(messageValue);
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(operator: OperatorItem) {
    setMessage(null);
    setError(null);
    setEditingId(operator.id);
    setForm({
      fullName: operator.fullName,
      email: operator.email,
      role: operator.role,
      active: operator.active,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const token = getAuthToken();
    if (!token) {
      setError("No hay sesion activa para guardar cambios.");
      return;
    }

    setIsSaving(true);
    try {
      const isEditing = editingId !== null;
      const endpoint = isEditing ? `${API_URL}/operators/${editingId}` : `${API_URL}/operators`;
      const method = isEditing ? "PATCH" : "POST";

      const payload = isEditing
        ? {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            role: form.role,
            active: form.active,
          }
        : {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            role: form.role,
          };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const fallback = "No fue posible guardar el operador.";
        let messageValue = fallback;
        try {
          const apiError = (await response.json()) as { message?: string | string[] };
          if (Array.isArray(apiError.message)) {
            messageValue = apiError.message.join(", ") || fallback;
          } else if (apiError.message) {
            messageValue = apiError.message;
          }
        } catch {
          // Keep fallback.
        }
        throw new Error(messageValue);
      }

      await loadOperators();
      setMessage(isEditing ? "Operador actualizado correctamente." : "Operador creado correctamente.");
      resetForm();
    } catch (submitError) {
      const messageValue =
        submitError instanceof Error ? submitError.message : "No fue posible guardar el operador.";
      setError(messageValue);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(operator: OperatorItem) {
    const token = getAuthToken();
    if (!token) {
      setError("No hay sesion activa para cambiar el estado.");
      return;
    }

    setMessage(null);
    setError(null);

    try {
      const response = operator.active
        ? await fetch(`${API_URL}/operators/${operator.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        : await fetch(`${API_URL}/operators/${operator.id}/reactivate`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

      if (!response.ok) {
        throw new Error("No fue posible actualizar el estado del operador.");
      }

      await loadOperators();
      setMessage(`Operador ${!operator.active ? "activado" : "desactivado"} correctamente.`);
    } catch (toggleError) {
      const messageValue =
        toggleError instanceof Error ? toggleError.message : "No fue posible cambiar el estado.";
      setError(messageValue);
    }
  }

  async function removeOperator(operator: OperatorItem) {
    const token = getAuthToken();
    if (!token) {
      setError("No hay sesion activa para eliminar operadores.");
      return;
    }

    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/operators/${operator.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("No fue posible eliminar el operador.");
      }

      await loadOperators();
      setMessage("Operador eliminado (desactivado) correctamente.");
    } catch (removeError) {
      const messageValue =
        removeError instanceof Error ? removeError.message : "No fue posible eliminar el operador.";
      setError(messageValue);
    }
  }

  return (
    <section className="operators-page">
      <article className="operators-card">
        <header className="operators-head">
          <p className="operators-kicker">Administracion</p>
          <h2 className="operators-title">Gestion de operadores</h2>
          <p className="operators-copy">Crea, edita, activa o desactiva operadores desde este panel.</p>
        </header>

        <form className="operators-form" onSubmit={handleSubmit}>
          <h3 className="operators-form-title">{formTitle}</h3>

          <div className="operators-form-grid">
            <label className="operators-field" htmlFor="operatorName">
              Nombre completo
              <input
                id="operatorName"
                type="text"
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                required
              />
            </label>

            <label className="operators-field" htmlFor="operatorEmail">
              Correo
              <input
                id="operatorEmail"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>

            <label className="operators-field" htmlFor="operatorRole">
              Rol operativo
              <select
                id="operatorRole"
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as OperatorRole }))}
              >
                <option value="TECHNICIAN">TECHNICIAN</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>

            <label className="operators-checkbox" htmlFor="operatorActive">
              <input
                id="operatorActive"
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                disabled={editingId === null}
              />
              Operador activo
            </label>
          </div>

          <div className="operators-actions">
            <button type="submit" className="operators-button" disabled={isSaving}>
              {isSaving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear operador"}
            </button>
            {editingId ? (
              <button type="button" className="operators-button operators-button-muted" onClick={resetForm}>
                Cancelar edicion
              </button>
            ) : null}
          </div>

          {error ? <p className="operators-error">{error}</p> : null}
          {message ? <p className="operators-success">{message}</p> : null}
        </form>
      </article>

      <article className="operators-card operators-table-card">
        <h3 className="operators-form-title">Lista de operadores</h3>

        {isLoading ? <p className="operators-empty">Cargando operadores...</p> : null}

        {!isLoading && operators.length === 0 ? (
          <p className="operators-empty">No hay operadores registrados.</p>
        ) : null}

        {!isLoading && operators.length > 0 ? (
          <div className="operators-table-wrap">
            <table className="operators-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((operator) => (
                  <tr key={operator.id}>
                    <td>{operator.fullName}</td>
                    <td>{operator.email}</td>
                    <td>{operator.role}</td>
                    <td>{operator.active ? "Activo" : "Inactivo"}</td>
                    <td className="operators-row-actions">
                      <button
                        type="button"
                        className="operators-link operators-icon-button"
                        onClick={() => startEdit(operator)}
                        aria-label={`Editar ${operator.fullName}`}
                        title={`Editar ${operator.fullName}`}
                      >
                        <EditIcon />
                        <span className="sr-only">Editar</span>
                      </button>
                      <button
                        type="button"
                        className="operators-link operators-icon-button operators-icon-button-toggle"
                        onClick={() => toggleActive(operator)}
                        aria-label={operator.active ? `Desactivar ${operator.fullName}` : `Activar ${operator.fullName}`}
                        title={operator.active ? `Desactivar ${operator.fullName}` : `Activar ${operator.fullName}`}
                      >
                        <PowerIcon active={operator.active} />
                        <span className="sr-only">{operator.active ? "Desactivar" : "Activar"}</span>
                      </button>
                      <button
                        type="button"
                        className="operators-link operators-icon-button operators-link-danger"
                        onClick={() => removeOperator(operator)}
                        aria-label={`Eliminar ${operator.fullName}`}
                        title={`Eliminar ${operator.fullName}`}
                      >
                        <DeleteIcon />
                        <span className="sr-only">Eliminar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
