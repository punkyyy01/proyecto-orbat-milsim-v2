"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { toast } from "sonner"
import {
  ChevronRight,
  ChevronDown,
  Shield,
  Flag,
  Users,
  Swords,
  Pencil,
  Trash2,
  Plus,
  ChevronUp,
  Radio,
  Check,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  crearRegimiento,
  actualizarRegimiento,
  eliminarRegimiento,
  crearCompania,
  actualizarCompania,
  eliminarCompania,
  reordenarCompania,
  crearPeloton,
  actualizarPeloton,
  eliminarPeloton,
  reordenarPeloton,
  crearEscuadra,
  actualizarEscuadra,
  eliminarEscuadra,
  reordenarEscuadra,
  actualizarIndicativoEscuadra,
} from "@/app/actions/estructura"

// ─── Types ────────────────────────────────────────────────────────────────────

export type EscuadraConConteo = {
  id: string
  nombre: string
  indicativo_radio: string | null
  max_miembros: number
  orden: number
  total_miembros: number
}

export type PelotonConConteo = {
  id: string
  nombre: string
  orden: number
  total_miembros: number
  escuadras: EscuadraConConteo[]
}

export type CompaniaConConteo = {
  id: string
  nombre: string
  logo_url: string | null
  orden: number
  total_miembros: number
  pelotones: PelotonConConteo[]
}

export type RegimientoConConteo = {
  id: string
  nombre: string
  descripcion: string | null
  comandante: string | null
  total_miembros: number
  companias: CompaniaConConteo[]
}

// ─── Dialog state ─────────────────────────────────────────────────────────────

type DialogState =
  | { type: "add-reg" }
  | { type: "edit-reg"; id: string; nombre: string }
  | { type: "delete-reg"; id: string; nombre: string; hijos: number }
  | { type: "add-comp"; regimientoId: string }
  | { type: "edit-comp"; id: string; nombre: string }
  | { type: "delete-comp"; id: string; nombre: string; hijos: number }
  | { type: "add-pel"; companiaId: string }
  | { type: "edit-pel"; id: string; nombre: string }
  | { type: "delete-pel"; id: string; nombre: string; hijos: number }
  | { type: "add-esc"; pelotonId: string }
  | { type: "edit-esc"; id: string; nombre: string; indicativo: string | null }
  | { type: "delete-esc"; id: string; nombre: string; miembros: number }
  | null

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputClass =
  "bg-slate-900 border-white/10 text-slate-200 placeholder:text-slate-600 focus-visible:border-blue-500/50 focus-visible:ring-0"
const labelClass = "text-slate-300 text-sm font-medium"

// ─── Inline indicativo editor ─────────────────────────────────────────────────

function IndicativoInline({
  escuadraId,
  valor,
}: {
  escuadraId: string
  valor: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(valor ?? "")
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function handleSave() {
    startTransition(async () => {
      const result = await actualizarIndicativoEscuadra(
        escuadraId,
        draft.trim() || null
      )
      if ("error" in result) {
        toast.error(result.error)
      } else {
        setEditing(false)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") {
      setDraft(valor ?? "")
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Radio className="w-3 h-3 text-slate-500 shrink-0" />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder="indicativo…"
          disabled={pending}
          className="w-24 text-xs bg-slate-800 border border-blue-500/40 rounded px-1.5 py-0.5 text-slate-200 outline-none"
        />
        <button
          onClick={handleSave}
          disabled={pending}
          className="text-green-400 hover:text-green-300"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={() => {
            setDraft(valor ?? "")
            setEditing(false)
          }}
          className="text-slate-500 hover:text-slate-400"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 group/ind text-slate-500 hover:text-slate-300 transition-colors"
      title="Editar indicativo de radio"
    >
      <Radio className="w-3 h-3 shrink-0" />
      <span className="text-xs font-mono">
        {valor ?? <span className="italic text-slate-600">sin indicativo</span>}
      </span>
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/ind:opacity-100 transition-opacity" />
    </button>
  )
}

// ─── Reorder buttons ──────────────────────────────────────────────────────────

function ReorderButtons({
  onUp,
  onDown,
  isFirst,
  isLast,
}: {
  onUp: () => void
  onDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={onUp}
        disabled={isFirst}
        className="p-0.5 rounded text-slate-600 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        title="Subir"
      >
        <ChevronUp className="w-3 h-3" />
      </button>
      <button
        onClick={onDown}
        disabled={isLast}
        className="p-0.5 rounded text-slate-600 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        title="Bajar"
      >
        <ChevronRight className="w-3 h-3 rotate-90" />
      </button>
    </div>
  )
}

// ─── Member count badge ───────────────────────────────────────────────────────

function ConteoMiembros({ count }: { count: number }) {
  return (
    <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
      {count} op.
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ArbolEstructura({
  regimientos,
}: {
  regimientos: RegimientoConConteo[]
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(regimientos.map((r) => r.id))
  )
  const [dialog, setDialog] = useState<DialogState>(null)
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function closeDialog() {
    setDialog(null)
    setFormError(null)
  }

  // ── Form submit dispatcher ─────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      let result

      if (dialog?.type === "add-reg") {
        result = await crearRegimiento(fd)
      } else if (dialog?.type === "edit-reg") {
        result = await actualizarRegimiento(dialog.id, fd)
      } else if (dialog?.type === "add-comp") {
        fd.set("regimiento_id", dialog.regimientoId)
        result = await crearCompania(fd)
      } else if (dialog?.type === "edit-comp") {
        result = await actualizarCompania(dialog.id, fd)
      } else if (dialog?.type === "add-pel") {
        fd.set("compania_id", dialog.companiaId)
        result = await crearPeloton(fd)
      } else if (dialog?.type === "edit-pel") {
        result = await actualizarPeloton(dialog.id, fd)
      } else if (dialog?.type === "add-esc") {
        fd.set("peloton_id", dialog.pelotonId)
        result = await crearEscuadra(fd)
      } else if (dialog?.type === "edit-esc") {
        result = await actualizarEscuadra(dialog.id, fd)
      } else {
        return
      }

      if ("error" in result) {
        setFormError(result.error)
      } else {
        toast.success("Guardado")
        closeDialog()
      }
    })
  }

  // ── Delete handler ─────────────────────────────────────────────────────────

  function handleDelete() {
    if (!dialog) return
    startTransition(async () => {
      let result
      if (dialog.type === "delete-reg") {
        result = await eliminarRegimiento(dialog.id)
      } else if (dialog.type === "delete-comp") {
        result = await eliminarCompania(dialog.id)
      } else if (dialog.type === "delete-pel") {
        result = await eliminarPeloton(dialog.id)
      } else if (dialog.type === "delete-esc") {
        result = await eliminarEscuadra(dialog.id)
      } else {
        return
      }
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Eliminado")
        closeDialog()
      }
    })
  }

  // ── Reorder handlers ───────────────────────────────────────────────────────

  function reorderComp(id: string, dir: "up" | "down") {
    startTransition(async () => {
      const r = await reordenarCompania(id, dir)
      if ("error" in r) toast.error(r.error)
    })
  }

  function reorderPel(id: string, dir: "up" | "down") {
    startTransition(async () => {
      const r = await reordenarPeloton(id, dir)
      if ("error" in r) toast.error(r.error)
    })
  }

  function reorderEsc(id: string, dir: "up" | "down") {
    startTransition(async () => {
      const r = await reordenarEscuadra(id, dir)
      if ("error" in r) toast.error(r.error)
    })
  }

  // ── Render tree ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Add regimiento button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 h-8"
          onClick={() => setDialog({ type: "add-reg" })}
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo regimiento
        </Button>
      </div>

      {regimientos.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <Shield className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">
            No hay regimientos. Crea el primero.
          </p>
        </div>
      )}

      {regimientos.map((reg) => {
        const isExpanded = expanded.has(reg.id)

        return (
          <div
            key={reg.id}
            className="rounded-xl border overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            {/* Regimiento row */}
            <div
              className="flex items-center gap-2 px-3 py-2.5"
              style={{ background: "rgba(30,58,95,0.3)" }}
            >
              <button
                onClick={() => toggleExpand(reg.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              <Shield className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-semibold text-slate-100 text-sm flex-1 min-w-0 truncate">
                {reg.nombre}
              </span>
              <ConteoMiembros count={reg.total_miembros} />
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 shrink-0"
                title="Agregar compañía"
                onClick={() =>
                  setDialog({ type: "add-comp", regimientoId: reg.id })
                }
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-slate-500 hover:text-slate-300 hover:bg-white/5 shrink-0"
                title="Editar regimiento"
                onClick={() =>
                  setDialog({
                    type: "edit-reg",
                    id: reg.id,
                    nombre: reg.nombre,
                  })
                }
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                title="Eliminar regimiento"
                onClick={() =>
                  setDialog({
                    type: "delete-reg",
                    id: reg.id,
                    nombre: reg.nombre,
                    hijos: reg.companias.length,
                  })
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Compañías */}
            {isExpanded && (
              <div className="pl-6 pb-1">
                {reg.companias.length === 0 && (
                  <p className="text-xs text-slate-600 italic py-2 px-3">
                    Sin compañías
                  </p>
                )}
                {reg.companias.map((comp, compIdx) => {
                  const compExpanded = expanded.has(comp.id)

                  return (
                    <div key={comp.id} className="my-1">
                      {/* Compañía row */}
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/3 group/comp">
                        <ReorderButtons
                          onUp={() => reorderComp(comp.id, "up")}
                          onDown={() => reorderComp(comp.id, "down")}
                          isFirst={compIdx === 0}
                          isLast={compIdx === reg.companias.length - 1}
                        />
                        <button
                          onClick={() => toggleExpand(comp.id)}
                          className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                        >
                          {compExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <Flag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-slate-200 text-sm flex-1 min-w-0 truncate">
                          {comp.nombre}
                        </span>
                        <ConteoMiembros count={comp.total_miembros} />
                        <div className="flex items-center gap-1 opacity-0 group-hover/comp:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10"
                            title="Agregar pelotón"
                            onClick={() =>
                              setDialog({
                                type: "add-pel",
                                companiaId: comp.id,
                              })
                            }
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            title="Editar compañía"
                            onClick={() =>
                              setDialog({
                                type: "edit-comp",
                                id: comp.id,
                                nombre: comp.nombre,
                              })
                            }
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                            title="Eliminar compañía"
                            onClick={() =>
                              setDialog({
                                type: "delete-comp",
                                id: comp.id,
                                nombre: comp.nombre,
                                hijos: comp.pelotones.length,
                              })
                            }
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Pelotones */}
                      {compExpanded && (
                        <div className="pl-8">
                          {comp.pelotones.length === 0 && (
                            <p className="text-xs text-slate-600 italic py-1.5 px-3">
                              Sin pelotones
                            </p>
                          )}
                          {comp.pelotones.map((pel, pelIdx) => {
                            const pelExpanded = expanded.has(pel.id)

                            return (
                              <div key={pel.id} className="my-0.5">
                                {/* Pelotón row */}
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/3 group/pel">
                                  <ReorderButtons
                                    onUp={() => reorderPel(pel.id, "up")}
                                    onDown={() => reorderPel(pel.id, "down")}
                                    isFirst={pelIdx === 0}
                                    isLast={
                                      pelIdx === comp.pelotones.length - 1
                                    }
                                  />
                                  <button
                                    onClick={() => toggleExpand(pel.id)}
                                    className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                                  >
                                    {pelExpanded ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )}
                                  </button>
                                  <Users className="w-3 h-3 text-green-400 shrink-0" />
                                  <span className="text-slate-300 text-sm flex-1 min-w-0 truncate">
                                    {pel.nombre}
                                  </span>
                                  <ConteoMiembros count={pel.total_miembros} />
                                  <div className="flex items-center gap-1 opacity-0 group-hover/pel:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-6 h-6 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10"
                                      title="Agregar escuadra"
                                      onClick={() =>
                                        setDialog({
                                          type: "add-esc",
                                          pelotonId: pel.id,
                                        })
                                      }
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-6 h-6 text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                      title="Editar pelotón"
                                      onClick={() =>
                                        setDialog({
                                          type: "edit-pel",
                                          id: pel.id,
                                          nombre: pel.nombre,
                                        })
                                      }
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-6 h-6 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                      title="Eliminar pelotón"
                                      onClick={() =>
                                        setDialog({
                                          type: "delete-pel",
                                          id: pel.id,
                                          nombre: pel.nombre,
                                          hijos: pel.escuadras.length,
                                        })
                                      }
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Escuadras */}
                                {pelExpanded && (
                                  <div className="pl-8">
                                    {pel.escuadras.length === 0 && (
                                      <p className="text-xs text-slate-600 italic py-1.5 px-3">
                                        Sin escuadras
                                      </p>
                                    )}
                                    {pel.escuadras.map((esc, escIdx) => (
                                      <div
                                        key={esc.id}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/3 group/esc my-0.5"
                                      >
                                        <ReorderButtons
                                          onUp={() =>
                                            reorderEsc(esc.id, "up")
                                          }
                                          onDown={() =>
                                            reorderEsc(esc.id, "down")
                                          }
                                          isFirst={escIdx === 0}
                                          isLast={
                                            escIdx ===
                                            pel.escuadras.length - 1
                                          }
                                        />
                                        <Swords className="w-3 h-3 text-slate-500 shrink-0" />
                                        <span className="text-slate-400 text-sm min-w-0 truncate">
                                          {esc.nombre}
                                        </span>
                                        <IndicativoInline
                                          escuadraId={esc.id}
                                          valor={esc.indicativo_radio}
                                        />
                                        <div className="flex-1" />
                                        <ConteoMiembros
                                          count={esc.total_miembros}
                                        />
                                        <div className="flex items-center gap-1 opacity-0 group-hover/esc:opacity-100 transition-opacity">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-6 h-6 text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                            title="Editar escuadra"
                                            onClick={() =>
                                              setDialog({
                                                type: "edit-esc",
                                                id: esc.id,
                                                nombre: esc.nombre,
                                                indicativo:
                                                  esc.indicativo_radio,
                                              })
                                            }
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-6 h-6 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                            title="Eliminar escuadra"
                                            onClick={() =>
                                              setDialog({
                                                type: "delete-esc",
                                                id: esc.id,
                                                nombre: esc.nombre,
                                                miembros: esc.total_miembros,
                                              })
                                            }
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent
          className="sm:max-w-sm border"
          style={{
            background: "#111827",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          {/* ── Create / Edit form dialogs ─────────────────────────────────── */}
          {dialog &&
          [
            "add-reg",
            "edit-reg",
            "add-comp",
            "edit-comp",
            "add-pel",
            "edit-pel",
            "add-esc",
            "edit-esc",
          ].includes(dialog.type) ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-slate-100">
                  {dialog.type === "add-reg" && "Nuevo regimiento"}
                  {dialog.type === "edit-reg" && "Editar regimiento"}
                  {dialog.type === "add-comp" && "Nueva compañía"}
                  {dialog.type === "edit-comp" && "Editar compañía"}
                  {dialog.type === "add-pel" && "Nuevo pelotón"}
                  {dialog.type === "edit-pel" && "Editar pelotón"}
                  {dialog.type === "add-esc" && "Nueva escuadra"}
                  {dialog.type === "edit-esc" && "Editar escuadra"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre" className={labelClass}>
                    Nombre <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    defaultValue={
                      "nombre" in dialog ? dialog.nombre : undefined
                    }
                    placeholder="Nombre de la unidad…"
                    required
                    autoFocus
                    className={inputClass}
                  />
                </div>

                {(dialog.type === "add-esc" || dialog.type === "edit-esc") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="indicativo_radio" className={labelClass}>
                      Indicativo de radio
                    </Label>
                    <Input
                      id="indicativo_radio"
                      name="indicativo_radio"
                      defaultValue={
                        dialog.type === "edit-esc"
                          ? (dialog.indicativo ?? "")
                          : ""
                      }
                      placeholder="e.g. BRAVO-1"
                      className={inputClass}
                    />
                  </div>
                )}

                {formError && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {formError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-slate-400 hover:text-slate-200"
                    >
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={pending}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {pending ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </form>
            </>
          ) : null}

          {/* ── Delete confirm dialogs ──────────────────────────────────────── */}
          {dialog &&
          ["delete-reg", "delete-comp", "delete-pel", "delete-esc"].includes(
            dialog.type
          ) ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-slate-100">
                  Confirmar eliminación
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 mt-2">
                <p className="text-sm text-slate-300">
                  ¿Eliminar{" "}
                  <span className="font-semibold text-slate-100">
                    {"nombre" in dialog ? dialog.nombre : ""}
                  </span>
                  ?
                </p>

                {/* Cascade warning */}
                {dialog.type !== "delete-esc" &&
                  "hijos" in dialog &&
                  dialog.hijos > 0 && (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5">
                      <p className="text-xs text-amber-400">
                        Esta unidad tiene{" "}
                        <span className="font-semibold">{dialog.hijos}</span>{" "}
                        {dialog.type === "delete-reg" ? "compañía(s)" : ""}
                        {dialog.type === "delete-comp" ? "pelotón(es)" : ""}
                        {dialog.type === "delete-pel" ? "escuadra(s)" : ""}{" "}
                        que también serán eliminadas (cascade).
                      </p>
                    </div>
                  )}

                {dialog.type === "delete-esc" && dialog.miembros > 0 && (
                  <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5">
                    <p className="text-xs text-amber-400">
                      <span className="font-semibold">{dialog.miembros}</span>{" "}
                      operador(es) están asignados a esta escuadra. Al
                      eliminarla quedarán sin asignación de unidad.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleDelete}
                  disabled={pending}
                  className="bg-red-600 hover:bg-red-500 text-white"
                >
                  {pending ? "Eliminando…" : "Eliminar"}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
