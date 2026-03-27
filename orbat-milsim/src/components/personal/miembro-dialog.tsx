"use client"

import { useState, useTransition, useMemo, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Pencil, Plus, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { RANKS_BY_CATEGORY } from "@/constants"
import { crearMiembro, actualizarMiembro, checkNickExiste, getCursosCompletadosMiembro } from "@/app/actions/personal"
import type { MiembroRow, CursoRow } from "@/lib/types/database"
import type { EstructuraRegimiento } from "@/lib/supabase/queries"

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { key: "officer"  as const, label: "Oficiales" },
  { key: "warrant"  as const, label: "Warrant Officers" },
  { key: "nco"      as const, label: "Suboficiales" },
  { key: "enlisted" as const, label: "Tropa" },
]

const ROLES_COMUNES = [
  "Fusilero",
  "Médico",
  "Tirador",
  "Operador AT",
  "Granadero",
  "Líder de equipo",
  "Líder de escuadra",
  "Oficial al mando",
  "Operador de radio",
  "Francotirador",
  "Zapador",
]

// ─── Cascade helpers ──────────────────────────────────────────────────────────

/** Dado un miembro, retorna los IDs de compañía, pelotón y escuadra */
function detectCascadeIds(
  m: MiembroRow | undefined,
  estructura: EstructuraRegimiento[]
): { companiaId: string; pelotonId: string; escuadraId: string } {
  if (!m) return { companiaId: "", pelotonId: "", escuadraId: "" }

  for (const reg of estructura) {
    for (const comp of reg.companias) {
      if (m.compania_id === comp.id && !m.peloton_id && !m.escuadra_id) {
        return { companiaId: comp.id, pelotonId: "", escuadraId: "" }
      }
      for (const pel of comp.pelotones) {
        if (m.peloton_id === pel.id && !m.escuadra_id) {
          return { companiaId: comp.id, pelotonId: pel.id, escuadraId: "" }
        }
        for (const esc of pel.escuadras) {
          if (m.escuadra_id === esc.id) {
            return { companiaId: comp.id, pelotonId: pel.id, escuadraId: esc.id }
          }
        }
      }
    }
  }
  return { companiaId: "", pelotonId: "", escuadraId: "" }
}

// ─── Form ────────────────────────────────────────────────────────────────────

interface FormProps {
  miembro?: MiembroRow
  cursosCompletados?: string[]
  estructura: EstructuraRegimiento[]
  cursos: CursoRow[]
  /** Conteo de miembros activos por escuadra_id */
  escuadraConteos?: Record<string, number>
  onClose: () => void
}

function MiembroForm({
  miembro,
  cursosCompletados = [],
  estructura,
  cursos,
  escuadraConteos = {},
  onClose,
}: FormProps) {
  const isEdit = !!miembro
  const [pending, startTransition] = useTransition()
  const submitModeRef = useRef<"close" | "another">("close")

  // ── Identidad ────────────────────────────────────────────────────────────────
  const [nombre, setNombre] = useState(
    miembro !== undefined ? miembro.nombre_milsim : ""
  )
  const [rango, setRango] = useState<string>(
    miembro !== undefined ? miembro.rango : "PVT"
  )
  const [rol, setRol] = useState<string>(
    miembro !== undefined ? (miembro.rol ?? "") : "Fusilero"
  )
  const [discordId, setDiscordId] = useState(miembro?.discord_id ?? "")
  const [steamId, setSteamId] = useState(miembro?.steam_id ?? "")
  const [activo, setActivo] = useState(miembro?.activo ?? true)
  const [notas, setNotas] = useState(miembro?.notas_admin ?? "")

  // ── Nick validation ──────────────────────────────────────────────────────────
  const [nickExists, setNickExists] = useState(false)
  const [checkingNick, setCheckingNick] = useState(false)
  const nickCheckTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function handleNombreChange(value: string) {
    setNombre(value)
    clearTimeout(nickCheckTimerRef.current)
    const trimmed = value.trim()
    // No check needed if empty or same as current member's nick
    if (!trimmed || trimmed.toLowerCase() === miembro?.nombre_milsim.toLowerCase()) {
      setNickExists(false)
      setCheckingNick(false)
      return
    }
    setCheckingNick(true)
    nickCheckTimerRef.current = setTimeout(async () => {
      const result = await checkNickExiste(trimmed, miembro?.id)
      setNickExists(result.existe)
      setCheckingNick(false)
    }, 500)
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(nickCheckTimerRef.current)
  }, [])

  // ── Cascade assignment ───────────────────────────────────────────────────────
  const initialCascade = useMemo(
    () => detectCascadeIds(miembro, estructura),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const [companiaId, setCompaniaId] = useState(initialCascade.companiaId)
  const [pelotonId, setPelotonId] = useState(initialCascade.pelotonId)
  const [escuadraId, setEscuadraId] = useState(initialCascade.escuadraId)

  function handleCompaniaChange(val: string) {
    setCompaniaId(val)
    setPelotonId("")
    setEscuadraId("")
  }
  function handlePelotonChange(val: string) {
    setPelotonId(val)
    setEscuadraId("")
  }

  const todasCompanias = useMemo(
    () => estructura.flatMap((r) => r.companias),
    [estructura]
  )
  const compSeleccionada = todasCompanias.find((c) => c.id === companiaId)
  const pelotones = compSeleccionada?.pelotones ?? []
  const pelSeleccionado = pelotones.find((p) => p.id === pelotonId)
  const escuadras = pelSeleccionado?.escuadras ?? []

  // ── Cursos ───────────────────────────────────────────────────────────────────
  const [cursosSeleccionados, setCursosSeleccionados] = useState<Set<string>>(
    () => new Set(cursosCompletados)
  )
  function toggleCurso(id: string) {
    setCursosSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null)

  // ── Submit ───────────────────────────────────────────────────────────────────
  function resetForm() {
    setNombre("")
    setRango("PVT")
    setRol("Fusilero")
    setDiscordId("")
    setSteamId("")
    setNotas("")
    setCursosSeleccionados(new Set())
    setNickExists(false)
    setError(null)
    // Keep cascade selection so admin can quickly add another to same unit
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Derive nivel + unidadId from cascade
    let nivel = ""
    let unidadId = ""
    if (escuadraId) {
      nivel = "escuadra"
      unidadId = escuadraId
    } else if (pelotonId) {
      nivel = "peloton"
      unidadId = pelotonId
    } else if (companiaId) {
      nivel = "compania"
      unidadId = companiaId
    }

    const fd = new FormData()
    fd.set("nombre_milsim", nombre)
    fd.set("rango", rango)
    fd.set("rol", rol)
    fd.set("discord_id", discordId)
    fd.set("steam_id", steamId)
    fd.set("activo", String(activo))
    fd.set("notas_admin", notas)
    fd.set("nivel", nivel)
    fd.set("unidad_id", unidadId)
    fd.set("cursos", Array.from(cursosSeleccionados).join(","))

    const keepOpen = submitModeRef.current === "another"

    startTransition(async () => {
      const result = isEdit
        ? await actualizarMiembro(miembro!.id, fd)
        : await crearMiembro(fd)

      if ("error" in result) {
        setError(result.error)
      } else {
        toast.success(isEdit ? "Operador actualizado" : "Operador creado")
        if (keepOpen && !isEdit) {
          resetForm()
        } else {
          onClose()
        }
      }
    })
  }

  const inputClass =
    "bg-slate-900 border-white/10 text-slate-200 placeholder:text-slate-600 focus-visible:border-blue-500/50 focus-visible:ring-0"
  const labelClass = "text-slate-300 text-sm font-medium"
  const sectionClass = "text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase"

  const submitDisabled = pending || !nombre.trim() || !rango || nickExists

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 pb-6">
      {/* ── Identidad ──────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={sectionClass}>Identidad</p>

        {/* Nick milsim */}
        <div className="space-y-1.5">
          <Label htmlFor="nombre_milsim" className={labelClass}>
            Nick milsim <span className="text-red-400">*</span>
          </Label>
          <div className="relative">
            <Input
              id="nombre_milsim"
              value={nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              placeholder="e.g. Ghost"
              required
              className={inputClass}
            />
            {checkingNick && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 animate-spin" />
            )}
          </div>
          {nickExists && (
            <p className="text-xs text-yellow-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Este nick ya está registrado
            </p>
          )}
        </div>

        {/* Rango */}
        <div className="space-y-1.5">
          <Label className={labelClass}>
            Rango <span className="text-red-400">*</span>
          </Label>
          <Select value={rango} onValueChange={setRango} required>
            <SelectTrigger className={`${inputClass} focus:ring-0`}>
              <SelectValue placeholder="Seleccionar rango…" />
            </SelectTrigger>
            <SelectContent
              className="border max-h-72"
              style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.1)" }}
            >
              {CATEGORIAS.map(({ key, label }) => (
                <SelectGroup key={key}>
                  <SelectLabel className="text-slate-500 text-[10px] uppercase tracking-wider">
                    {label}
                  </SelectLabel>
                  {RANKS_BY_CATEGORY[key].map((r) => (
                    <SelectItem key={r.code} value={r.code} className="text-slate-200">
                      <span className="font-mono text-xs text-slate-400 mr-1.5">{r.code}</span>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rol */}
        <div className="space-y-1.5">
          <Label htmlFor="rol" className={labelClass}>
            Rol / Especialidad
          </Label>
          <Input
            id="rol"
            list="rol-suggestions"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            placeholder="e.g. Médico, Fusilero…"
            className={inputClass}
          />
          <datalist id="rol-suggestions">
            {ROLES_COMUNES.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
      </div>

      <Separator style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* ── Cuentas externas ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={sectionClass}>Cuentas externas</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="discord_id" className={labelClass}>Discord ID</Label>
            <Input
              id="discord_id"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              placeholder="123456789…"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="steam_id" className={labelClass}>Steam ID</Label>
            <Input
              id="steam_id"
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="7656119…"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <Separator style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* ── Asignación (cascada) ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={sectionClass}>Asignación de unidad</p>

        {/* Compañía */}
        <div className="space-y-1.5">
          <Label className={labelClass}>Compañía</Label>
          <Select value={companiaId || "__none__"} onValueChange={(v) => handleCompaniaChange(v === "__none__" ? "" : v)}>
            <SelectTrigger className={`${inputClass} focus:ring-0`}>
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent className="border" style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.1)" }}>
              <SelectItem value="__none__" className="text-slate-400">
                Sin asignar
              </SelectItem>
              {todasCompanias.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-slate-200">
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pelotón (solo si hay compañía seleccionada) */}
        {companiaId && pelotones.length > 0 && (
          <div className="space-y-1.5">
            <Label className={labelClass}>Pelotón</Label>
            <Select value={pelotonId || "__comp__"} onValueChange={(v) => handlePelotonChange(v === "__comp__" ? "" : v)}>
              <SelectTrigger className={`${inputClass} focus:ring-0`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border" style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.1)" }}>
                <SelectItem value="__comp__" className="text-slate-400">
                  Asignar a {compSeleccionada?.nombre} directamente
                </SelectItem>
                {pelotones.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-slate-200">
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Escuadra (solo si hay pelotón seleccionado) */}
        {pelotonId && escuadras.length > 0 && (
          <div className="space-y-1.5">
            <Label className={labelClass}>Escuadra</Label>
            <Select value={escuadraId || "__plt__"} onValueChange={(v) => setEscuadraId(v === "__plt__" ? "" : v)}>
              <SelectTrigger className={`${inputClass} focus:ring-0`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border" style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.1)" }}>
                <SelectItem value="__plt__" className="text-slate-400">
                  Asignar a {pelSeleccionado?.nombre} directamente
                </SelectItem>
                {escuadras.map((e) => {
                  const ocupados = escuadraConteos[e.id] ?? 0
                  const libre = e.max_miembros - ocupados
                  const llena = libre <= 0
                  return (
                    <SelectItem key={e.id} value={e.id} className="text-slate-200">
                      <span className="flex items-center gap-2">
                        <span>{e.nombre}</span>
                        <span className={`text-[11px] font-mono ${llena ? "text-red-400" : "text-slate-500"}`}>
                          {ocupados}/{e.max_miembros}
                          {llena ? " · llena" : libre === 1 ? " · 1 libre" : ` · ${libre} libres`}
                        </span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Warning: sin unidades */}
        {companiaId && pelotones.length === 0 && (
          <p className="text-xs text-amber-400/80">
            Esta compañía no tiene pelotones registrados aún.
          </p>
        )}
        {pelotonId && escuadras.length === 0 && (
          <p className="text-xs text-amber-400/80">
            Este pelotón no tiene escuadras registradas aún.
          </p>
        )}
      </div>

      <Separator style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* ── Cursos ─────────────────────────────────────────────────────────── */}
      {cursos.length > 0 && (
        <>
          <div className="space-y-3">
            <p className={sectionClass}>
              Cursos completados{" "}
              {cursosSeleccionados.size > 0 && (
                <span className="text-blue-400 normal-case">({cursosSeleccionados.size})</span>
              )}
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
              {cursos.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <Checkbox
                    checked={cursosSeleccionados.has(c.id)}
                    onCheckedChange={() => toggleCurso(c.id)}
                    className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-blue-400 mr-2">{c.sigla}</span>
                    <span className="text-slate-300 text-sm">{c.nombre}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <Separator style={{ background: "rgba(255,255,255,0.06)" }} />
        </>
      )}

      {/* ── Notas admin ────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="notas_admin" className={labelClass}>Notas de administración</Label>
        <Textarea
          id="notas_admin"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Notas internas visibles solo para admins…"
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* ── Estado activo ──────────────────────────────────────────────────── */}
      <label className="flex items-center gap-3 cursor-pointer">
        <Checkbox
          checked={activo}
          onCheckedChange={(checked) => setActivo(checked === true)}
          className="border-white/20 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
        />
        <div>
          <span className="text-slate-200 text-sm font-medium">Operador activo</span>
          <p className="text-slate-500 text-xs">Los operadores inactivos no aparecen en el ORBAT público</p>
        </div>
      </label>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Botones ────────────────────────────────────────────────────────── */}
      <div className={`flex gap-2 ${!isEdit ? "flex-col sm:flex-row" : ""}`}>
        {!isEdit && (
          <Button
            type="submit"
            variant="outline"
            onClick={() => { submitModeRef.current = "another" }}
            disabled={submitDisabled}
            className="flex-1 border-white/10 text-slate-300 hover:bg-white/5 hover:text-slate-100 disabled:opacity-40"
          >
            {pending && submitModeRef.current === "another" ? (
              <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Creando…</>
            ) : "Guardar y crear otro"}
          </Button>
        )}
        <Button
          type="submit"
          onClick={() => { submitModeRef.current = "close" }}
          disabled={submitDisabled}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
        >
          {pending && submitModeRef.current === "close" ? (
            <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />{isEdit ? "Guardando…" : "Creando…"}</>
          ) : isEdit ? "Guardar cambios" : "Crear operador"}
        </Button>
      </div>
    </form>
  )
}

// ─── Dialog (Sheet) ───────────────────────────────────────────────────────────

interface DialogProps {
  mode: "create" | "edit"
  miembro?: MiembroRow
  estructura: EstructuraRegimiento[]
  cursos: CursoRow[]
  cursosCompletados?: string[]
  escuadraConteos?: Record<string, number>
}

export function MiembroDialog({
  mode,
  miembro,
  estructura,
  cursos,
  cursosCompletados,
  escuadraConteos,
}: DialogProps) {
  const [open, setOpen] = useState(false)
  // null = not yet loaded; string[] = ready to render form
  const [cursosIniciales, setCursosIniciales] = useState<string[] | null>(
    mode === "create" ? [] : null
  )

  async function handleOpenChange(next: boolean) {
    if (!next) {
      setOpen(false)
      // Reset so next open refetches
      if (mode === "edit") setCursosIniciales(null)
      return
    }
    setOpen(true)
    if (mode === "edit" && miembro) {
      const ids = await getCursosCompletadosMiembro(miembro.id)
      setCursosIniciales(ids)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {mode === "create" ? (
          <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5">
            <Plus className="w-4 h-4" />
            Agregar operador
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            title="Editar operador"
            className="w-7 h-7 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full border-l overflow-y-auto"
        style={{ background: "#111827", borderColor: "rgba(255,255,255,0.08)", maxWidth: "600px" }}
      >
        <SheetHeader className="mb-6 px-6">
          <SheetTitle className="text-slate-100 text-lg font-bold">
            {mode === "create" ? "Nuevo operador" : `Editar — ${miembro?.nombre_milsim}`}
          </SheetTitle>
        </SheetHeader>

        {cursosIniciales !== null ? (
          <MiembroForm
            miembro={miembro}
            cursosCompletados={cursosIniciales}
            estructura={estructura}
            cursos={cursos}
            escuadraConteos={escuadraConteos}
            onClose={() => setOpen(false)}
          />
        ) : (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
