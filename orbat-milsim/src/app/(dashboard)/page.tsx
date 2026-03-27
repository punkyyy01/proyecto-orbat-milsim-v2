import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Users, AlertTriangle, Clock, BarChart2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Panel de Control" }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function accionColor(accion: string): string {
  switch (accion.toUpperCase()) {
    case "INSERT": return "#4ade80"
    case "UPDATE": return "#60a5fa"
    case "DELETE": return "#f87171"
    default:       return "#94a3b8"
  }
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(min / 60)
  const d    = Math.floor(h / 24)
  if (d > 0)  return `hace ${d}d`
  if (h > 0)  return `hace ${h}h`
  if (min > 0) return `hace ${min}m`
  return "justo ahora"
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardHomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // ── Queries en paralelo ────────────────────────────────────────────────────
  const [
    { count: totalActivos },
    { data: miembrosConCompania },
    { data: recentLogs },
    { data: todasEscuadras },
    { data: miembrosEnEscuadra },
  ] = await Promise.all([
    // Total operadores activos
    supabase.from("miembros").select("*", { count: "exact", head: true }).eq("activo", true),
    // Miembros activos con compania_id para el chart
    supabase.from("miembros").select("compania_id, companias(nombre)").eq("activo", true).not("compania_id", "is", null),
    // Últimos 5 cambios del audit_log
    supabase.from("audit_log").select("id, tabla, accion, created_at, datos_nuevos, datos_anteriores").order("created_at", { ascending: false }).limit(5),
    // Escuadras con su capacidad
    supabase.from("escuadras").select("id, nombre, max_miembros, pelotones(nombre, companias(nombre))"),
    // Miembros activos con escuadra asignada
    supabase.from("miembros").select("escuadra_id").eq("activo", true).not("escuadra_id", "is", null),
  ])

  // ── Operadores por compañía ────────────────────────────────────────────────
  type CompaniaRow = { compania_id: string | null; companias: { nombre: string } | null }
  const companiaMap = new Map<string, { nombre: string; count: number }>()
  for (const row of (miembrosConCompania ?? []) as CompaniaRow[]) {
    if (!row.compania_id || !row.companias) continue
    const existing = companiaMap.get(row.compania_id)
    if (existing) {
      existing.count++
    } else {
      companiaMap.set(row.compania_id, { nombre: row.companias.nombre, count: 1 })
    }
  }
  const statsPorCompania = Array.from(companiaMap.values()).sort((a, b) => b.count - a.count)
  const maxCompaniaCount = Math.max(...statsPorCompania.map((c) => c.count), 1)

  // ── Escuadras al límite ────────────────────────────────────────────────────
  const conteoPorEscuadra = new Map<string, number>()
  for (const m of miembrosEnEscuadra ?? []) {
    const id = (m as { escuadra_id: string }).escuadra_id
    conteoPorEscuadra.set(id, (conteoPorEscuadra.get(id) ?? 0) + 1)
  }

  type EscuadraRow = {
    id: string
    nombre: string
    max_miembros: number
    pelotones: { nombre: string; companias: { nombre: string } | null } | null
  }
  const escuadrasAlLimite = ((todasEscuadras ?? []) as EscuadraRow[]).filter(
    (e) => (conteoPorEscuadra.get(e.id) ?? 0) >= e.max_miembros
  )

  // ── Resumen de log entry ───────────────────────────────────────────────────
  function logLabel(entry: { tabla: string; accion: string; datos_nuevos: unknown; datos_anteriores: unknown }): string {
    const obj = (entry.datos_nuevos ?? entry.datos_anteriores) as Record<string, unknown> | null
    const nombre = obj?.nombre_milsim ?? obj?.nombre ?? obj?.sigla ?? null
    if (nombre) return `${entry.tabla} — ${nombre}`
    return entry.tabla
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Panel de Control</h1>
        <p className="text-sm text-slate-500 mt-0.5">Resumen general de la unidad</p>
      </div>

      {/* ── Stats cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total activos */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Operadores activos</p>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-4xl font-bold font-mono tabular-nums text-slate-100">{totalActivos ?? 0}</p>
          <p className="text-xs text-slate-600 mt-1">efectivos en servicio</p>
        </div>

        {/* Escuadras al límite */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Escuadras al límite</p>
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-4xl font-bold font-mono tabular-nums text-slate-100">{escuadrasAlLimite.length}</p>
          <p className="text-xs text-slate-600 mt-1">con capacidad máxima alcanzada</p>
        </div>

        {/* Total compañías */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Compañías activas</p>
            <BarChart2 className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-4xl font-bold font-mono tabular-nums text-slate-100">{statsPorCompania.length}</p>
          <p className="text-xs text-slate-600 mt-1">con efectivos asignados</p>
        </div>
      </div>

      {/* ── Operators by company + Recent changes ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mini bar chart */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-4">Operadores por compañía</p>
          {statsPorCompania.length === 0 ? (
            <p className="text-sm text-slate-600 italic">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {statsPorCompania.map((comp) => (
                <div key={comp.nombre}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-300 truncate max-w-[70%]">{comp.nombre}</span>
                    <span className="text-xs font-mono tabular-nums text-slate-400">{comp.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((comp.count / maxCompaniaCount) * 100)}%`,
                        background: "#3b82f6",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent audit changes */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Últimos cambios</p>
            <Clock className="w-3.5 h-3.5 text-slate-600" />
          </div>
          {(recentLogs ?? []).length === 0 ? (
            <p className="text-sm text-slate-600 italic">Sin actividad reciente</p>
          ) : (
            <div className="space-y-3">
              {(recentLogs ?? []).map((log) => (
                <div key={log.id} className="flex items-center gap-3">
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      color: accionColor(log.accion),
                      background: `${accionColor(log.accion)}18`,
                    }}
                  >
                    {log.accion.toUpperCase().slice(0, 3)}
                  </span>
                  <span className="text-xs text-slate-400 truncate flex-1">
                    {logLabel(log)}
                  </span>
                  <span className="text-[11px] text-slate-600 shrink-0 font-mono">
                    {formatRelative(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/auditoria"
            className="mt-4 block text-[11px] text-blue-400/70 hover:text-blue-400 transition-colors font-mono"
          >
            Ver auditoría completa →
          </Link>
        </div>
      </div>

      {/* ── Squads at capacity ────────────────────────────────────────────── */}
      {escuadrasAlLimite.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-3">
            Escuadras al límite de capacidad
          </p>
          <div className="flex flex-wrap gap-2">
            {escuadrasAlLimite.map((e) => {
              const count = conteoPorEscuadra.get(e.id) ?? 0
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                  style={{ background: "rgba(234,179,8,0.06)", borderColor: "rgba(234,179,8,0.2)" }}
                >
                  <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" />
                  <span className="text-xs text-slate-300">{e.nombre}</span>
                  <span className="text-[11px] font-mono text-yellow-500/80">
                    {count}/{e.max_miembros}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
