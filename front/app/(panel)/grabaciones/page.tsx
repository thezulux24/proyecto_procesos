"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardOverview = {
  generatedAt: string;
  videos: Array<{
    id: number;
    serviceLogId: number | null;
    cloudUrl: string;
    deviceName?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
  }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const fallbackOverview: DashboardOverview = {
  generatedAt: new Date().toISOString(),
  videos: [],
};

function getAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("auth_token") ?? "";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Date(value).toLocaleString();
}

export default function GrabacionesPage() {
  const [overview, setOverview] = useState<DashboardOverview>(fallbackOverview);
  const [selectedDate, setSelectedDate] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const [appliedServiceQuery, setAppliedServiceQuery] = useState("");
  const [currentRole, setCurrentRole] = useState("");

  const isAdmin = currentRole === "ADMIN";

  useEffect(() => {
    const rawUser = localStorage.getItem("auth_user");
    if (!rawUser) {
      setCurrentRole("");
      return;
    }

    try {
      const parsedUser = JSON.parse(rawUser) as { role?: string };
      setCurrentRole(parsedUser.role?.toUpperCase() ?? "");
    } catch {
      setCurrentRole("");
    }
  }, []);

  const serviceOptions = useMemo(() => {
    const uniqueServices = new Map<number, string>();

    overview.videos.forEach((video) => {
      const serviceId = video.serviceLogId ?? video.id;
      if (!uniqueServices.has(serviceId)) {
        uniqueServices.set(serviceId, video.deviceName ?? `Servicio ${serviceId}`);
      }
    });

    return Array.from(uniqueServices.entries()).map(([id, label]) => ({ id, label }));
  }, [overview.videos]);

  const filteredVideos = useMemo(() => {
    return overview.videos.filter((video) => {
      const normalizedQuery = appliedServiceQuery.trim();
      const matchesService =
        !normalizedQuery || String(video.serviceLogId ?? video.id).includes(normalizedQuery);

      const matchesDate =
        !selectedDate ||
        (() => {
          const sourceDate = video.startedAt ?? video.endedAt;
          if (!sourceDate) {
            return false;
          }

          return new Date(sourceDate).toISOString().slice(0, 10) === selectedDate;
        })();

      return matchesService && matchesDate;
    });
  }, [overview.videos, appliedServiceQuery, selectedDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      const token = getAuthToken();
      if (!token) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/dashboard/overview`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("No fue posible cargar las grabaciones.");
        }

        const data = (await response.json()) as DashboardOverview;
        if (!cancelled) {
          setOverview(data);
        }
      } catch {
        if (!cancelled) {
          setOverview(fallbackOverview);
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdmin) {
    return (
      <section className="recordings-page">
        <article className="panel-card">
          <p className="page-kicker">Acceso restringido</p>
          <h2 className="page-title">Grabaciones disponible solo para ADMIN</h2>
          <p className="panel-description">Tu rol actual no tiene permiso para ver esta sección.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="recordings-page">
      <div className="recordings-shell">
        <div className="recordings-head">
          <div>
            <p className="page-kicker">Grabaciones</p>
            <h2 className="page-title">Videos del demo</h2>
          </div>

          <form
            className="recordings-filters"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedServiceQuery(serviceQuery.trim());
            }}
          >
            <label className="recordings-filter-field">
              <span>Fecha</span>
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </label>

            <label className="recordings-filter-field">
              <span>Servicio</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej. 774"
                value={serviceQuery}
                onChange={(event) => setServiceQuery(event.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>

            <button type="submit" className="recordings-search-button" aria-label="Buscar grabaciones">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="recordings-search-icon">
                <circle cx="10.5" cy="10.5" r="5.75" fill="none" stroke="#ffffff" strokeWidth="2.8" />
                <path d="M15 15L20.5 20.5" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
              </svg>
              <span className="sr-only">Buscar</span>
            </button>

            <button
              type="button"
              className="recordings-clear-button"
              onClick={() => {
                setSelectedDate("");
                setServiceQuery("");
                setAppliedServiceQuery("");
              }}
            >
              Limpiar
            </button>
          </form>
        </div>

        <div className="recordings-list-wrap">
          <div className="recordings-list">
            {filteredVideos.length === 0 ? (
              <div className="recordings-empty">No hay grabaciones disponibles.</div>
            ) : (
              filteredVideos.map((video, index) => (
                <article key={video.id} className="recording-card">
                  <div className="recording-thumb">
                    <span className="recording-thumb-badge">Demo</span>
                    <div className="recording-thumb-play">▶</div>
                    <span className="recording-thumb-caption">{index + 1}</span>
                  </div>

                  <div className="recording-info">
                    <div className="recording-info-head">
                      <h3 className="recording-title">{video.deviceName ?? `Servicio ${video.serviceLogId ?? video.id}`}</h3>
                      <p className="recording-subtitle">{video.serviceLogId ? `Servicio #${video.serviceLogId}` : "Sin servicio asociado"}</p>
                    </div>

                    <dl className="recording-meta">
                      <div>
                        <dt>Inicio</dt>
                        <dd>{formatDate(video.startedAt)}</dd>
                      </div>
                      <div>
                        <dt>Fin</dt>
                        <dd>{formatDate(video.endedAt)}</dd>
                      </div>
                      <div>
                        <dt>Estado</dt>
                        <dd>Simulación</dd>
                      </div>
                    </dl>

                    <div className="recording-actions">
                      <Link href={`/resumen/video/${video.id}`} className="recording-open-button">
                        Ver video
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}