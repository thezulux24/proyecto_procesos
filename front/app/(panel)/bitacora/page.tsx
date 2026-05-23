"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ServiceLog = {
  id: number;
  startTime: string;
  endTime?: string | null;
  origin?: string | null;
  destination?: string | null;
  serviceStatus: string;
  device?: { id: number; name: string; code?: string } | null;
  operator?: { id: number; fullName?: string } | null;
  reservation?: { id: number } | null;
  notes?: string | null;
};

function fmt(date?: string | null) {
  if (!date) return "Pendiente";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));
}

export default function Page() {
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [devicesCount, setDevicesCount] = useState({ available: 0, occupied: 0 });
  const [reservationsCount, setReservationsCount] = useState({ pending: 0, delivered: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState("");
  // PDF preview removed; only download supported now
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedLog, setSelectedLog] = useState<ServiceLog | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const token = localStorage.getItem("auth_token") ?? "";
        const res = await fetch(`${API_URL}/service-logs?includeInactive=true`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Error cargando bitácora");
        const data = (await res.json()) as ServiceLog[];
        if (mounted) setLogs(data);
        // also load devices and reservations counts (non-blocking)
        try {
          const [devRes, resRes] = await Promise.all([
            fetch(`${API_URL}/devices?includeInactive=true`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_URL}/reservations?includeInactive=true`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (devRes.ok) {
            const devData = await devRes.json();
            const available = devData.filter((d: any) => d.status === "AVAILABLE" && d.active).length;
            const occupied = devData.filter((d: any) => (d.status === "RESERVED" || d.status === "IN_SERVICE") && d.active).length;
            if (mounted) setDevicesCount({ available, occupied });
          }
          if (resRes.ok) {
            const resData = await resRes.json();
            const delivered = resData.filter((r: any) => r.status === "COMPLETED" && r.active).length;
            const pending = resData.filter((r: any) => r.status !== "COMPLETED" && r.status !== "CANCELLED" && r.active).length;
            if (mounted) setReservationsCount({ pending, delivered });
          }
        } catch (err) {
          // ignore counting errors; keep primary logs shown
        }
      } catch (err) {
        if (mounted) setError((err as Error).message || "Error");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((l) => (filterDate ? l.startTime.slice(0, 10) === filterDate : true));
  }, [logs, filterDate]);

  async function exportPdf(preview = false) {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = (autoTableModule && (autoTableModule as any).default) || autoTableModule;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFontSize(12);
      const nowLabel = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date());

      if (selectedLog) {
        // Single record detailed PDF
        doc.text("Servicio - Bitácora", 40, 40);
        doc.setFontSize(10);
        doc.text(`Generado: ${nowLabel}`, 40, 56);

        const rows = [
          ["ID", String(selectedLog.id)],
          ["Hora de salida", fmt(selectedLog.startTime)],
          ["Hora de regreso", fmt(selectedLog.endTime ?? null)],
          ["Dispositivo", selectedLog.device ? `${selectedLog.device.name}${selectedLog.device.code ? ` (${selectedLog.device.code})` : ""}` : "-"],
          ["Operador", selectedLog.operator?.fullName ?? "-"],
          ["Reserva", selectedLog.reservation ? `#${selectedLog.reservation.id}` : "-"],
          ["Estado", selectedLog.serviceStatus === "IN_PROGRESS" ? "En progreso" : selectedLog.serviceStatus === "COMPLETED" ? "Completado" : selectedLog.serviceStatus],
        ];

        // call autoTable plugin
        (autoTable as any)(doc, { head: [["Campo", "Valor"]], body: rows, startY: 84, margin: { left: 40, right: 40 }, styles: { fontSize: 10 } });

        // notes below table
        const afterY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 200;
        if (selectedLog.notes) {
          doc.setFontSize(10);
          doc.text("Observaciones:", 40, afterY);
          doc.setFontSize(9);
          const split = (doc as any).splitTextToSize(selectedLog.notes || "", 500);
          doc.text(split, 40, afterY + 14);
        }
      } else {
        // Full table export for filtered logs
        doc.text("Bitácora de servicios", 40, 40);
        doc.setFontSize(10);
        doc.text(`Generado: ${nowLabel}`, 40, 56);

        const head = [["ID", "Salida", "Regreso", "Dispositivo", "Operador", "Reserva", "Estado"]];
        const body = filtered.map((it) => [
          String(it.id),
          fmt(it.startTime),
          fmt(it.endTime ?? null),
          it.device ? `${it.device.name}${it.device.code ? ` (${it.device.code})` : ""}` : "-",
          it.operator?.fullName ?? "-",
          it.reservation ? `#${it.reservation.id}` : "-",
          it.serviceStatus === "IN_PROGRESS" ? "En progreso" : it.serviceStatus === "COMPLETED" ? "Completado" : it.serviceStatus,
        ]);

        // call autoTable plugin for full table
        (autoTable as any)(doc, { head, body, startY: 80, margin: { left: 40, right: 40 }, styles: { fontSize: 9 } });
      }

      // create blob and download
      const blob = (doc as any).output && typeof (doc as any).output === "function" ? (doc as any).output("blob") : null;
      const filename = `bitacora-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.pdf`;
      if (blob instanceof Blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        try {
          URL.revokeObjectURL(url);
        } catch {}
      } else {
        // fallback to save
        doc.save(filename);
      }
    } catch (err) {
      // graceful fallback: open print dialog
      // eslint-disable-next-line no-console
      console.error(err);
      window.print();
    }
  }

  // downloadPdf removed; use exportPdf() directly to generate+download

  async function fetchLogDetail(id: number) {
    setSelectedId(id);
    setSelectedLog(null);
    try {
      const token = localStorage.getItem("auth_token") ?? "";
      const res = await fetch(`${API_URL}/service-logs/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("No fue posible cargar el registro");
      const data = (await res.json()) as ServiceLog;
      setSelectedLog(data);
    } catch (err) {
      setError((err as Error).message || "Error");
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "#6b7f95", textTransform: "uppercase", letterSpacing: "0.05em" }}>Bitácora</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Registro de servicios</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginLeft: 20 }}>
          <div style={{ background: "#f4f8ff", padding: 12, borderRadius: 8, minWidth: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#30475e", marginBottom: 6 }}>Dispositivos disponibles</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{devicesCount.available}</div>
          </div>
          <div style={{ background: "#fff7f0", padding: 12, borderRadius: 8, minWidth: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#7a4b00", marginBottom: 6 }}>Dispositivos ocupados</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{devicesCount.occupied}</div>
          </div>
          <div style={{ background: "#f0fff7", padding: 12, borderRadius: 8, minWidth: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#165a2b", marginBottom: 6 }}>Reservas pendientes</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{reservationsCount.pending}</div>
          </div>
          <div style={{ background: "#f7f7ff", padding: 12, borderRadius: 8, minWidth: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#2b2f77", marginBottom: 6 }}>Reservas entregadas</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{reservationsCount.delivered}</div>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input
            style={{ height: 34, padding: "6px 8px", borderRadius: 6, border: "1px solid #e6eefc" }}
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <button onClick={() => void exportPdf(false)} style={{ background: "#0f3f8e", color: "#fff", border: 0, padding: "8px 12px", borderRadius: 6 }}>
            Descargar PDF
          </button>
        </div>
      </div>

      {error ? <div style={{ color: "#a82424" }}>{error}</div> : null}
      {loading ? <div>Cargando...</div> : null}

      <div style={{ display: "block" }}>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eef5fb" }}>
                <th style={{ padding: "8px 6px" }}>#</th>
                <th style={{ padding: "8px 6px" }}>Salida</th>
                <th style={{ padding: "8px 6px" }}>Regreso</th>
                <th style={{ padding: "8px 6px" }}>Dispositivo</th>
                <th style={{ padding: "8px 6px" }}>Operador</th>
                <th style={{ padding: "8px 6px" }}>Reserva</th>
                <th style={{ padding: "8px 6px" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => void fetchLogDetail(r.id)}
                  style={{
                    borderBottom: "1px solid #f4f7fb",
                    cursor: "pointer",
                    background: selectedId === r.id ? "#eef6ff" : undefined,
                  }}
                >
                  <td style={{ padding: "10px 6px", width: 48 }}>{r.id}</td>
                  <td style={{ padding: "10px 6px", width: 160 }}>{fmt(r.startTime)}</td>
                  <td style={{ padding: "10px 6px", width: 160 }}>{fmt(r.endTime ?? null)}</td>
                  <td style={{ padding: "10px 6px" }}>{r.device ? `${r.device.name}${r.device.code ? ` (${r.device.code})` : ""}` : "-"}</td>
                  <td style={{ padding: "10px 6px" }}>{r.operator?.fullName ?? "-"}</td>
                  <td style={{ padding: "10px 6px", width: 90 }}>{r.reservation ? `#${r.reservation.id}` : "-"}</td>
                  <td style={{ padding: "10px 6px", width: 120 }}>{r.serviceStatus === "IN_PROGRESS" ? "En progreso" : r.serviceStatus === "COMPLETED" ? "Completado" : r.serviceStatus}</td>
                </tr>
              ))}
              {filtered.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 12, color: "#6b7f95" }}>
                    No hay registros para los filtros seleccionados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
