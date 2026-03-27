"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Json } from "@/lib/types/database"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditLogEntry = {
  id: string
  tabla: string
  registro_id: string
  accion: string
  datos_anteriores: Json | null
  datos_nuevos: Json | null
  usuario_id: string | null
  created_at: string
}

export type AuditoriaFiltros = {
  tabla?: string
  accion?: string
  desde?: string
  hasta?: string
  page?: string
}

type Props = {
  logs: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
  filtros: AuditoriaFiltros
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABLAS = ["miembros", "escuadras", "pelotones", "companias", "regimientos", "app_roles"]
const ACCIONES = ["INSERT", "UPDATE", "DELETE"]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function accionBadgeClass(accion: string): string {
  switch (accion.toUpperCase()) {
    case "INSERT": return "bg-green-500/15 text-green-400 border-green-500/25"
    case "UPDATE": return "bg-blue-500/15 text-blue-400 border-blue-500/25"
    case "DELETE": return "bg-red-500/15 text-red-400 border-red-500/25"
    default:       return "bg-slate-500/15 text-slate-400 border-slate-500/25"
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

function resumen(entry: AuditLogEntry): string {
  const antes = entry.datos_anteriores
  const despues = entry.datos_nuevos

  if (entry.accion.toUpperCase() === "INSERT") {
    const obj = despues && typeof despues === "object" && !Array.isArray(despues) ? despues as Record<string, Json> : null
    const nombre = obj?.nombre_milsim ?? obj?.nombre ?? obj?.sigla ?? null
    return nombre ? `Creado: ${nombre}` : "Nuevo registro"
  }

  if (entry.accion.toUpperCase() === "DELETE") {
    const obj = antes && typeof antes === "object" && !Array.isArray(antes) ? antes as Record<string, Json> : null
    const nombre = obj?.nombre_milsim ?? obj?.nombre ?? obj?.sigla ?? null
    return nombre ? `Eliminado: ${nombre}` : "Registro eliminado"
  }

  if (entry.accion.toUpperCase() === "UPDATE") {
    if (
      antes && despues &&
      typeof antes === "object" && !Array.isArray(antes) &&
      typeof despues === "object" && !Array.isArray(despues)
    ) {
      const a = antes as Record<string, Json>
      const d = despues as Record<string, Json>
      const cambiados = Object.keys({ ...a, ...d }).filter(
        (k) => JSON.stringify(a[k]) !== JSON.stringify(d[k])
      )
      if (cambiados.length > 0) {
        return `Cambios en: ${cambiados.slice(0, 3).join(", ")}${cambiados.length > 3 ? "…" : ""}`
      }
    }
    return "Registro actualizado"
  }

  return entry.accion
}

// ─── Diff Viewer ─────────────────────────────────────────────────────────────

function DiffViewer({
  antes,
  despues,
}: {
  antes: Json | null
  despues: Json | null
}) {
  const isObj = (v: Json | null): v is Record<string, Json> =>
    !!v && typeof v === "object" && !Array.isArray(v)

  if (!isObj(antes) && !isObj(despues)) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-mono text-slate-500 mb-2 uppercase tracking-wider">Anterior</p>
          <pre className="text-xs text-slate-300 bg-slate-900 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
            {antes === null ? "null" : JSON.stringify(antes, null, 2)}
          </pre>
        </div>
        <div>
          <p className="text-[11px] font-mono text-slate-500 mb-2 uppercase tracking-wider">Nuevo</p>
          <pre className="text-xs text-slate-300 bg-slate-900 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
            {despues === null ? "null" : JSON.stringify(despues, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  const a = isObj(antes) ? antes : {}
  const d = isObj(despues) ? despues : {}
  const allKeys = [...new Set([...Object.keys(a), ...Object.keys(d)])]

  return (
    <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
      <div className="grid grid-cols-[160px_1fr_1fr] gap-2 pb-1 border-b mb-1" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <span className="text-slate-600 text-[10px] uppercase tracking-wider">Campo</span>
        <span className="text-red-400/60 text-[10px] uppercase tracking-wider">Anterior</span>
        <span className="text-green-400/60 text-[10px] uppercase tracking-wider">Nuevo</span>
      </div>
      {allKeys.map((key) => {
        const valA = JSON.stringify(a[key] ?? null)
        const valD = JSON.stringify(d[key] ?? null)
        const changed = valA !== valD
        const onlyInA = !(key in d)
        const onlyInD = !(key in a)

        return (
          <div
            key={key}
            className="grid grid-cols-[160px_1fr_1fr] gap-2 py-1 px-2 rounded"
            style={{ background: changed ? "rgba(234,179,8,0.05)" : "transparent" }}
          >
            <span className={changed ? "text-yellow-400/80" : "text-slate-500"}>
              {key}
            </span>
            <span className={onlyInA ? "text-red-400 line-through" : changed ? "text-red-400/70" : "text-slate-400"}>
              {onlyInD ? "—" : valA}
            </span>
            <span className={onlyInD ? "text-green-400" : changed ? "text-green-400/70" : "text-slate-400"}>
              {onlyInA ? "—" : valD}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function buildHref(base: AuditoriaFiltros, page: number): string {
  const params = new URLSearchParams()
  if (base.tabla)  params.set("tabla", base.tabla)
  if (base.accion) params.set("accion", base.accion)
  if (base.desde)  params.set("desde", base.desde)
  if (base.hasta)  params.set("hasta", base.hasta)
  params.set("page", String(page))
  return `/auditoria?${params.toString()}`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AuditoriaContent({ logs, total, page, pageSize, filtros }: Props) {
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Auditoría</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {total.toLocaleString("es-ES")} registro{total !== 1 ? "s" : ""} en total
        </p>
      </div>

      {/* Filters */}
      <form method="GET" action="/auditoria" className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">Tabla</label>
          <select
            name="tabla"
            defaultValue={filtros.tabla ?? ""}
            className="h-9 rounded-lg border px-2.5 text-sm text-slate-200 bg-slate-900 border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="">Todas</option>
            {TABLAS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">Acción</label>
          <select
            name="accion"
            defaultValue={filtros.accion ?? ""}
            className="h-9 rounded-lg border px-2.5 text-sm text-slate-200 bg-slate-900 border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="">Todas</option>
            {ACCIONES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">Desde</label>
          <input
            type="date"
            name="desde"
            defaultValue={filtros.desde ?? ""}
            className="h-9 rounded-lg border px-2.5 text-sm text-slate-200 bg-slate-900 border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">Hasta</label>
          <input
            type="date"
            name="hasta"
            defaultValue={filtros.hasta ?? ""}
            className="h-9 rounded-lg border px-2.5 text-sm text-slate-200 bg-slate-900 border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        <Button
          type="submit"
          size="sm"
          className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Search className="w-3.5 h-3.5" />
          Filtrar
        </Button>

        {(filtros.tabla || filtros.accion || filtros.desde || filtros.hasta) && (
          <Link
            href="/auditoria"
            className="h-9 flex items-center gap-1.5 px-3 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar
          </Link>
        )}
      </form>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Fecha / Hora", "Tabla", "Acción", "Usuario", "Resumen"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500 text-sm">
                    Sin registros de auditoría para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                    style={{
                      borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined,
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {log.tabla}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono font-semibold uppercase tracking-wider ${accionBadgeClass(log.accion)}`}
                      >
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {log.usuario_id
                        ? log.usuario_id.slice(0, 8) + "…"
                        : <span className="text-slate-700">sistema</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">
                      {resumen(log)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            {page > 1 ? (
              <Link
                href={buildHref(filtros, page - 1)}
                className="flex items-center gap-1 px-3 h-8 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-slate-700 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 h-8 rounded-lg text-sm text-slate-700 border border-slate-800 cursor-not-allowed">
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </span>
            )}
            {page < totalPages ? (
              <Link
                href={buildHref(filtros, page + 1)}
                className="flex items-center gap-1 px-3 h-8 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-slate-700 transition-colors"
              >
                Siguiente
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 h-8 rounded-lg text-sm text-slate-700 border border-slate-800 cursor-not-allowed">
                Siguiente
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Diff Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent
          className="max-w-3xl border"
          style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.1)" }}
        >
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-slate-100">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono font-semibold uppercase tracking-wider ${accionBadgeClass(selectedLog.accion)}`}
                  >
                    {selectedLog.accion}
                  </span>
                  <span className="font-mono text-sm text-slate-400">{selectedLog.tabla}</span>
                  <span className="text-xs text-slate-600 font-normal">
                    {formatDate(selectedLog.created_at)}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="text-xs text-slate-500 space-y-0.5">
                  <p><span className="text-slate-600">ID registro:</span> <span className="font-mono">{selectedLog.registro_id}</span></p>
                  <p><span className="text-slate-600">Usuario:</span> <span className="font-mono">{selectedLog.usuario_id ?? "sistema"}</span></p>
                </div>

                <div>
                  <p className="text-[11px] font-mono text-slate-500 mb-3 uppercase tracking-wider">Diff de cambios</p>
                  <DiffViewer
                    antes={selectedLog.datos_anteriores}
                    despues={selectedLog.datos_nuevos}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
