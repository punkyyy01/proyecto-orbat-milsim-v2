"use client"

import { useState, useTransition, useMemo } from "react"
import { toast } from "sonner"
import { Upload, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RANKS } from "@/constants"
import { importarMiembrosBulk } from "@/app/actions/personal"
import type { RangoMilitar } from "@/lib/types/database"
import type { EstructuraRegimiento } from "@/lib/supabase/queries"

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilaParsed {
  nombre_milsim: string
  rango: RangoMilitar | null
  rol: string | null
  escuadraNombre: string | null
  escuadra_id: string | null
  escuadraError: string | null
  error: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RANGOS_VALIDOS = new Set(RANKS.map((r) => r.code))

function buildEscuadraMap(estructura: EstructuraRegimiento[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const reg of estructura) {
    for (const comp of reg.companias) {
      for (const pel of comp.pelotones) {
        for (const esc of pel.escuadras) {
          map.set(esc.nombre.toLowerCase(), esc.id)
        }
      }
    }
  }
  return map
}

function parseLineas(raw: string, escuadraMap: Map<string, string>): FilaParsed[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const partes = line.split(",").map((p) => p.trim())
      const nombre_milsim = partes[0] ?? ""
      const rangoRaw = partes[1]?.toUpperCase() ?? ""
      const rol = partes[2] || null
      const escuadraNombreRaw = partes[3] || null

      if (!nombre_milsim) {
        return { nombre_milsim, rango: null, rol, escuadraNombre: escuadraNombreRaw, escuadra_id: null, escuadraError: null, error: "Nick requerido" }
      }
      if (!rangoRaw) {
        return { nombre_milsim, rango: null, rol, escuadraNombre: escuadraNombreRaw, escuadra_id: null, escuadraError: null, error: "Rango requerido" }
      }
      if (!RANGOS_VALIDOS.has(rangoRaw)) {
        return { nombre_milsim, rango: null, rol, escuadraNombre: escuadraNombreRaw, escuadra_id: null, escuadraError: null, error: `Rango inválido: ${rangoRaw}` }
      }

      let escuadra_id: string | null = null
      let escuadraError: string | null = null
      if (escuadraNombreRaw) {
        const found = escuadraMap.get(escuadraNombreRaw.toLowerCase())
        if (found) {
          escuadra_id = found
        } else {
          escuadraError = `Escuadra no encontrada: ${escuadraNombreRaw}`
        }
      }

      return {
        nombre_milsim,
        rango: rangoRaw as RangoMilitar,
        rol,
        escuadraNombre: escuadraNombreRaw,
        escuadra_id,
        escuadraError,
        error: null,
      }
    })
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const textareaClass =
  "min-h-[160px] font-mono text-sm bg-slate-900 border-white/10 text-slate-200 placeholder:text-slate-600 focus-visible:border-blue-500/50 focus-visible:ring-0 resize-none"

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  estructura: EstructuraRegimiento[]
}

export function BulkImportMiembrosDialog({ open, onOpenChange, estructura }: Props) {
  const [texto, setTexto] = useState("")
  const [pending, startTransition] = useTransition()

  const escuadraMap = useMemo(() => buildEscuadraMap(estructura), [estructura])

  const filas = texto.trim() ? parseLineas(texto, escuadraMap) : []
  const validas = filas.filter((f): f is FilaParsed & { rango: RangoMilitar } =>
    !f.error && f.rango !== null
  )
  const hayErrores = filas.some((f) => f.error || f.escuadraError)

  function handleClose() {
    if (pending) return
    setTexto("")
    onOpenChange(false)
  }

  function handleSubmit() {
    if (validas.length === 0) return
    startTransition(async () => {
      const result = await importarMiembrosBulk(
        validas.map((f) => ({
          nombre_milsim: f.nombre_milsim,
          rango: f.rango,
          rol: f.rol,
          escuadra_id: f.escuadra_id,
        }))
      )
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(
          `${result.insertados} operador${result.insertados !== 1 ? "es" : ""} importado${result.insertados !== 1 ? "s" : ""}`
        )
        handleClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl border flex flex-col max-h-[90vh]"
        style={{ background: "#111827", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-slate-100">Importar operadores en masa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Format hint */}
          <div
            className="rounded-lg px-3 py-2.5 text-xs text-slate-400 font-mono space-y-0.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-slate-500 mb-1 font-sans text-[11px] uppercase tracking-wider">Formato — una línea por operador</p>
            <p>
              <span className="text-blue-400">Nick</span>
              {", "}
              <span className="text-green-400">RANGO</span>
              {", "}
              <span className="text-slate-500">rol opcional</span>
              {", "}
              <span className="text-amber-400">escuadra opcional</span>
            </p>
            <p className="text-slate-600 mt-1">Ej: Ghost, SGT, Fusilero, HYDRA 1-1</p>
            <p className="text-slate-600">Rangos: GEN LTG MG BG COL LTC MAJ CPT 1LT 2LT CW5–WO1 CSM SGM MSG 1SG SFC SSG SGT CPL SPC PFC PV2 PVT</p>
            <p className="text-slate-600">Escuadra: nombre exacto (ej: &quot;HYDRA 1-1&quot;, no &quot;HYDRA&quot;)</p>
          </div>

          <Textarea
            className={textareaClass}
            placeholder={"Ghost, SGT, Fusilero, HYDRA 1-1\nDragon, CPL, , CHARLIE 1-2\nShadow, PVT"}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />

          {/* Preview */}
          {filas.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                Vista previa — {validas.length} válido{validas.length !== 1 ? "s" : ""} / {filas.length} total
              </p>
              <div
                className="rounded-lg overflow-y-auto divide-y text-sm max-h-64"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {filas.map((fila, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2"
                    style={{ background: fila.error ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.02)" }}
                  >
                    {fila.error ? (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    )}
                    <span className="text-slate-300 flex-1 truncate font-medium">{fila.nombre_milsim || "—"}</span>
                    <span className="font-mono text-xs text-green-400 w-14 shrink-0">{fila.rango ?? "—"}</span>
                    {fila.rol && (
                      <span className="text-slate-500 text-xs truncate max-w-[120px]">{fila.rol}</span>
                    )}
                    {fila.escuadraNombre && (
                      <span
                        className={`text-xs font-mono px-1.5 py-0.5 rounded shrink-0 ${
                          fila.escuadra_id
                            ? "text-amber-400 bg-amber-500/10"
                            : "text-red-400 bg-red-500/10"
                        }`}
                      >
                        {fila.escuadraNombre}
                      </span>
                    )}
                    {fila.error && (
                      <span className="text-red-400 text-xs shrink-0 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fila.error}
                      </span>
                    )}
                    {!fila.error && fila.escuadraError && (
                      <span className="text-amber-400 text-xs shrink-0 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fila.escuadraError}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-1">
            {hayErrores && (
              <p className="text-xs text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Las filas con error serán ignoradas; escuadras no encontradas se dejarán sin asignar
              </p>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-slate-200"
                onClick={handleClose}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
                onClick={handleSubmit}
                disabled={pending || validas.length === 0}
              >
                <Upload className="w-3.5 h-3.5" />
                {pending
                  ? "Importando…"
                  : `Importar ${validas.length > 0 ? validas.length : ""} operador${validas.length !== 1 ? "es" : ""}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
