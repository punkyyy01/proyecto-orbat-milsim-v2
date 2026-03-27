"use client"

import { useState, useTransition, useMemo } from "react"
import { toast } from "sonner"
import { Pencil, Plus, Check, ChevronDown } from "lucide-react"
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
import { crearMiembro, actualizarMiembro } from "@/app/actions/personal"
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

type Nivel = "none" | "regimiento" | "compania" | "peloton" | "escuadra"

interface UnitOption {
  id: string
  label: string
}

// ─── Cascade helpers ──────────────────────────────────────────────────────────

function getUnidadOptions(
  nivel: Nivel,
  estructura: EstructuraRegimiento[]
): UnitOption[] {
  if (nivel === "none") return []

  if (nivel === "regimiento") {
    return estructura.map((r) => ({ id: r.id, label: r.nombre }))
  }

  if (nivel === "compania") {
    return estructura.flatMap((r) =>
      r.companias.map((c) => ({ id: c.id, label: `${r.nombre} › ${c.nombre}` }))
    )
  }

  if (nivel === "peloton") {
    return estructura.flatMap((r) =>
      r.companias.flatMap((c) =>
        c.pelotones.map((p) => ({
          id: p.id,
          label: `${c.nombre} › ${p.nombre}`,
        }))
      )
    )
  }

  if (nivel === "escuadra") {
    return estructura.flatMap((r) =>
      r.companias.flatMap((c) =>
        c.pelotones.flatMap((p) =>
          p.escuadras.map((e) => ({
            id: e.id,
            label: `${c.nombre} › ${p.nombre} › ${e.nombre}`,
          }))
        )
      )
    )
  }

  return []
}

/** Detect the current unit assignment level and id from a member row */
function detectNivelActual(m: MiembroRow): { nivel: Nivel; unidadId: string } {
  if (m.escuadra_id) return { nivel: "escuadra", unidadId: m.escuadra_id }
  if (m.peloton_id) return { nivel: "peloton", unidadId: m.peloton_id }
  if (m.compania_id) return { nivel: "compania", unidadId: m.compania_id }
  if (m.regimiento_id) return { nivel: "regimiento", unidadId: m.regimiento_id }
  return { nivel: "none", unidadId: "" }
}

// ─── Form ────────────────────────────────────────────────────────────────────

interface FormProps {
  miembro?: MiembroRow
  cursosCompletados?: string[]
  estructura: EstructuraRegimiento[]
  cursos: CursoRow[]
  onClose: () => void
}

function MiembroForm({
  miembro,
  cursosCompletados = [],
  estructura,
  cursos,
  onClose,
}: FormProps) {
  const isEdit = !!miembro
  const [pending, startTransition] = useTransition()

  // ── Form state ──────────────────────────────────────────────────────────────
  const [nombre, setNombre] = useState(miembro?.nombre_milsim ?? "")
  const [rango, setRango] = useState(miembro?.rango ?? "")
  const [rol, setRol] = useState(miembro?.rol ?? "")
  const [discordId, setDiscordId] = useState(miembro?.discord_id ?? "")
  const [steamId, setSteamId] = useState(miembro?.steam_id ?? "")
  const [activo, setActivo] = useState(miembro?.activo ?? true)
  const [notas, setNotas] = useState(miembro?.notas_admin ?? "")
  const [cursosSeleccionados, setCursosSeleccionados] = useState<Set<string>>(
    () => new Set(cursosCompletados)
  )

  const { nivel: nivelInicial, unidadId: unidadInicial } = miembro
    ? detectNivelActual(miembro)
    : { nivel: "none" as Nivel, unidadId: "" }

  const [nivel, setNivel] = useState<Nivel>(nivelInicial)
  const [unidadId, setUnidadId] = useState(unidadInicial)
  const [error, setError] = useState<string | null>(null)

  const unidadOptions = useMemo(
    () => getUnidadOptions(nivel, estructura),
    [nivel, estructura]
  )

  function handleNivelChange(value: Nivel) {
    setNivel(value)
    setUnidadId("") // reset unit selection when level changes
  }

  function toggleCurso(id: string) {
    setCursosSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const fd = new FormData()
    fd.set("nombre_milsim", nombre)
    fd.set("rango", rango)
    fd.set("rol", rol)
    fd.set("discord_id", discordId)
    fd.set("steam_id", steamId)
    fd.set("activo", String(activo))
    fd.set("notas_admin", notas)
    fd.set("nivel", nivel === "none" ? "" : nivel)
    fd.set("unidad_id", nivel !== "none" ? unidadId : "")
    fd.set("cursos", Array.from(cursosSeleccionados).join(","))

    startTransition(async () => {
      const result = isEdit
        ? await actualizarMiembro(miembro!.id, fd)
        : await crearMiembro(fd)

      if ("error" in result) {
        setError(result.error)
      } else {
        toast.success(isEdit ? "Operador actualizado" : "Operador creado")
        onClose()
      }
    })
  }

  const inputClass =
    "bg-slate-900 border-white/10 text-slate-200 placeholder:text-slate-600 focus-visible:border-blue-500/50 focus-visible:ring-0"
  const labelClass = "text-slate-300 text-sm font-medium"
  const sectionClass = "text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* ── Identidad ──────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={sectionClass}>Identidad</p>

        {/* Nombre milsim */}
        <div className="space-y-1.5">
          <Label htmlFor="nombre_milsim" className={labelClass}>
            Nick milsim <span className="text-red-400">*</span>
          </Label>
          <Input
            id="nombre_milsim"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="e.g. Ghost"
            required
            className={inputClass}
          />
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
              style={{
                background: "#0f172a",
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              {CATEGORIAS.map(({ key, label }) => (
                <SelectGroup key={key}>
                  <SelectLabel className="text-slate-500 text-[10px] uppercase tracking-wider">
                    {label}
                  </SelectLabel>
                  {RANKS_BY_CATEGORY[key].map((r) => (
                    <SelectItem
                      key={r.code}
                      value={r.code}
                      className="text-slate-200"
                    >
                      <span className="font-mono text-xs text-slate-400 mr-1.5">
                        {r.code}
                      </span>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rol con sugerencias */}
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

      {/* ── Cuentas ────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={sectionClass}>Cuentas externas</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="discord_id" className={labelClass}>
              Discord ID
            </Label>
            <Input
              id="discord_id"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              placeholder="123456789…"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="steam_id" className={labelClass}>
              Steam ID
            </Label>
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

      {/* ── Asignación de unidad ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={sectionClass}>Asignación</p>

        {/* Nivel */}
        <div className="space-y-1.5">
          <Label className={labelClass}>Nivel de asignación</Label>
          <Select
            value={nivel}
            onValueChange={(v) => handleNivelChange(v as Nivel)}
          >
            <SelectTrigger className={`${inputClass} focus:ring-0`}>
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent
              className="border"
              style={{
                background: "#0f172a",
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <SelectItem value="none" className="text-slate-400">
                Sin asignar
              </SelectItem>
              <SelectItem value="regimiento" className="text-slate-200">
                Regimiento
              </SelectItem>
              <SelectItem value="compania" className="text-slate-200">
                Compañía
              </SelectItem>
              <SelectItem value="peloton" className="text-slate-200">
                Pelotón
              </SelectItem>
              <SelectItem value="escuadra" className="text-slate-200">
                Escuadra
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Unidad específica */}
        {nivel !== "none" && unidadOptions.length > 0 && (
          <div className="space-y-1.5">
            <Label className={labelClass}>Unidad</Label>
            <Select
              value={unidadId}
              onValueChange={setUnidadId}
            >
              <SelectTrigger className={`${inputClass} focus:ring-0`}>
                <SelectValue placeholder="Seleccionar unidad…" />
              </SelectTrigger>
              <SelectContent
                className="border max-h-60"
                style={{
                  background: "#0f172a",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                {unidadOptions.map((opt) => (
                  <SelectItem
                    key={opt.id}
                    value={opt.id}
                    className="text-slate-200 text-sm"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {nivel !== "none" && unidadOptions.length === 0 && (
          <p className="text-xs text-amber-400/80">
            No hay unidades de ese nivel registradas aún.
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
                <span className="text-blue-400 normal-case">
                  ({cursosSeleccionados.size})
                </span>
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
                    <span className="font-mono text-xs text-blue-400 mr-2">
                      {c.sigla}
                    </span>
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
        <Label htmlFor="notas_admin" className={labelClass}>
          Notas de administración
        </Label>
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
          <p className="text-slate-500 text-xs">
            Los operadores inactivos no aparecen en el ORBAT público
          </p>
        </div>
      </label>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Submit ─────────────────────────────────────────────────────────── */}
      <Button
        type="submit"
        disabled={pending || !nombre.trim() || !rango}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
      >
        {pending
          ? isEdit
            ? "Guardando…"
            : "Creando…"
          : isEdit
          ? "Guardar cambios"
          : "Crear operador"}
      </Button>
    </form>
  )
}

// ─── Dialog (Sheet) ───────────────────────────────────────────────────────────

interface DialogProps {
  mode: "create" | "edit"
  miembro?: MiembroRow
  estructura: EstructuraRegimiento[]
  cursos: CursoRow[]
  /** Cursos ya completados por el miembro (IDs). Only needed in edit mode. */
  cursosCompletados?: string[]
}

export function MiembroDialog({
  mode,
  miembro,
  estructura,
  cursos,
  cursosCompletados,
}: DialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
            className="w-7 h-7 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md border-l overflow-y-auto"
        style={{
          background: "#111827",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-slate-100 text-lg font-bold">
            {mode === "create" ? "Nuevo operador" : `Editar — ${miembro?.nombre_milsim}`}
          </SheetTitle>
        </SheetHeader>

        <MiembroForm
          miembro={miembro}
          cursosCompletados={cursosCompletados}
          estructura={estructura}
          cursos={cursos}
          onClose={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
