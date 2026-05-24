"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type DashboardOverview = {
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

function getAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("auth_token") ?? "";
}

export default function VideoDemoPage() {
  const params = useParams<{ videoId: string }>();
  const [video, setVideo] = useState<DashboardOverview["videos"][number] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(24);

  const videoId = useMemo(() => Number(params.videoId), [params.videoId]);

  useEffect(() => {
    let cancelled = false;

    async function loadVideo() {
      const token = getAuthToken();
      if (!token || Number.isNaN(videoId)) {
        return;
      }

      const response = await fetch(`${API_URL}/dashboard/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return;
      }

      const overview = (await response.json()) as DashboardOverview;
      const selected = overview.videos.find((item) => item.id === videoId) ?? null;

      if (!cancelled) {
        setVideo(selected);
      }
    }

    void loadVideo();

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timer = window.setInterval(() => {
      setProgress((current) => (current >= 92 ? 18 : current + 2));
    }, 180);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const title = video?.deviceName ?? `Servicio ${video?.serviceLogId ?? videoId}`;

  return (
    <section className="video-demo-page">
      <div className="video-demo-shell">
        <header className="video-demo-header">
          <div>
            <p className="panel-kicker">Video demo</p>
            <h2 className="panel-title">{title}</h2>
          </div>

          <Link href="/grabaciones" className="video-demo-back-button">
            Volver a grabaciones
          </Link>
        </header>

        <article className="video-player-card">
          <div className="video-player-top">
            <div className="video-player-volume">
              <span className="video-player-volume-icon">🔊</span>
              <div className="video-player-volume-track" aria-hidden="true">
                <div className="video-player-volume-fill" />
              </div>
            </div>

            <div className="video-player-canvas" aria-label="Simulación de reproductor">
              <button
                type="button"
                className="video-player-play-button"
                onClick={() => setIsPlaying((value) => !value)}
                aria-label={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>
            </div>
          </div>

          <div className="video-player-bottom">
            <div className="video-player-controls-row">
              <div className="video-player-progress-area">
                <span className="video-player-time">00:32 / 04:19</span>
                <div className="video-player-progress-track" aria-hidden="true">
                  <div className="video-player-progress-fill" style={{ width: `${progress}%` }} />
                  <span className="video-player-progress-thumb" style={{ left: `${progress}%` }} />
                </div>
              </div>

              <div className="video-player-actions">
                <button type="button" className="video-player-action" onClick={() => setProgress(24)}>
                  ⏮
                </button>
                <button type="button" className="video-player-action" onClick={() => setIsPlaying((value) => !value)}>
                  {isPlaying ? "❚❚" : "▶"}
                </button>
                <button type="button" className="video-player-action" onClick={() => setProgress(72)}>
                  ⏭
                </button>
              </div>

              <div className="video-player-side-actions">
                <button type="button" className="video-player-icon-button" aria-label="Favorito">
                  ♡
                </button>
                <button type="button" className="video-player-icon-button" aria-label="Configuración">
                  ⚙
                </button>
              </div>
            </div>

            <div className="video-player-meta-row">
              <div className="video-player-meta-pill">
                <span className="video-player-meta-label">Inicio</span>
                <strong>{video?.startedAt ? new Date(video.startedAt).toLocaleString() : "--/--/----"}</strong>
              </div>
              <div className="video-player-meta-pill">
                <span className="video-player-meta-label">Fin</span>
                <strong>{video?.endedAt ? new Date(video.endedAt).toLocaleString() : "00:00"}</strong>
              </div>
              <div className="video-player-meta-pill video-player-meta-pill-status">
                <span className="video-player-meta-label">Estado</span>
                <strong>Simulación</strong>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}