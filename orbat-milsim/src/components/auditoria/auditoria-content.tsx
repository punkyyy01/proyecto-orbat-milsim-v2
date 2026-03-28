"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Search, X, Download, ChevronDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
  usuario?: string
  page?: string
}

export type AuditUsuario = {
  id: string
}

type Props = {
  logs: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
  filtros: AuditoriaFiltros
  usuarios: AuditUsuario[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABLAS = ["miembros", "escuadras", "pelotones", "companias", "regimientos", "app_roles"]
const ACCIONES = ["INSERT", "UPDATE", "DELETE"]

const FIELD_LABELS: Record<string, string> = {
  nombre_milsim: "nombre",
  rango: "rango",
  rol: "rol",
  escuadra_id: "escuadra",
  peloton_id: "pelotón",
  compania_id: "compañía",
  regimiento_id: "regimiento",
  nombre: "nombre",
  sigla: "sigla",
  role: "rol",
  email: "email",
  activo: "activo",
  estado: "estado",
}

const TABLA_LABELS: Record<string, string> = {
  miembros: "Miembro",
  escuadras: "Escuadra",
  pelotones: "Pelotón",
  companias: "Compañía",
  regimientos: "Regimiento",
  app_roles: "Rol",
}

// Fields to skip in the smart summary (noisy / technical)
const SUMMARY_IGNORED = new Set(["updated_at", "created_at", "id"])

// ─── Helpers ─────────────────────────────────────────────────────────────────

function accionBadgeClass(accion: string): string {
  switch (accion.toUpperCase()) {
    case "INSERT": return "bg-green-500/15 text-green-400 border-green-500/25"
    case "UPDATE": return "bg-amber-500/15 text-amber-400 border-amber-500/25"
    case "DELETE": return "bg-red-500/15 text-red-400 border-red-500/25"
    default:       return "bg-slate-500/15 text-slate-400 border-slate-500/25"
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
  const day    = d.getDate().toString().padStart(2, "0")
  const month  = months[d.getMonth()]
  const year   = d.getFullYear()
  const hh     = d.getHours().toString().padStart(2, "0")
  const mm     = d.getMinutes().toString().padStart(2, "0")
  return `${day} ${month} ${year}, ${hh}:${mm}`
}

function isObj(v: Json | null): v is Record<string, Json> {
  return !!v && typeof v === "object" && !Array.isArray(v)
}

function displayVal(v: Json | undefined): string {
  if (v === null || v === undefined) return "null"
  if (typeof v === "string") return v
  return String(v)
}

function resumen(entry: AuditLogEntry): string {
  const antes   = entry.datos_anteriores
  const despues = entry.datos_nuevos
  const accion  = entry.accion.toUpperCase()
  const tablaLabel = TABLA_LABELS[entry.tabla] ?? entry.tabla

  if (accion === "INSERT") {
    const obj = isObj(despues) ? despues : null
    const nombre = obj?.nombre_milsim ?? obj?.nombre ?? obj?.sigla ?? obj?.email ?? null
    return nombre ? `${tablaLabel} creado: ${nombre}` : `${tablaLabel} creado`
  }

  if (accion === "DELETE") {
    const obj = isObj(antes) ? antes : null
    const nombre = obj?.nombre_milsim ?? obj?.nombre ?? obj?.sigla ?? obj?.email ?? null
    return nombre ? `${tablaLabel} eliminado: ${nombre}` : `${tablaLabel} eliminado`
  }

  if (accion === "UPDATE") {
    if (isObj(antes) && isObj(despues)) {
      const a = antes as Record<string, Json>
      const d = despues as Record<string, Json>
      const changed = Object.keys({ ...a, ...d }).filter(
        k => !SUMMARY_IGNORED.has(k) && JSON.stringify(a[k] ?? null) !== JSON.stringify(d[k] ?? null)
      )
      if (changed.length === 0) return "Registro actualizado"

      const parts = changed.slice(0, 3).map(k => {
        const label = FIELD_LABELS[k] ?? k
        const vA = displayVal(a[k])
        const vD = displayVal(d[k])
        return `${label} de ${vA} a ${vD}`
      })
      const suffix = changed.length > 3 ? ` (+${changed.length - 3} más)` : ""
      return `Cambió ${parts.join(", ")}${suffix}`
    }
    return "Registro actualizado"
  }

  return entry.accion
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV(logs: AuditLogEntry[]) {
  const headers = ["Fecha", "Tabla", "Acción", "Usuario", "Registro ID", "Resumen"]
  const rows = logs.map(log => [
    formatDate(log.created_at),
    log.tabla,
    log.accion,
    log.usuario_id ?? "sistema",
    log.registro_id,
    resumen(log),
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n")

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Diff Viewer ─────────────────────────────────────────────────────────────

function DiffViewer({
  antes,
  despues,
}: {
  antes: Json | null
  despues: Json | null
}) {
  const [showAll, setShowAll] = useState(false)

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

  const a = isObj(antes)   ? (antes as Record<string, Json>)   : {}
  const d = isObj(despues) ? (despues as Record<string, Json>) : {}
  const allKeys = [...new Set([...Object.keys(a), ...Object.keys(d)])]

  const changedKeys   = allKeys.filter(k => JSON.stringify(a[k] ?? null) !== JSON.stringify(d[k] ?? null))
  const unchangedKeys = allKeys.filter(k => JSON.stringify(a[k] ?? null) === JSON.stringify(d[k] ?? null))
  const displayKeys   = showAll ? allKeys : changedKeys

  return (
    <div className="space-y-1 font-mono text-xs">
      {/* Header row */}
      <div
        className="grid grid-cols-[160px_1fr_1fr] gap-2 pb-1 mb-1"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <span className="text-slate-600 text-[10px] uppercase tracking-wider">Campo</span>
        <span className="text-red-400/60 text-[10px] uppercase tracking-wider">Anterior</span>
        <span className="text-green-400/60 text-[10px] uppercase tracking-wider">Nuevo</span>
      </div>

      {/* Changed + optionally unchanged rows */}
      <div className="max-h-80 overflow-y-auto space-y-0.5">
        {displayKeys.length === 0 && (
          <p className="text-slate-600 text-xs py-2">Sin campos para mostrar.</p>
        )}
        {displayKeys.map((key) => {
          const valA    = JSON.stringify(a[key] ?? null)
          const valD    = JSON.stringify(d[key] ?? null)
          const changed = valA !== valD
          const onlyInA = !(key in d)
          const onlyInD = !(key in a)

          return (
            <div
              key={key}
              className="grid grid-cols-[160px_1fr_1fr] gap-2 py-1 px-2 rounded"
              style={{ background: changed ? "rgba(234,179,8,0.06)" : "transparent" }}
            >
              <span className={changed ? "text-yellow-400/80" : "text-slate-600"}>
                {key}
              </span>
              {/* Anterior */}
              <span className={
                onlyInA
                  ? "text-red-400 line-through"
                  : changed
                    ? "text-red-400 line-through opacity-80"
                    : "text-slate-600"
              }>
                {onlyInD ? "—" : valA}
              </span>
              {/* Nuevo */}
              <span className={
                onlyInD
                  ? "text-green-400"
                  : changed
                    ? "text-green-400"
                    : "text-slate-600"
              }>
                {onlyInA ? "—" : valD}
              </span>
            </div>
          )
        })}
      </div>

      {/* Toggle unchanged */}
      {unchangedKeys.length > 0 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-white/5"
        >
          <ChevronDown
            className="w-3 h-3 transition-transform"
            style={{ transform: showAll ? "rotate(180deg)" : "rotate(0deg)" }}
          />
          {showAll
            ? `Ocultar ${unchangedKeys.length} campo${unchangedKeys.length !== 1 ? "s" : ""} sin cambios`
            : `Mostrar ${unchangedKeys.length} campo${unchangedKeys.length !== 1 ? "s" : ""} sin cambios`
          }
        </button>
      )}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function buildHref(base: AuditoriaFiltros, page: number): string {
  const params = new URLSearchParams()
  if (base.tabla)   params.set("tabla",   base.tabla)
  if (base.accion)  params.set("accion",  base.accion)
  if (base.desde)   params.set("desde",   base.desde)
  if (base.hasta)   params.set("hasta",   base.hasta)
  if (base.usuario) params.set("usuario", base.usuario)
  params.set("page", String(page))
  return `/auditoria?${params.toString()}`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AuditoriaContent({ logs, total, page, pageSize, filtros, usuarios }: Props) {
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const hasFilters = !!(filtros.tabla || filtros.accion || filtros.desde || filtros.hasta || filtros.usuario)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Auditoría</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total.toLocaleString("es-ES")} registro{total !== 1 ? "s" : ""} en total
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportCSV(logs)}
          disabled={logs.length === 0}
          className="h-9 gap-1.5 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-white/5"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <form method="GET" action="/auditoria" className="flex flex-wrap gap-2 items-end">
        {/* Tabla */}
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

        {/* Acción */}
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

        {/* Usuario */}
        {usuarios.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">Usuario</label>
            <select
              name="usuario"
              defaultValue={filtros.usuario ?? ""}
              className="h-9 rounded-lg border px-2.5 text-sm text-slate-200 bg-slate-900 border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.id.slice(0, 8)}…</option>
              ))}
            </select>
          </div>
        )}

        {/* Desde */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">Desde</label>
          <input
            type="date"
            name="desde"
            defaultValue={filtros.desde ?? ""}
            className="h-9 rounded-lg border px-2.5 text-sm text-slate-200 bg-slate-900 border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        {/* Hasta */}
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

        {/* Limpiar filtros — always visible */}
        <Link
          href="/auditoria"
          className={`h-9 flex items-center gap-1.5 px-3 rounded-lg text-sm border border-slate-700 transition-colors ${
            hasFilters
              ? "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              : "text-slate-700 pointer-events-none"
          }`}
        >
          <X className="w-3.5 h-3.5" />
          Limpiar filtros
        </Link>
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
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {log.usuario_id
                        ? <span className="font-mono">{log.usuario_id.slice(0, 8)}…</span>
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
                  <p>
                    <span className="text-slate-600">ID registro:</span>{" "}
                    <span className="font-mono">{selectedLog.registro_id}</span>
                  </p>
                  <p>
                    <span className="text-slate-600">Usuario:</span>{" "}
                    <span className="font-mono">{selectedLog.usuario_id ?? "sistema"}</span>
                  </p>
                  <p>
                    <span className="text-slate-600">Resumen:</span>{" "}
                    <span className="text-slate-300">{resumen(selectedLog)}</span>
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-mono text-slate-500 mb-3 uppercase tracking-wider">
                    Diff de cambios
                  </p>
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
