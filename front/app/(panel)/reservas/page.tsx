"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ServiceType = "ROBOT" | "DRON" | "";

type ReservationApiResponse = {
  id: number;
  qrDataUrl?: string | null;
  device?: {
    code?: string;
    name?: string;
    type?: "ROBOT" | "DRONE";
  };
};

type ReservationListItem = {
  id: number;
  object: string;
  requestedBy: string;
  startAt: string;
  deviceType: string;
  status: string;
  active: boolean;
};

type AuthUser = {
  role?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function ReservasPage() {
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedUnit, setAssignedUnit] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<number | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [reservationDate, setReservationDate] = useState("");
  const [location, setLocation] = useState("");
  const [product, setProduct] = useState("");
  const [dimensionWidth, setDimensionWidth] = useState("");
  const [dimensionHeight, setDimensionHeight] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [currentRole, setCurrentRole] = useState<string>("");
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);

  const isAdmin = currentRole === "ADMIN";

  const previewUserName = userName.trim() || "Sin nombre";
  const previewAddress = location.trim() || "Sin direccion";
  const previewServiceType = serviceType || "Sin servicio";
  const previewPhone = phone.trim() || "Sin telefono";
  const previewReservationLabel = reservationId ? `Reserva #${reservationId}` : "Reserva sin numero";
  const previewAssignedUnit =
    assignedUnit ??
    (serviceType === "ROBOT" ? "Robot (pendiente)" : serviceType === "DRON" ? "Dron (pendiente)" : "Sin asignacion");

  function getAuthToken() {
    return localStorage.getItem("auth_token");
  }

  async function loadReservations() {
    const token = getAuthToken();
    if (!token) {
      setError("No hay sesion activa para consultar reservas.");
      return;
    }

    try {
      setIsLoadingReservations(true);
      const response = await fetch(`${API_URL}/reservations?includeInactive=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("No fue posible cargar las reservas.");
      }

      const data = (await response.json()) as ReservationListItem[];
      setReservations(data.filter((item) => item.status !== "CANCELLED" && item.active));
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "No fue posible cargar las reservas.";
      setError(message);
    } finally {
      setIsLoadingReservations(false);
    }
  }

  async function removeReservation(id: number) {
    const token = getAuthToken();
    if (!token) {
      setError("No hay sesion activa para eliminar reservas.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/reservations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("No fue posible eliminar la reserva.");
      }

      await loadReservations();
      setConfirmationMessage(`Reserva #${id} eliminada correctamente.`);
      setShowConfirmation(true);
      setError(null);
    } catch (removeError) {
      const message =
        removeError instanceof Error ? removeError.message : "No fue posible eliminar la reserva.";
      setError(message);
    }
  }

  function handleDownloadQr() {
    if (!qrDataUrl || !reservationId) {
      return;
    }

    const link = window.document.createElement("a");
    link.href = qrDataUrl;
    link.download = `reserva-${reservationId}-qr.png`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  }

  useEffect(() => {
    setIsClient(true);

    const rawUser = localStorage.getItem("auth_user");
    if (!rawUser) {
      return;
    }

    try {
      const parsedUser = JSON.parse(rawUser) as AuthUser;
      const role = parsedUser.role?.toUpperCase() ?? "";
      setCurrentRole(role);
      if (role === "ADMIN") {
        void loadReservations();
      }
    } catch {
      // Ignore malformed user payload.
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmationMessage(null);

    const width = Number(dimensionWidth);
    const height = Number(dimensionHeight);
    const weight = Number(weightKg);

    if (!serviceType) {
      setConfirmationMessage(null);
      setError("Selecciona el tipo de servicio (robot o dron).");
      return;
    }

    if (Number.isNaN(width) || Number.isNaN(height) || width <= 0 || height <= 0) {
      setConfirmationMessage(null);
      setError("Las dimensiones deben ser numeros validos mayores a 0.");
      return;
    }

    if (Number.isNaN(weight) || weight <= 0) {
      setConfirmationMessage(null);
      setError("El peso debe ser un numero valido mayor a 0.");
      return;
    }

    if (width > 50 || height > 50) {
      setConfirmationMessage(null);
      setError("No se puede reservar: el tamano maximo permitido es 50 x 50 cm.");
      return;
    }

    if (serviceType === "ROBOT" && weight > 1) {
      setConfirmationMessage(null);
      setError("No se puede reservar: el robot solo transporta hasta 1 kg.");
      return;
    }

    if (serviceType === "DRON" && weight > 0.5) {
      setConfirmationMessage(null);
      setError("No se puede reservar: el dron solo transporta hasta 0.5 kg.");
      return;
    }

    const startAt = new Date(`${reservationDate}T08:00:00`);
    const endAt = new Date(startAt);
    endAt.setHours(endAt.getHours() + 1);

    const payload = {
      object: product.trim() || "Reserva de transporte",
      device: serviceType,
      requestedBy: userName.trim(),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      email: email.trim(),
    };

    setIsSubmitting(true);
    setError(null);

    const token = getAuthToken();
    if (!token) {
      setIsSubmitting(false);
      setError("No hay sesion activa para registrar reservas.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const fallbackMessage = "No fue posible registrar la reserva en la base de datos.";
        let message = fallbackMessage;
        try {
          const payloadError = (await response.json()) as { message?: string | string[] };
          if (Array.isArray(payloadError.message)) {
            message = payloadError.message.join(", ") || fallbackMessage;
          } else if (payloadError.message) {
            message = payloadError.message;
          }
        } catch {
          // Keep fallback message when backend returns non-JSON errors.
        }
        throw new Error(message);
      }

      const data = (await response.json()) as ReservationApiResponse;
      const resolvedAssigned = data.device?.name ?? data.device?.code ?? null;
      setReservationId(data.id);
      setAssignedUnit(resolvedAssigned);
      setQrDataUrl(data.qrDataUrl ?? null);
      setShowQrModal(false);
      setConfirmationMessage(`Reserva #${data.id} creada correctamente en la base de datos.`);
      setShowConfirmation(true);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "No fue posible registrar la reserva.";
      setConfirmationMessage(null);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNewReservation() {
    setShowQrModal(false);
    setShowConfirmation(false);
    setConfirmationMessage(null);
    setError(null);
    setAssignedUnit(null);
    setReservationId(null);
    setQrDataUrl(null);
    setUserName("");
    setReservationDate("");
    setLocation("");
    setProduct("");
    setDimensionWidth("");
    setDimensionHeight("");
    setWeightKg("");
    setServiceType("");
    setEmail("");
    setPhone("");
    setDocumentId("");
  }

  if (isAdmin) {
    return (
      <section className="reservation-page">
        <article className="reservation-card reservation-admin-card">
          <header className="reservation-head">
            <p className="reservation-kicker">Reservas</p>
            <h2 className="reservation-title">Gestion de reservas (Administrador)</h2>
            <p className="reservation-copy">Como administrador solo puedes visualizar y eliminar reservas.</p>
          </header>

          {error ? <p className="reservation-error">{error}</p> : null}

          {isLoadingReservations ? <p className="reservation-copy">Cargando reservas...</p> : null}

          {!isLoadingReservations && reservations.length === 0 ? (
            <p className="reservation-copy">No hay reservas registradas.</p>
          ) : null}

          {!isLoadingReservations && reservations.length > 0 ? (
            <div className="reservation-admin-table-wrap">
              <table className="reservation-admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Objeto</th>
                    <th>Solicitante</th>
                    <th>Inicio</th>
                    <th>Dispositivo</th>
                    <th>Estado</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.object}</td>
                      <td>{item.requestedBy}</td>
                      <td>{new Date(item.startAt).toLocaleString()}</td>
                      <td>{item.deviceType}</td>
                      <td>{item.active ? item.status : "CANCELLED"}</td>
                      <td>
                        <button
                          type="button"
                          className="reservation-admin-delete"
                          onClick={() => removeReservation(item.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>

        {isClient && showConfirmation && confirmationMessage
          ? createPortal(
              <div
                className="reservation-modal-backdrop"
                role="presentation"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9999,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(10, 24, 46, 0.45)",
                  padding: "1rem",
                }}
              >
                <div
                  className="reservation-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="reservation-confirmation-title"
                  style={{
                    width: "min(92vw, 420px)",
                    background: "#ffffff",
                    border: "1px solid #cfdcf1",
                    borderRadius: "14px",
                    padding: "1rem",
                    boxShadow: "0 20px 44px rgba(16, 34, 58, 0.26)",
                  }}
                >
                  <p className="reservation-modal-kicker">Confirmacion</p>
                  <h3 id="reservation-confirmation-title" className="reservation-modal-title">
                    Operacion realizada
                  </h3>
                  <p className="reservation-modal-message">{confirmationMessage}</p>
                  <button
                    type="button"
                    className="reservation-modal-button"
                    onClick={() => setShowConfirmation(false)}
                  >
                    Aceptar
                  </button>
                </div>
              </div>,
              document.body,
            )
          : null}
      </section>
    );
  }

  return (
    <section className="reservation-page">
      <div className="reservation-split">
        <article className="reservation-card">
          <header className="reservation-head">
            <p className="reservation-kicker">Reservas</p>
            <h2 className="reservation-title">Formulario de registro</h2>
            <p className="reservation-copy">Completa los datos de usuario, paquete y servicio para registrar una nueva solicitud.</p>
          </header>

          <form className="reservation-form" onSubmit={handleSubmit}>
            <div className="reservation-grid">
              <label className="reservation-field" htmlFor="userName">
                Nombre usuario
                <input
                  id="userName"
                  name="userName"
                  type="text"
                  placeholder="Nombre del solicitante"
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                  required
                />
              </label>

              <label className="reservation-field" htmlFor="email">
                Correo
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="usuario@universidad.edu"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              <label className="reservation-field" htmlFor="phone">
                Telefono
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="3001234567"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </label>

              <label className="reservation-field" htmlFor="document">
                Documento
                <input
                  id="document"
                  name="document"
                  type="text"
                  placeholder="CC 123456789"
                  value={documentId}
                  onChange={(event) => setDocumentId(event.target.value)}
                  required
                />
              </label>

              <label className="reservation-field" htmlFor="reservationDate">
                Fecha
                <input
                  id="reservationDate"
                  name="reservationDate"
                  type="date"
                  value={reservationDate}
                  onChange={(event) => setReservationDate(event.target.value)}
                  required
                />
              </label>

              <label className="reservation-field" htmlFor="location">
                Ubicacion
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="Bloque A - Laboratorio 3"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                />
              </label>

              <label className="reservation-field" htmlFor="product">
                Producto
                <input
                  id="product"
                  name="product"
                  type="text"
                  placeholder="Equipo electronico"
                  value={product}
                  onChange={(event) => setProduct(event.target.value)}
                  required
                />
              </label>

              <label className="reservation-field" htmlFor="dimensionWidth">
                Dimension ancho (cm)
                <input
                  id="dimensionWidth"
                  name="dimensionWidth"
                  type="number"
                  min="1"
                  step="0.1"
                  placeholder="50"
                  value={dimensionWidth}
                  onChange={(event) => setDimensionWidth(event.target.value)}
                  required
                />
              </label>

              <label className="reservation-field" htmlFor="dimensionHeight">
                Dimension alto (cm)
                <input
                  id="dimensionHeight"
                  name="dimensionHeight"
                  type="number"
                  min="1"
                  step="0.1"
                  placeholder="50"
                  value={dimensionHeight}
                  onChange={(event) => setDimensionHeight(event.target.value)}
                  required
                />
              </label>

              <label className="reservation-field" htmlFor="weightKg">
                Peso (kg)
                <input
                  id="weightKg"
                  name="weightKg"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="0.5"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                  required
                />
              </label>

              <label className="reservation-field" htmlFor="serviceType">
                Tipo de servicio
                <select
                  id="serviceType"
                  name="serviceType"
                  value={serviceType}
                  onChange={(event) => setServiceType(event.target.value as ServiceType)}
                  required
                >
                  <option value="">Selecciona una opcion</option>
                  <option value="ROBOT">Robot</option>
                  <option value="DRON">Dron</option>
                </select>
              </label>
            </div>

            <div className="reservation-actions">
              <button type="submit" className="reservation-button" disabled={isSubmitting}>
                {isSubmitting ? "Registrando..." : "Registrar reserva"}
              </button>
              <button
                type="button"
                className="reservation-button reservation-button-muted"
                onClick={handleNewReservation}
                disabled={isSubmitting}
              >
                Nueva reserva
              </button>
            </div>

            {error ? <p className="reservation-error">{error}</p> : null}
          </form>
        </article>

        <article className="reservation-card reservation-preview">
          <header className="reservation-head reservation-head-preview">
            <p className="reservation-kicker">Visualizacion</p>
            <h2 className="reservation-title">Resumen de la reserva</h2>
            <p className="reservation-copy">Resumen de la reserva a realizar.</p>
          </header>

          <div className="preview-ticket" aria-live="polite">
            <p className="preview-status">Solicitud en preparacion</p>
            <h3 className="preview-community">{previewReservationLabel}</h3>

            <dl className="preview-grid">
              <div>
                <dt>Nombre</dt>
                <dd>{previewUserName}</dd>
              </div>
              <div>
                <dt>Telefono</dt>
                <dd>{previewPhone}</dd>
              </div>
              <div>
                <dt>Direccion</dt>
                <dd>{previewAddress}</dd>
              </div>
              <div>
                <dt>Tipo servicio</dt>
                <dd>{previewServiceType}</dd>
              </div>
              <div>
                <dt>Asignado</dt>
                <dd>{previewAssignedUnit}</dd>
              </div>
            </dl>
          </div>

          <div className="reservation-qr-panel">
            <p className="reservation-qr-title">Codigo QR</p>
            <div className="reservation-qr-actions">
              <button
                type="button"
                className="reservation-qr-button"
                onClick={() => setShowQrModal(true)}
                disabled={!qrDataUrl}
              >
                Mostrar QR
              </button>
              <button
                type="button"
                className="reservation-qr-button"
                onClick={handleDownloadQr}
                disabled={!qrDataUrl}
              >
                Descargar QR
              </button>
            </div>
          </div>
        </article>
      </div>

      {isClient && showQrModal && qrDataUrl
        ? createPortal(
            <div
              className="reservation-modal-backdrop"
              role="presentation"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9998,
                display: "grid",
                placeItems: "center",
                background: "rgba(10, 24, 46, 0.45)",
                padding: "1rem",
              }}
            >
              <div
                className="reservation-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reservation-qr-title"
                style={{
                  width: "min(92vw, 420px)",
                  background: "#ffffff",
                  border: "1px solid #cfdcf1",
                  borderRadius: "14px",
                  padding: "1rem",
                  boxShadow: "0 20px 44px rgba(16, 34, 58, 0.26)",
                }}
              >
                <p className="reservation-modal-kicker">Codigo QR</p>
                <h3 id="reservation-qr-title" className="reservation-modal-title">
                  {reservationId ? `Reserva #${reservationId}` : "Reserva"}
                </h3>
                <div className="reservation-qr-box">
                  <img src={qrDataUrl} alt="QR de reserva" className="reservation-qr-image" />
                </div>
                <button type="button" className="reservation-modal-button" onClick={() => setShowQrModal(false)}>
                  Cerrar
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isClient && showConfirmation && confirmationMessage
        ? createPortal(
            <div
              className="reservation-modal-backdrop"
              role="presentation"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "grid",
                placeItems: "center",
                background: "rgba(10, 24, 46, 0.45)",
                padding: "1rem",
              }}
            >
              <div
                className="reservation-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reservation-confirmation-title"
                style={{
                  width: "min(92vw, 420px)",
                  background: "#ffffff",
                  border: "1px solid #cfdcf1",
                  borderRadius: "14px",
                  padding: "1rem",
                  boxShadow: "0 20px 44px rgba(16, 34, 58, 0.26)",
                }}
              >
                <p className="reservation-modal-kicker">Confirmacion</p>
                <h3 id="reservation-confirmation-title" className="reservation-modal-title">
                  Reserva registrada
                </h3>
                <p className="reservation-modal-message">{confirmationMessage}</p>
                <button
                  type="button"
                  className="reservation-modal-button"
                  onClick={() => setShowConfirmation(false)}
                >
                  Aceptar
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
