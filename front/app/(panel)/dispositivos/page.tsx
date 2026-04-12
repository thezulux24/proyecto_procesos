"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

type DeviceType = "ROBOT" | "DRONE";
type DeviceStatus = "AVAILABLE" | "RESERVED" | "IN_SERVICE" | "MAINTENANCE" | "OFFLINE";

type DeviceItem = {
  id: number;
  code: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  batteryLevel: number;
  lastKnownLocation: string | null;
  active: boolean;
};

type AuthUser = {
  role?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const CURRENT_YEAR = new Date().getFullYear();

const DEVICE_PREVIEW: Record<DeviceType, { src: string; alt: string; label: string }> = {
  DRONE: {
    src: "/dron.jpg",
    alt: "Vista de dron de reparto",
    label: "Drone Model",
  },
  ROBOT: {
    src: "/robot.avif",
    alt: "Vista de robot logistico",
    label: "Robot Model",
  },
};

export default function DispositivosPage() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deactivatingDeviceId, setDeactivatingDeviceId] = useState<number | null>(null);
  const [deviceToDeactivate, setDeviceToDeactivate] = useState<DeviceItem | null>(null);
  const [deviceToActivate, setDeviceToActivate] = useState<DeviceItem | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<DeviceType>("ROBOT");
  const [lastKnownLocation, setLastKnownLocation] = useState("");
  const [batteryLevel, setBatteryLevel] = useState("100");
  const [launchYear, setLaunchYear] = useState(String(CURRENT_YEAR));

  const isAdmin = currentRole === "ADMIN";
  const selectedPreview = DEVICE_PREVIEW[type];

  useEffect(() => {
    const rawUser = localStorage.getItem("auth_user");
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser) as AuthUser;
        setCurrentRole(parsed.role?.toUpperCase() ?? "");
      } catch {
        // ignore malformed data
      }
    }

    void loadDevices();
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsRegisterModalOpen(false);
      }
    }

    if (isRegisterModalOpen) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isRegisterModalOpen]);

  function getAuthToken() {
    return localStorage.getItem("auth_token");
  }

  async function loadDevices() {
    const token = getAuthToken();
    if (!token) {
      setError("No hay sesion activa para consultar dispositivos.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/devices?includeInactive=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("No fue posible cargar los dispositivos.");
      }

      const data = (await response.json()) as DeviceItem[];
      setDevices(data);
      setError(null);
    } catch (loadError) {
      const messageValue =
        loadError instanceof Error ? loadError.message : "No fue posible cargar los dispositivos.";
      setError(messageValue);
    } finally {
      setIsLoading(false);
    }
  }

  function requestDeactivateDevice(device: DeviceItem) {
    setError(null);
    setMessage(null);
    setDeviceToDeactivate(device);
  }

  async function handleConfirmDeactivateDevice() {
    if (!deviceToDeactivate) {
      return;
    }

    const device = deviceToDeactivate;
    const token = getAuthToken();
    if (!token) {
      setError("No hay sesion activa para dar de baja dispositivos.");
      return;
    }

    setError(null);
    setMessage(null);
    setDeactivatingDeviceId(device.id);
    try {
      const response = await fetch(`${API_URL}/devices/${device.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("No fue posible dar de baja el dispositivo.");
      }

      setDeviceToDeactivate(null);
      await loadDevices();
    } catch (deactivateError) {
      const messageValue =
        deactivateError instanceof Error ? deactivateError.message : "No fue posible dar de baja el dispositivo.";
      setError(messageValue);
    } finally {
      setDeactivatingDeviceId(null);
    }
  }

  async function handleActivateDevice(device: DeviceItem) {
    setError(null);
    setMessage(null);
    setDeviceToActivate(device);
  }

  async function handleConfirmActivateDevice() {
    if (!deviceToActivate) {
      return;
    }

    const device = deviceToActivate;
    const token = getAuthToken();
    if (!token) {
      setError("No hay sesion activa para habilitar dispositivos.");
      return;
    }

    setError(null);
    setMessage(null);
    setDeactivatingDeviceId(device.id);
    try {
      const response = await fetch(`${API_URL}/devices/${device.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: true }),
      });

      if (!response.ok) {
        throw new Error("No fue posible habilitar el dispositivo.");
      }

      setDeviceToActivate(null);
      await loadDevices();
    } catch (activateError) {
      const messageValue =
        activateError instanceof Error ? activateError.message : "No fue posible habilitar el dispositivo.";
      setError(messageValue);
    } finally {
      setDeactivatingDeviceId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const token = getAuthToken();
    if (!token) {
      setError("No hay sesion activa para registrar dispositivos.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          type,
          batteryLevel: Number(batteryLevel),
          lastKnownLocation: lastKnownLocation.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const fallback = "No fue posible registrar el dispositivo.";
        let messageValue = fallback;
        try {
          const apiError = (await response.json()) as { message?: string | string[] };
          if (Array.isArray(apiError.message)) {
            messageValue = apiError.message.join(", ") || fallback;
          } else if (apiError.message) {
            messageValue = apiError.message;
          }
        } catch {
          // keep fallback
        }
        throw new Error(messageValue);
      }

      setCode("");
      setName("");
      setType("ROBOT");
      setLastKnownLocation("");
      setBatteryLevel("100");
      setLaunchYear(String(CURRENT_YEAR));
      setIsRegisterModalOpen(false);
      setMessage("Dispositivo registrado correctamente.");
      await loadDevices();
    } catch (submitError) {
      const messageValue =
        submitError instanceof Error ? submitError.message : "No fue posible registrar el dispositivo.";
      setError(messageValue);
    } finally {
      setIsSaving(false);
    }
  }

  function openRegisterModal(deviceType: DeviceType) {
    setType(deviceType);
    setError(null);
    setMessage(null);
    setIsRegisterModalOpen(true);
  }

  return (
    <section className="devices-page">
      <article className="devices-card">
        <div className="devices-panel">
          <header className="devices-head">
            <p className="devices-kicker">Administracion</p>
            <h2 className="devices-title">Registro de drones y robots</h2>
            <p className="devices-copy">Elige el tipo que quieres registrar y completa el formulario en la ventana emergente.</p>
          </header>

          {isAdmin ? (
            <div className="devices-quick-actions">
              <button
                type="button"
                className="devices-quick-button"
                onClick={() => openRegisterModal("ROBOT")}
              >
                Crear robot
              </button>
              <button
                type="button"
                className="devices-quick-button devices-quick-button-alt"
                onClick={() => openRegisterModal("DRONE")}
              >
                Crear dron
              </button>
            </div>
          ) : (
            <p className="devices-info">Solo el administrador puede registrar drones y robots.</p>
          )}

          {error ? <p className="devices-error">{error}</p> : null}
          {message ? <p className="devices-success">{message}</p> : null}
        </div>
      </article>

      {isAdmin && isRegisterModalOpen ? (
        <div className="devices-modal-backdrop" onClick={() => setIsRegisterModalOpen(false)}>
          <article className="devices-modal" onClick={(event) => event.stopPropagation()}>
            <div className="devices-modal-layout">
              <div className="devices-modal-media">
                <p className="devices-media-badge">{selectedPreview.label}</p>
                <div className="devices-modal-media-frame">
                  <Image
                    src={selectedPreview.src}
                    alt={selectedPreview.alt}
                    width={700}
                    height={500}
                    className="devices-modal-media-image"
                    priority
                  />
                </div>
              </div>

              <div className="devices-modal-content">
                <header className="devices-modal-head">
                  <p className="devices-kicker">Nuevo dispositivo</p>
                  <h3 className="devices-modal-title">Registrar {type === "DRONE" ? "dron" : "robot"}</h3>
                  <p className="devices-copy">Completa los demas campos para finalizar el registro.</p>
                </header>

                <form className="devices-form" onSubmit={handleSubmit}>
                  <div className="devices-grid">
                    <label className="devices-field" htmlFor="deviceCode">
                      Codigo
                      <input
                        id="deviceCode"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder="RB-103"
                        required
                      />
                    </label>

                    <label className="devices-field" htmlFor="deviceName">
                      Nombre
                      <input
                        id="deviceName"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Robot Courier C"
                        required
                      />
                    </label>

                    <label className="devices-field" htmlFor="batteryLevel">
                      Bateria (%)
                      <input
                        id="batteryLevel"
                        type="number"
                        min="0"
                        max="100"
                        value={batteryLevel}
                        onChange={(event) => setBatteryLevel(event.target.value)}
                      />
                    </label>

                    <label className="devices-field" htmlFor="deviceLaunchYear">
                      Ano de lanzamiento
                      <input
                        id="deviceLaunchYear"
                        type="number"
                        min="1990"
                        max={String(CURRENT_YEAR + 1)}
                        value={launchYear}
                        onChange={(event) => setLaunchYear(event.target.value)}
                      />
                    </label>

                    <label className="devices-field devices-field-wide" htmlFor="deviceLocation">
                      Ubicacion (opcional)
                      <input
                        id="deviceLocation"
                        value={lastKnownLocation}
                        onChange={(event) => setLastKnownLocation(event.target.value)}
                        placeholder="Hangar Norte"
                      />
                    </label>
                  </div>

                  <div className="devices-modal-actions">
                    <button
                      type="button"
                      className="devices-button devices-button-muted"
                      onClick={() => setIsRegisterModalOpen(false)}
                      disabled={isSaving}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="devices-button" disabled={isSaving}>
                      {isSaving ? "Registrando..." : "Registrar dispositivo"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      <article className="devices-card devices-table-card">
        <h3 className="devices-list-title">Dispositivos registrados</h3>

        {isLoading ? <p className="devices-info">Cargando dispositivos...</p> : null}

        {!isLoading && devices.length === 0 ? (
          <p className="devices-info">No hay dispositivos registrados.</p>
        ) : null}

        {!isLoading && devices.length > 0 ? (
          <div className="devices-table-wrap">
            <table className="devices-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Bateria</th>
                  <th>Ubicacion</th>
                  {isAdmin ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {devices.map((item) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.type}</td>
                    <td>{item.active ? "HABILITADO" : "DESHABILITADO"}</td>
                    <td>{item.batteryLevel}%</td>
                    <td>{item.lastKnownLocation ?? "Sin ubicacion"}</td>
                    {isAdmin ? (
                      <td>
                        <div className="devices-row-actions">
                          {item.active ? (
                            <button
                              type="button"
                              className="devices-link devices-link-danger"
                              onClick={() => requestDeactivateDevice(item)}
                              disabled={deactivatingDeviceId === item.id}
                            >
                              {deactivatingDeviceId === item.id ? "Procesando..." : "Dar de baja"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="devices-link devices-link-success"
                              onClick={() => void handleActivateDevice(item)}
                              disabled={deactivatingDeviceId === item.id}
                            >
                              {deactivatingDeviceId === item.id ? "Procesando..." : "Habilitar"}
                            </button>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>

      {isAdmin && deviceToDeactivate ? (
        <div className="devices-confirm-backdrop" onClick={() => setDeviceToDeactivate(null)}>
          <article className="devices-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h4 className="devices-confirm-title">Confirmar baja</h4>
            <p className="devices-confirm-copy">
              Vas a deshabilitar el dispositivo {deviceToDeactivate.code}. Esta accion lo cambiara a la categoria
              DESHABILITADO.
            </p>
            <div className="devices-confirm-actions">
              <button
                type="button"
                className="devices-confirm-button devices-confirm-button-muted"
                onClick={() => setDeviceToDeactivate(null)}
                disabled={deactivatingDeviceId === deviceToDeactivate.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="devices-confirm-button devices-confirm-button-danger"
                onClick={() => void handleConfirmDeactivateDevice()}
                disabled={deactivatingDeviceId === deviceToDeactivate.id}
              >
                {deactivatingDeviceId === deviceToDeactivate.id ? "Procesando..." : "Confirmar baja"}
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {isAdmin && deviceToActivate ? (
        <div className="devices-confirm-backdrop" onClick={() => setDeviceToActivate(null)}>
          <article className="devices-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h4 className="devices-confirm-title">Confirmar habilitacion</h4>
            <p className="devices-confirm-copy">
              Vas a habilitar el dispositivo {deviceToActivate.code}. Esta accion lo cambiara a la categoria
              HABILITADO.
            </p>
            <div className="devices-confirm-actions">
              <button
                type="button"
                className="devices-confirm-button devices-confirm-button-muted"
                onClick={() => setDeviceToActivate(null)}
                disabled={deactivatingDeviceId === deviceToActivate.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="devices-confirm-button devices-confirm-button-success"
                onClick={() => void handleConfirmActivateDevice()}
                disabled={deactivatingDeviceId === deviceToActivate.id}
              >
                {deactivatingDeviceId === deviceToActivate.id ? "Procesando..." : "Confirmar habilitacion"}
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
