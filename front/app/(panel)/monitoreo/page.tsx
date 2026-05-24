"use client";

import { useEffect, useState } from "react";

type MonitoringDevice = {
  id: number;
  code: string;
  name: string;
  type: "ROBOT" | "DRONE";
  status: "AVAILABLE" | "RESERVED" | "IN_SERVICE" | "MAINTENANCE" | "OFFLINE";
  batteryLevel: number;
  lastKnownLocation: string | null;
  active: boolean;
  updatedAt: string;
  latestTelemetryAt: string | null;
  sensorStatus: string | null;
  payloadStatus: string | null;
  currentService: {
    id: number;
    operatorName: string | null;
    status: string;
  } | null;
};

type MonitoringOverview = {
  generatedAt: string;
  summary: {
    activeDevices: number;
    availableDevices: number;
    inServiceDevices: number;
    maintenanceDevices: number;
    offlineDevices: number;
  };
  devices: MonitoringDevice[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const fallbackOverview: MonitoringOverview = {
  generatedAt: new Date().toISOString(),
  summary: {
    activeDevices: 0,
    availableDevices: 0,
    inServiceDevices: 0,
    maintenanceDevices: 0,
    offlineDevices: 0,
  },
  devices: [],
};

function getAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("auth_token") ?? "";
}

function getStatusLabel(status: MonitoringDevice["status"]) {
  switch (status) {
    case "AVAILABLE":
      return "Disponible";
    case "RESERVED":
      return "Reservado";
    case "IN_SERVICE":
      return "En servicio";
    case "MAINTENANCE":
      return "Mantenimiento";
    case "OFFLINE":
      return "Sin conexion";
    default:
      return status;
  }
}

function getStatusTone(status: MonitoringDevice["status"]) {
  switch (status) {
    case "AVAILABLE":
      return "is-available";
    case "RESERVED":
      return "is-reserved";
    case "IN_SERVICE":
      return "is-service";
    case "MAINTENANCE":
      return "is-maintenance";
    case "OFFLINE":
      return "is-offline";
    default:
      return "";
  }
}

function formatRelativeTime(timestamp: string | null) {
  if (!timestamp) {
    return "Sin telemetria";
  }

  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffSeconds = Math.max(1, Math.round(diffMs / 1000));

  if (diffSeconds < 60) {
    return `hace ${diffSeconds} s`;
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `hace ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  return `hace ${diffHours} h`;
}

function formatExactTime(timestamp: string | null) {
  if (!timestamp) {
    return "Sin datos";
  }

  return new Date(timestamp).toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function MonitoreoPage() {
  const [overview, setOverview] = useState<MonitoringOverview>(fallbackOverview);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function loadMonitoring() {
      const token = getAuthToken();
      if (!token) {
        if (!cancelled) {
          setError("No hay sesion activa para consultar el monitoreo.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`${API_URL}/dashboard/monitoring`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("No fue posible cargar el monitoreo.");
        }

        const data = (await response.json()) as MonitoringOverview;

        if (!cancelled) {
          setOverview(data);
          setError(null);
          setLastSyncedAt(new Date().toISOString());

          setSelectedDeviceId((currentSelection) => {
            if (currentSelection && data.devices.some((device) => device.id === currentSelection)) {
              return currentSelection;
            }

            return data.devices[0]?.id ?? null;
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No fue posible cargar el monitoreo.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMonitoring();
    intervalId = setInterval(() => {
      void loadMonitoring();
    }, 5000);

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const selectedDevice = overview.devices.find((device) => device.id === selectedDeviceId) ?? null;
  const updatedLabel = lastSyncedAt ? formatExactTime(lastSyncedAt) : "Esperando datos";

  return (
    <section className="monitoring-page">
      <article className="panel-card panel-card-hero monitoring-hero">
        <div>
          <p className="panel-kicker">Telemetria en vivo</p>
          <h2 className="panel-title">Monitoreo centralizado de dispositivos</h2>
          <p className="panel-description">
            La vista se actualiza automaticamente con la telemetria que genera la simulacion.
          </p>
        </div>
        <div className="monitoring-hero-meta">
          <span className="monitoring-live-dot">Actualizacion cada 5 s</span>
          <small>Ultima sincronizacion: {updatedLabel}</small>
        </div>
      </article>

      <div className="monitoring-shell">
        <article className="panel-card monitoring-list-card">
          <div className="section-head">
            <div>
              <p className="panel-kicker">Flota activa</p>
              <h3 className="panel-subtitle">Estado operativo por dispositivo</h3>
            </div>
            <small className="monitoring-source">Fuente: telemetria simulada</small>
          </div>

          <div className="monitoring-summary-grid">
            <div className="monitoring-summary-item">
              <span className="monitoring-summary-label">Activos</span>
              <strong className="monitoring-summary-value">{overview.summary.activeDevices}</strong>
            </div>
            <div className="monitoring-summary-item">
              <span className="monitoring-summary-label">En servicio</span>
              <strong className="monitoring-summary-value">{overview.summary.inServiceDevices}</strong>
            </div>
            <div className="monitoring-summary-item">
              <span className="monitoring-summary-label">Disponibles</span>
              <strong className="monitoring-summary-value">{overview.summary.availableDevices}</strong>
            </div>
            <div className="monitoring-summary-item">
              <span className="monitoring-summary-label">Mantenimiento</span>
              <strong className="monitoring-summary-value">{overview.summary.maintenanceDevices}</strong>
            </div>
          </div>

          {isLoading ? <p className="monitoring-info">Cargando telemetria...</p> : null}
          {error ? <p className="monitoring-error">{error}</p> : null}

          {!isLoading && overview.devices.length === 0 ? (
            <p className="monitoring-empty">No hay dispositivos activos para monitorear.</p>
          ) : null}

          {overview.devices.length > 0 ? (
            <div className="monitoring-list">
              {overview.devices.map((device) => {
                const isSelected = device.id === selectedDevice?.id;
                const batteryLevel = Math.max(0, Math.min(100, device.batteryLevel));

                return (
                  <button
                    key={device.id}
                    type="button"
                    className={`monitoring-device-button${isSelected ? " monitoring-device-button-active" : ""}`}
                    onClick={() => setSelectedDeviceId(device.id)}
                    aria-pressed={isSelected}
                  >
                    <div className="monitoring-device-top">
                      <div>
                        <p className="monitoring-device-name">{device.name}</p>
                        <p className="monitoring-device-meta">
                          {device.code} · {device.type === "DRONE" ? "Dron" : "Robot"}
                        </p>
                      </div>
                      <span className={`monitoring-status-pill ${getStatusTone(device.status)}`}>
                        {getStatusLabel(device.status)}
                      </span>
                    </div>

                    <div className="monitoring-battery">
                      <div className="monitoring-battery-head">
                        <span>Bateria</span>
                        <strong>{batteryLevel}%</strong>
                      </div>
                      <div className="monitoring-battery-track" aria-hidden="true">
                        <span className="monitoring-battery-fill" style={{ width: `${batteryLevel}%` }} />
                      </div>
                    </div>

                    <div className="monitoring-device-footer">
                      <small>Ubicacion: {device.lastKnownLocation ?? "Sin ubicacion"}</small>
                      <small>{formatRelativeTime(device.latestTelemetryAt)}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </article>

        <article className="panel-card monitoring-detail-card">
          <div className="section-head">
            <div>
              <p className="panel-kicker">Detalle</p>
              <h3 className="panel-subtitle">Vista del dispositivo seleccionado</h3>
            </div>
          </div>

          {selectedDevice ? (
            <div className="monitoring-detail">
              <div className="monitoring-detail-hero">
                <div>
                  <p className="monitoring-device-name">{selectedDevice.name}</p>
                  <p className="monitoring-device-meta">
                    {selectedDevice.code} · {selectedDevice.type === "DRONE" ? "Dron" : "Robot"}
                  </p>
                </div>
                <span className={`monitoring-status-pill ${getStatusTone(selectedDevice.status)}`}>
                  {getStatusLabel(selectedDevice.status)}
                </span>
              </div>

              <div className="monitoring-detail-grid">
                <div className="monitoring-detail-tile">
                  <span className="monitoring-detail-label">Bateria</span>
                  <strong className="monitoring-detail-value">{selectedDevice.batteryLevel}%</strong>
                  <p className="monitoring-detail-note">Nivel actualizado por telemetria simulada.</p>
                </div>
                <div className="monitoring-detail-tile">
                  <span className="monitoring-detail-label">Ubicacion actual</span>
                  <strong className="monitoring-detail-value">{selectedDevice.lastKnownLocation ?? "Sin ubicacion"}</strong>
                  <p className="monitoring-detail-note">Lectura mas reciente registrada.</p>
                </div>
                <div className="monitoring-detail-tile">
                  <span className="monitoring-detail-label">Ultima telemetria</span>
                  <strong className="monitoring-detail-value">
                    {formatExactTime(selectedDevice.latestTelemetryAt)}
                  </strong>
                  <p className="monitoring-detail-note">{formatRelativeTime(selectedDevice.latestTelemetryAt)}</p>
                </div>
                <div className="monitoring-detail-tile">
                  <span className="monitoring-detail-label">Estado operativo</span>
                  <strong className="monitoring-detail-value">{getStatusLabel(selectedDevice.status)}</strong>
                  <p className="monitoring-detail-note">{selectedDevice.active ? "Dispositivo activo" : "Dispositivo inactivo"}</p>
                </div>
              </div>

              <div className="monitoring-detail-stack">
                <div className="monitoring-detail-tile">
                  <span className="monitoring-detail-label">Sensor</span>
                  <strong className="monitoring-detail-value">
                    {selectedDevice.sensorStatus ?? "Sin lectura"}
                  </strong>
                </div>
                <div className="monitoring-detail-tile">
                  <span className="monitoring-detail-label">Carga</span>
                  <strong className="monitoring-detail-value">
                    {selectedDevice.payloadStatus ?? "Sin lectura"}
                  </strong>
                </div>
                <div className="monitoring-detail-tile">
                  <span className="monitoring-detail-label">Servicio actual</span>
                  <strong className="monitoring-detail-value">
                    {selectedDevice.currentService
                      ? `#${selectedDevice.currentService.id} · ${selectedDevice.currentService.status}`
                      : "Sin servicio activo"}
                  </strong>
                  <p className="monitoring-detail-note">
                    {selectedDevice.currentService?.operatorName ?? "Sin operador asignado"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="monitoring-empty monitoring-empty-detail">
              Selecciona un dispositivo para ver su telemetria y estado operativo.
            </div>
          )}
        </article>
      </div>
    </section>
  );
}