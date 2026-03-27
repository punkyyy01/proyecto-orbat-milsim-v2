"use client"

import { useState, useTransition, useRef } from "react"
import { toast } from "sonner"
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Pencil,
  Radio,
  Check,
  X,
  Search,
  ChevronsUpDown,
  GripVertical,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  crearRegimiento,
  actualizarRegimiento,
  eliminarRegimiento,
  crearCompania,
  actualizarCompania,
  eliminarCompania,
  crearPeloton,
  actualizarPeloton,
  eliminarPeloton,
  crearEscuadra,
  actualizarEscuadra,
  eliminarEscuadra,
  actualizarIndicativoEscuadra,
  swapOrdenCompanias,
  swapOrdenPelotones,
  swapOrdenEscuadras,
} from "@/app/actions/estructura"

// ─── Types ────────────────────────────────────────────────────────────────────

export type MiembroInline = {
  nombre_milsim: string
  rango: string | null
  rol: string | null
}

export type EscuadraConConteo = {
  id: string
  nombre: string
  indicativo_radio: string | null
  max_miembros: number
  orden: number
  total_miembros: number
  miembros: MiembroInline[]
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

// ─── Search helpers ───────────────────────────────────────────────────────────

function matchesSearch(text: string | null | undefined, q: string): boolean {
  if (!q || !text) return false
  return text.toLowerCase().includes(q.toLowerCase())
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-400/25 text-yellow-200 rounded px-0.5 not-italic font-[inherit]">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}

function escMatches(e: EscuadraConConteo, q: string) {
  return matchesSearch(e.nombre, q) || matchesSearch(e.indicativo_radio, q)
}
function pelMatches(p: PelotonConConteo, q: string) {
  return matchesSearch(p.nombre, q) || p.escuadras.some((e) => escMatches(e, q))
}
function compMatches(c: CompaniaConConteo, q: string) {
  return matchesSearch(c.nombre, q) || c.pelotones.some((p) => pelMatches(p, q))
}
function regMatches(r: RegimientoConConteo, q: string) {
  return matchesSearch(r.nombre, q) || r.companias.some((c) => compMatches(c, q))
}

// ─── Collect all IDs ──────────────────────────────────────────────────────────

function allIds(regimientos: RegimientoConConteo[]): Set<string> {
  const ids = new Set<string>()
  for (const reg of regimientos) {
    ids.add(reg.id)
    for (const comp of reg.companias) {
      ids.add(comp.id)
      for (const pel of comp.pelotones) {
        ids.add(pel.id)
        for (const esc of pel.escuadras) ids.add(esc.id)
      }
    }
  }
  return ids
}

// ─── Fill badge ───────────────────────────────────────────────────────────────

function FillBadge({ current, max }: { current: number; max: number }) {
  const isFull = current >= max
  const isAlmost = !isFull && current >= max - 1
  const cls = isFull
    ? "bg-green-500/15 text-green-400 border-green-500/25"
    : isAlmost
      ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/25"
      : "bg-white/5 text-slate-500 border-white/8"
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${cls}`}>
      {current}/{max}
    </span>
  )
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
      {count} op.
    </span>
  )
}

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
  const [pending, startT] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSave() {
    startT(async () => {
      const result = await actualizarIndicativoEscuadra(
        escuadraId,
        draft.trim() || null
      )
      if ("error" in result) toast.error(result.error)
      else setEditing(false)
    })
  }

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <Radio className="w-2.5 h-2.5 text-slate-500 shrink-0" />
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") {
              setDraft(valor ?? "")
              setEditing(false)
            }
          }}
          onBlur={handleSave}
          placeholder="indicativo…"
          disabled={pending}
          className="w-20 text-[10px] bg-slate-800 border border-blue-500/40 rounded px-1.5 py-0.5 text-slate-200 outline-none font-mono"
        />
        <button onClick={handleSave} disabled={pending} className="text-green-400 hover:text-green-300">
          <Check className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={() => { setDraft(valor ?? ""); setEditing(false) }}
          className="text-slate-500 hover:text-slate-400"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </span>
    )
  }

  if (valor) {
    return (
      <button
        onClick={() => { setDraft(valor); setEditing(true) }}
        title="Editar indicativo"
        className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded hover:bg-cyan-500/15 transition-colors"
      >
        <Radio className="w-2.5 h-2.5 shrink-0" />
        {valor}
      </button>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Agregar indicativo de radio"
      className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
    >
      <Radio className="w-2.5 h-2.5 shrink-0" />
      <span className="italic">radio</span>
    </button>
  )
}

// ─── Inline name editor ───────────────────────────────────────────────────────

function InlineName({
  value,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  q,
  className,
}: {
  value: string
  isEditing: boolean
  onStartEdit: () => void
  onSave: (name: string) => void
  onCancel: () => void
  q: string
  className?: string
}) {
  if (isEditing) {
    return (
      <input
        defaultValue={value}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(e.currentTarget.value.trim())
          if (e.key === "Escape") onCancel()
        }}
        onBlur={(e) => onSave(e.currentTarget.value.trim())}
        className="bg-slate-800 border border-blue-500/50 rounded px-1.5 py-0.5 text-slate-100 text-sm outline-none w-44 min-w-0"
      />
    )
  }
  return (
    <button
      onClick={onStartEdit}
      title="Clic para editar nombre"
      className={`text-left hover:underline decoration-dotted underline-offset-2 cursor-text ${className}`}
    >
      {highlight(value, q)}
    </button>
  )
}

// ─── Inline add input ─────────────────────────────────────────────────────────

function InlineAddInput({
  placeholder,
  onAdd,
  onCancel,
}: {
  placeholder: string
  onAdd: (name: string) => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-1.5 py-1 px-1">
      <input
        autoFocus
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const v = e.currentTarget.value.trim()
            if (v) onAdd(v)
          }
          if (e.key === "Escape") onCancel()
        }}
        className="bg-slate-800 border border-blue-500/40 rounded px-2 py-1 text-slate-200 text-sm outline-none w-48 placeholder:text-slate-600"
      />
      <button onClick={onCancel} className="text-slate-500 hover:text-slate-300">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Inline delete confirm ────────────────────────────────────────────────────

function InlineDeleteConfirm({
  nombre,
  hijos,
  hijosLabel,
  onConfirm,
  onCancel,
  pending,
}: {
  nombre: string
  hijos?: number
  hijosLabel?: string
  onConfirm: () => void
  onCancel: () => void
  pending: boolean
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs flex-wrap">
      <span className="text-red-400">
        ¿Eliminar <strong className="text-red-300">{nombre}</strong>
        {hijos ? (
          <span className="text-amber-400 ml-1">(+{hijos} {hijosLabel})</span>
        ) : null}
        ?
      </span>
      <button
        onClick={onConfirm}
        disabled={pending}
        className="text-red-400 hover:text-red-300 underline"
      >
        Sí
      </button>
      <button onClick={onCancel} className="text-slate-400 hover:text-slate-300 underline">
        No
      </button>
    </span>
  )
}

// ─── Connector lines ──────────────────────────────────────────────────────────

const connH = (
  <div
    className="absolute left-0 top-[1.05rem] w-3 border-t pointer-events-none"
    style={{ borderColor: "rgba(255,255,255,0.08)" }}
  />
)

// ─── Main component ───────────────────────────────────────────────────────────

type AddingTo = { parentId: string; level: "reg" | "comp" | "pel" | "esc" }
type DeletingInfo = {
  id: string
  type: "reg" | "comp" | "pel" | "esc"
  nombre: string
  hijos?: number
  hijosLabel?: string
}
type DragInfo = { id: string; type: "comp" | "pel" | "esc" } | null

export function ArbolEstructura({
  regimientos,
}: {
  regimientos: RegimientoConConteo[]
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => allIds(regimientos))
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingTo, setAddingTo] = useState<AddingTo | null>(null)
  const [deletingInfo, setDeletingInfo] = useState<DeletingInfo | null>(null)
  const [dragging, setDragging] = useState<DragInfo>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const q = search.trim().toLowerCase()

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allExpanded = expanded.size > 0
  function toggleAll() {
    setExpanded(allExpanded ? new Set() : allIds(regimientos))
  }

  function isOpen(id: string) {
    if (q) return true // auto-expand all when searching
    return expanded.has(id)
  }

  // ── Save name ────────────────────────────────────────────────────────────────

  function saveName(
    id: string,
    nombre: string,
    type: "reg" | "comp" | "pel" | "esc",
    extra?: Record<string, string>
  ) {
    if (!nombre) { setEditingId(null); return }
    const fd = new FormData()
    fd.set("nombre", nombre)
    if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v)
    startTransition(async () => {
      let result
      if (type === "reg") result = await actualizarRegimiento(id, fd)
      else if (type === "comp") result = await actualizarCompania(id, fd)
      else if (type === "pel") result = await actualizarPeloton(id, fd)
      else result = await actualizarEscuadra(id, fd)
      if ("error" in result) toast.error(result.error)
      else setEditingId(null)
    })
  }

  // ── Add ──────────────────────────────────────────────────────────────────────

  function handleAdd(nombre: string) {
    if (!addingTo) return
    const fd = new FormData()
    fd.set("nombre", nombre)
    startTransition(async () => {
      let result
      const { parentId, level } = addingTo
      if (level === "reg") {
        result = await crearRegimiento(fd)
      } else if (level === "comp") {
        fd.set("regimiento_id", parentId)
        result = await crearCompania(fd)
      } else if (level === "pel") {
        fd.set("compania_id", parentId)
        result = await crearPeloton(fd)
      } else {
        fd.set("peloton_id", parentId)
        result = await crearEscuadra(fd)
      }
      if ("error" in result) toast.error(result.error)
      else {
        toast.success("Creado")
        setAddingTo(null)
        if (level !== "reg") {
          setExpanded((prev) => new Set([...prev, parentId]))
        }
      }
    })
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  function handleDelete() {
    if (!deletingInfo) return
    startTransition(async () => {
      let result
      const { id, type } = deletingInfo
      if (type === "reg") result = await eliminarRegimiento(id)
      else if (type === "comp") result = await eliminarCompania(id)
      else if (type === "pel") result = await eliminarPeloton(id)
      else result = await eliminarEscuadra(id)
      if ("error" in result) toast.error(result.error)
      else { toast.success("Eliminado"); setDeletingInfo(null) }
    })
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────────

  function handleDrop(droppedOnId: string, type: "comp" | "pel" | "esc") {
    if (!dragging || dragging.type !== type || dragging.id === droppedOnId) {
      setDragging(null)
      setDragOverId(null)
      return
    }
    startTransition(async () => {
      let result
      if (type === "comp") result = await swapOrdenCompanias(dragging.id, droppedOnId)
      else if (type === "pel") result = await swapOrdenPelotones(dragging.id, droppedOnId)
      else result = await swapOrdenEscuadras(dragging.id, droppedOnId)
      if ("error" in result) toast.error(result.error)
      setDragging(null)
      setDragOverId(null)
    })
  }

  // ── Filter ───────────────────────────────────────────────────────────────────

  const filteredRegs = q
    ? regimientos.filter((r) => regMatches(r, q))
    : regimientos

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar unidad…"
            className="w-full pl-8 pr-7 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500/40"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-slate-400 hover:text-slate-200 gap-1.5 text-xs shrink-0"
          onClick={toggleAll}
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
          {allExpanded ? "Colapsar todo" : "Expandir todo"}
        </Button>

        <Button
          size="sm"
          className="h-8 bg-blue-600 hover:bg-blue-500 text-white gap-1.5 text-xs shrink-0"
          onClick={() => setAddingTo({ parentId: "root", level: "reg" })}
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo regimiento
        </Button>
      </div>

      {/* Inline add regimiento */}
      {addingTo?.level === "reg" && (
        <InlineAddInput
          placeholder="Nombre del regimiento…"
          onAdd={handleAdd}
          onCancel={() => setAddingTo(null)}
        />
      )}

      {/* Empty states */}
      {filteredRegs.length === 0 && !q && regimientos.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <Building2 className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">No hay regimientos. Crea el primero.</p>
        </div>
      )}
      {q && filteredRegs.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-8">
          Sin resultados para &ldquo;{search}&rdquo;
        </p>
      )}

      {/* Tree */}
      <div className="space-y-1.5">
        {filteredRegs.map((reg) => {
          const regOpen = isOpen(reg.id)
          const isEditingReg = editingId === reg.id
          const isDeletingReg = deletingInfo?.id === reg.id

          const regDirectMatch = matchesSearch(reg.nombre, q)
          const filteredComps = q
            ? regDirectMatch
              ? reg.companias
              : reg.companias.filter((c) => compMatches(c, q))
            : reg.companias

          return (
            <div
              key={reg.id}
              className="rounded-xl border overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.015)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              {/* Regimiento row */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 group/row"
                style={{ background: "rgba(30,58,95,0.25)" }}
              >
                <button
                  onClick={() => toggle(reg.id)}
                  className="text-slate-500 hover:text-slate-300 shrink-0 transition-colors"
                >
                  {regOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <span className="text-lg shrink-0" aria-hidden>🏛️</span>
                <div className="flex-1 min-w-0">
                  {isDeletingReg ? (
                    <InlineDeleteConfirm
                      nombre={reg.nombre}
                      hijos={reg.companias.length || undefined}
                      hijosLabel="compañías"
                      onConfirm={handleDelete}
                      onCancel={() => setDeletingInfo(null)}
                      pending={pending}
                    />
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <InlineName
                        value={reg.nombre}
                        isEditing={isEditingReg}
                        onStartEdit={() => setEditingId(reg.id)}
                        onSave={(n) => saveName(reg.id, n, "reg")}
                        onCancel={() => setEditingId(null)}
                        q={q}
                        className="font-semibold text-slate-100 text-sm"
                      />
                      <CountBadge count={reg.total_miembros} />
                    </div>
                  )}
                </div>
                {!isDeletingReg && !isEditingReg && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => setAddingTo({ parentId: reg.id, level: "comp" })}
                      title="Agregar compañía"
                      className="p-1.5 rounded text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(reg.id)}
                      title="Editar nombre"
                      className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setDeletingInfo({
                          id: reg.id,
                          type: "reg",
                          nombre: reg.nombre,
                          hijos: reg.companias.length || undefined,
                          hijosLabel: "compañías",
                        })
                      }
                      title="Eliminar"
                      className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Compañías */}
              {regOpen && (
                <div className="pb-2 pt-0.5">
                  {/* Inline add compañía */}
                  {addingTo?.parentId === reg.id && addingTo.level === "comp" && (
                    <div className="ml-10 mt-1">
                      <InlineAddInput
                        placeholder="Nombre de la compañía…"
                        onAdd={handleAdd}
                        onCancel={() => setAddingTo(null)}
                      />
                    </div>
                  )}

                  {filteredComps.length === 0 && !addingTo && (
                    <p className="text-xs text-slate-600 italic py-1.5 ml-10">Sin compañías</p>
                  )}

                  {/* Vertical line for compañías */}
                  <div
                    className="ml-7 border-l mt-1"
                    style={{ borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    {filteredComps.map((comp) => {
                      const compOpen = isOpen(comp.id)
                      const isEditingComp = editingId === comp.id
                      const isDeletingComp = deletingInfo?.id === comp.id
                      const isDraggingComp = dragging?.id === comp.id
                      const isDragOverComp = dragOverId === comp.id

                      const compDirectMatch = matchesSearch(comp.nombre, q)
                      const filteredPels = q
                        ? compDirectMatch
                          ? comp.pelotones
                          : comp.pelotones.filter((p) => pelMatches(p, q))
                        : comp.pelotones

                      return (
                        <div
                          key={comp.id}
                          className={`relative transition-opacity ${isDraggingComp ? "opacity-30" : ""}`}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation()
                            setDragging({ id: comp.id, type: "comp" })
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (dragging?.type === "comp") setDragOverId(comp.id)
                          }}
                          onDragLeave={() => setDragOverId(null)}
                          onDragEnd={() => { setDragging(null); setDragOverId(null) }}
                          onDrop={(e) => { e.stopPropagation(); handleDrop(comp.id, "comp") }}
                        >
                          {/* Horizontal connector */}
                          {connH}

                          {/* Compañía row */}
                          <div
                            className={`flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-lg hover:bg-white/3 group/row ml-0 transition-colors ${isDragOverComp ? "bg-blue-500/8 outline outline-1 outline-blue-500/20" : ""}`}
                          >
                            <GripVertical className="w-3 h-3 text-slate-700 shrink-0 cursor-grab active:cursor-grabbing" />
                            <button
                              onClick={() => toggle(comp.id)}
                              className="text-slate-500 hover:text-slate-300 shrink-0 transition-colors"
                            >
                              {compOpen ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className="text-base shrink-0" aria-hidden>🏴</span>
                            <div className="flex-1 min-w-0">
                              {isDeletingComp ? (
                                <InlineDeleteConfirm
                                  nombre={comp.nombre}
                                  hijos={comp.pelotones.length || undefined}
                                  hijosLabel="pelotones"
                                  onConfirm={handleDelete}
                                  onCancel={() => setDeletingInfo(null)}
                                  pending={pending}
                                />
                              ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <InlineName
                                    value={comp.nombre}
                                    isEditing={isEditingComp}
                                    onStartEdit={() => setEditingId(comp.id)}
                                    onSave={(n) => saveName(comp.id, n, "comp")}
                                    onCancel={() => setEditingId(null)}
                                    q={q}
                                    className="text-slate-200 text-sm"
                                  />
                                  <CountBadge count={comp.total_miembros} />
                                </div>
                              )}
                            </div>
                            {!isDeletingComp && !isEditingComp && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => setAddingTo({ parentId: comp.id, level: "pel" })}
                                  title="Agregar pelotón"
                                  className="p-1 rounded text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingId(comp.id)}
                                  title="Editar nombre"
                                  className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeletingInfo({
                                      id: comp.id,
                                      type: "comp",
                                      nombre: comp.nombre,
                                      hijos: comp.pelotones.length || undefined,
                                      hijosLabel: "pelotones",
                                    })
                                  }
                                  title="Eliminar"
                                  className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Pelotones */}
                          {compOpen && (
                            <div>
                              {addingTo?.parentId === comp.id && addingTo.level === "pel" && (
                                <div className="ml-12 mt-0.5">
                                  <InlineAddInput
                                    placeholder="Nombre del pelotón…"
                                    onAdd={handleAdd}
                                    onCancel={() => setAddingTo(null)}
                                  />
                                </div>
                              )}
                              {filteredPels.length === 0 && !addingTo && (
                                <p className="text-xs text-slate-600 italic py-1 ml-12">Sin pelotones</p>
                              )}

                              {/* Vertical line for pelotones */}
                              <div
                                className="ml-8 border-l mt-0.5"
                                style={{ borderColor: "rgba(255,255,255,0.07)" }}
                              >
                                {filteredPels.map((pel) => {
                                  const pelOpen = isOpen(pel.id)
                                  const isEditingPel = editingId === pel.id
                                  const isDeletingPel = deletingInfo?.id === pel.id
                                  const isDraggingPel = dragging?.id === pel.id
                                  const isDragOverPel = dragOverId === pel.id

                                  const pelDirectMatch = matchesSearch(pel.nombre, q)
                                  const filteredEscs = q
                                    ? pelDirectMatch
                                      ? pel.escuadras
                                      : pel.escuadras.filter((e) => escMatches(e, q))
                                    : pel.escuadras

                                  return (
                                    <div
                                      key={pel.id}
                                      className={`relative transition-opacity ${isDraggingPel ? "opacity-30" : ""}`}
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation()
                                        setDragging({ id: pel.id, type: "pel" })
                                      }}
                                      onDragOver={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (dragging?.type === "pel") setDragOverId(pel.id)
                                      }}
                                      onDragLeave={() => setDragOverId(null)}
                                      onDragEnd={() => { setDragging(null); setDragOverId(null) }}
                                      onDrop={(e) => { e.stopPropagation(); handleDrop(pel.id, "pel") }}
                                    >
                                      {/* Horizontal connector */}
                                      {connH}

                                      {/* Pelotón row */}
                                      <div
                                        className={`flex items-center gap-1.5 pl-4 pr-2 py-1.5 rounded hover:bg-white/3 group/row transition-colors ${isDragOverPel ? "bg-blue-500/8 outline outline-1 outline-blue-500/20" : ""}`}
                                      >
                                        <GripVertical className="w-3 h-3 text-slate-700 shrink-0 cursor-grab active:cursor-grabbing" />
                                        <button
                                          onClick={() => toggle(pel.id)}
                                          className="text-slate-500 hover:text-slate-300 shrink-0 transition-colors"
                                        >
                                          {pelOpen ? (
                                            <ChevronDown className="w-3 h-3" />
                                          ) : (
                                            <ChevronRight className="w-3 h-3" />
                                          )}
                                        </button>
                                        <span className="text-sm shrink-0" aria-hidden>⚔️</span>
                                        <div className="flex-1 min-w-0">
                                          {isDeletingPel ? (
                                            <InlineDeleteConfirm
                                              nombre={pel.nombre}
                                              hijos={pel.escuadras.length || undefined}
                                              hijosLabel="escuadras"
                                              onConfirm={handleDelete}
                                              onCancel={() => setDeletingInfo(null)}
                                              pending={pending}
                                            />
                                          ) : (
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <InlineName
                                                value={pel.nombre}
                                                isEditing={isEditingPel}
                                                onStartEdit={() => setEditingId(pel.id)}
                                                onSave={(n) => saveName(pel.id, n, "pel")}
                                                onCancel={() => setEditingId(null)}
                                                q={q}
                                                className="text-slate-300 text-sm"
                                              />
                                              <CountBadge count={pel.total_miembros} />
                                            </div>
                                          )}
                                        </div>
                                        {!isDeletingPel && !isEditingPel && (
                                          <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                                            <button
                                              onClick={() => setAddingTo({ parentId: pel.id, level: "esc" })}
                                              title="Agregar escuadra"
                                              className="p-1 rounded text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => setEditingId(pel.id)}
                                              title="Editar nombre"
                                              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() =>
                                                setDeletingInfo({
                                                  id: pel.id,
                                                  type: "pel",
                                                  nombre: pel.nombre,
                                                  hijos: pel.escuadras.length || undefined,
                                                  hijosLabel: "escuadras",
                                                })
                                              }
                                              title="Eliminar"
                                              className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Escuadras */}
                                      {pelOpen && (
                                        <div>
                                          {addingTo?.parentId === pel.id && addingTo.level === "esc" && (
                                            <div className="ml-12 mt-0.5">
                                              <InlineAddInput
                                                placeholder="Nombre de la escuadra…"
                                                onAdd={handleAdd}
                                                onCancel={() => setAddingTo(null)}
                                              />
                                            </div>
                                          )}
                                          {filteredEscs.length === 0 && !addingTo && (
                                            <p className="text-xs text-slate-600 italic py-1 ml-12">Sin escuadras</p>
                                          )}

                                          {/* Vertical line for escuadras */}
                                          <div
                                            className="ml-8 border-l mt-0.5"
                                            style={{ borderColor: "rgba(255,255,255,0.06)" }}
                                          >
                                            {filteredEscs.map((esc) => {
                                              const escOpen = isOpen(esc.id)
                                              const isEditingEsc = editingId === esc.id
                                              const isDeletingEsc = deletingInfo?.id === esc.id
                                              const isDraggingEsc = dragging?.id === esc.id
                                              const isDragOverEsc = dragOverId === esc.id
                                              const hasMembers = esc.miembros.length > 0

                                              return (
                                                <div
                                                  key={esc.id}
                                                  className={`relative transition-opacity ${isDraggingEsc ? "opacity-30" : ""}`}
                                                  draggable
                                                  onDragStart={(e) => {
                                                    e.stopPropagation()
                                                    setDragging({ id: esc.id, type: "esc" })
                                                  }}
                                                  onDragOver={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    if (dragging?.type === "esc") setDragOverId(esc.id)
                                                  }}
                                                  onDragLeave={() => setDragOverId(null)}
                                                  onDragEnd={() => { setDragging(null); setDragOverId(null) }}
                                                  onDrop={(e) => { e.stopPropagation(); handleDrop(esc.id, "esc") }}
                                                >
                                                  {/* Horizontal connector */}
                                                  {connH}

                                                  {/* Escuadra row */}
                                                  <div
                                                    className={`flex items-center gap-1.5 pl-4 pr-2 py-1.5 rounded hover:bg-white/3 group/row transition-colors ${isDragOverEsc ? "bg-blue-500/8 outline outline-1 outline-blue-500/20" : ""}`}
                                                  >
                                                    <GripVertical className="w-3 h-3 text-slate-700 shrink-0 cursor-grab active:cursor-grabbing" />
                                                    {hasMembers ? (
                                                      <button
                                                        onClick={() => toggle(esc.id)}
                                                        className="text-slate-500 hover:text-slate-300 shrink-0 transition-colors"
                                                      >
                                                        {escOpen ? (
                                                          <ChevronDown className="w-3 h-3" />
                                                        ) : (
                                                          <ChevronRight className="w-3 h-3" />
                                                        )}
                                                      </button>
                                                    ) : (
                                                      <span className="w-3 shrink-0" />
                                                    )}
                                                    <span className="text-sm shrink-0" aria-hidden>👥</span>
                                                    <div className="flex-1 min-w-0">
                                                      {isDeletingEsc ? (
                                                        <InlineDeleteConfirm
                                                          nombre={esc.nombre}
                                                          hijos={esc.total_miembros || undefined}
                                                          hijosLabel="miembros quedarán sin unidad"
                                                          onConfirm={handleDelete}
                                                          onCancel={() => setDeletingInfo(null)}
                                                          pending={pending}
                                                        />
                                                      ) : (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                          <InlineName
                                                            value={esc.nombre}
                                                            isEditing={isEditingEsc}
                                                            onStartEdit={() => setEditingId(esc.id)}
                                                            onSave={(n) =>
                                                              saveName(esc.id, n, "esc",
                                                                esc.indicativo_radio
                                                                  ? { indicativo_radio: esc.indicativo_radio }
                                                                  : undefined
                                                              )
                                                            }
                                                            onCancel={() => setEditingId(null)}
                                                            q={q}
                                                            className="text-slate-400 text-sm"
                                                          />
                                                          <IndicativoInline
                                                            escuadraId={esc.id}
                                                            valor={esc.indicativo_radio}
                                                          />
                                                          <FillBadge
                                                            current={esc.total_miembros}
                                                            max={esc.max_miembros}
                                                          />
                                                        </div>
                                                      )}
                                                    </div>
                                                    {!isDeletingEsc && !isEditingEsc && (
                                                      <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                                                        <button
                                                          onClick={() => setEditingId(esc.id)}
                                                          title="Editar nombre"
                                                          className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                                                        >
                                                          <Pencil className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                          onClick={() =>
                                                            setDeletingInfo({
                                                              id: esc.id,
                                                              type: "esc",
                                                              nombre: esc.nombre,
                                                              hijos: esc.total_miembros || undefined,
                                                              hijosLabel: "miembros quedarán sin unidad",
                                                            })
                                                          }
                                                          title="Eliminar"
                                                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                        >
                                                          <Trash2 className="w-3 h-3" />
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>

                                                  {/* Members list */}
                                                  {hasMembers && escOpen && (
                                                    <div
                                                      className="ml-12 mb-1 border-l"
                                                      style={{ borderColor: "rgba(255,255,255,0.05)" }}
                                                    >
                                                      {esc.miembros.map((m, i) => (
                                                        <div
                                                          key={i}
                                                          className="relative flex items-center gap-1.5 pl-3 py-0.5 text-xs text-slate-500"
                                                        >
                                                          <div
                                                            className="absolute left-0 top-[0.6rem] w-3 border-t pointer-events-none"
                                                            style={{ borderColor: "rgba(255,255,255,0.05)" }}
                                                          />
                                                          <span className="shrink-0 text-slate-600">•</span>
                                                          {m.rango && (
                                                            <span className="font-mono text-slate-600 shrink-0">
                                                              [{m.rango}]
                                                            </span>
                                                          )}
                                                          <span className="text-slate-400 truncate">
                                                            {m.nombre_milsim}
                                                          </span>
                                                          {m.rol && (
                                                            <span className="text-slate-600 shrink-0">
                                                              — {m.rol}
                                                            </span>
                                                          )}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
