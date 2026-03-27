"use client"

import { useState, useCallback } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { transferirMiembro, intercambiarMiembros } from "@/app/actions/tablero"
import { RANKS } from "@/constants"

// ─── Types ────────────────────────────────────────────────────────────────────

export type KanbanMiembro = {
  id: string
  nombre_milsim: string
  rango: string
  rol: string | null
}

export type KanbanEscuadra = {
  id: string
  nombre: string
  indicativo_radio: string | null
  max_miembros: number
  miembros: KanbanMiembro[]
}

export type KanbanPeloton = {
  peloton_id: string
  peloton_nombre: string
  escuadras: KanbanEscuadra[]
}

export type KanbanGrupo = {
  compania_id: string
  compania_nombre: string
  pelotones: KanbanPeloton[]
}

// ─── Rank badge color ─────────────────────────────────────────────────────────

const RANK_COLORS: Record<string, string> = {
  officer:  "bg-blue-900/60 text-blue-300 border-blue-700/40",
  warrant:  "bg-purple-900/60 text-purple-300 border-purple-700/40",
  nco:      "bg-amber-900/60 text-amber-300 border-amber-700/40",
  enlisted: "bg-slate-700/60 text-slate-300 border-slate-600/40",
}

function rankColor(rango: string): string {
  const rank = RANKS.find(r => r.code === rango)
  return RANK_COLORS[rank?.category ?? "enlisted"]
}

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({
  miembro,
  escuadraId,
  ghost = false,
}: {
  miembro: KanbanMiembro
  escuadraId: string
  ghost?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: miembro.id,
    data: { escuadraId },
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 1 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-lg border border-white/8 bg-slate-800/60 px-3 py-2",
        "cursor-grab select-none touch-none transition-colors",
        "hover:bg-slate-800 hover:border-white/15",
        (isDragging || ghost) && "opacity-30",
      )}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className={cn(
          "shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border",
          rankColor(miembro.rango)
        )}>
          {miembro.rango}
        </span>
        <span className="text-sm font-medium text-slate-100 truncate">
          {miembro.nombre_milsim}
        </span>
      </div>
      {miembro.rol && (
        <p className="text-[11px] text-slate-500 truncate pl-0.5">{miembro.rol}</p>
      )}
    </div>
  )
}

// ─── Squad Column ─────────────────────────────────────────────────────────────

function SquadColumn({
  escuadra,
  draggingMiembroId,
}: {
  escuadra: KanbanEscuadra
  draggingMiembroId: string | null
}) {
  const isFull = escuadra.miembros.length >= escuadra.max_miembros
  const { setNodeRef, isOver } = useDroppable({ id: escuadra.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-48 shrink-0 flex flex-col rounded-xl border transition-all duration-150",
        isFull
          ? "border-red-500/40 bg-red-950/10"
          : "border-white/8 bg-slate-900/50",
        isOver && !isFull && "border-blue-500/60 bg-blue-950/15 ring-1 ring-blue-500/20",
        isOver && isFull  && "border-orange-500/50 bg-orange-950/10 ring-1 ring-orange-500/20",
      )}
    >
      {/* Header */}
      <div className={cn(
        "px-3 py-2.5 border-b flex items-center justify-between gap-2",
        isFull ? "border-red-500/20" : "border-white/6",
      )}>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-200 truncate">
            {escuadra.nombre}
          </p>
          {escuadra.indicativo_radio && (
            <p className="text-[10px] text-slate-500 font-mono truncate">
              {escuadra.indicativo_radio}
            </p>
          )}
        </div>
        <span className={cn(
          "text-[11px] font-mono tabular-nums shrink-0",
          isFull ? "text-red-400 font-semibold" : "text-slate-500",
        )}>
          {escuadra.miembros.length}/{escuadra.max_miembros}
        </span>
      </div>

      {/* Members */}
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-[5rem]">
        {escuadra.miembros.map(m => (
          <MemberCard
            key={m.id}
            miembro={m}
            escuadraId={escuadra.id}
            ghost={m.id === draggingMiembroId}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Drag Overlay Card ────────────────────────────────────────────────────────

function OverlayCard({ miembro }: { miembro: KanbanMiembro }) {
  return (
    <div className="w-48 rounded-lg border border-blue-500/50 bg-slate-800 px-3 py-2 shadow-xl shadow-black/50 cursor-grabbing">
      <div className="flex items-center gap-2 mb-0.5">
        <span className={cn(
          "shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border",
          rankColor(miembro.rango)
        )}>
          {miembro.rango}
        </span>
        <span className="text-sm font-medium text-slate-100 truncate">
          {miembro.nombre_milsim}
        </span>
      </div>
      {miembro.rol && (
        <p className="text-[11px] text-slate-500 truncate pl-0.5">{miembro.rol}</p>
      )}
    </div>
  )
}

// ─── Swap Dialog ──────────────────────────────────────────────────────────────

type SwapState = {
  miembroId: string
  miembroNick: string
  sourceEscuadraId: string
  targetEscuadra: KanbanEscuadra
}

function SwapDialog({
  state,
  onClose,
  onConfirm,
  pending,
}: {
  state: SwapState
  onClose: () => void
  onConfirm: (swapMiembroId: string) => void
  pending: boolean
}) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Escuadra llena — Intercambiar</DialogTitle>
          <DialogDescription>
            <strong className="text-slate-200">{state.targetEscuadra.nombre}</strong> está al máximo ({state.targetEscuadra.max_miembros}/{state.targetEscuadra.max_miembros}).
            {" "}Elige con quién intercambiar a{" "}
            <strong className="text-slate-200">{state.miembroNick}</strong>:
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          {state.targetEscuadra.miembros.map(m => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                selected === m.id
                  ? "border-blue-500/50 bg-blue-950/20"
                  : "border-white/8 bg-slate-800/60 hover:bg-slate-700/50",
              )}
            >
              <span className={cn(
                "shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border",
                rankColor(m.rango),
              )}>
                {m.rango}
              </span>
              <span className="text-sm text-slate-200 truncate flex-1">{m.nombre_milsim}</span>
              {m.rol && (
                <span className="text-[11px] text-slate-500 shrink-0">{m.rol}</span>
              )}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            disabled={!selected || pending}
            onClick={() => selected && onConfirm(selected)}
          >
            {pending ? "Procesando…" : "Confirmar intercambio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Kanban Board ────────────────────────────────────────────────────────

export function TablerKanban({ grupos: initialGrupos }: { grupos: KanbanGrupo[] }) {
  const [grupos, setGrupos] = useState<KanbanGrupo[]>(initialGrupos)
  const [activeCard, setActiveCard] = useState<{ miembro: KanbanMiembro; escuadraId: string } | null>(null)
  const [swapState, setSwapState] = useState<SwapState | null>(null)
  const [pending, setPending] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const findMiembro = useCallback((miembroId: string) => {
    for (const g of grupos) {
      for (const p of g.pelotones) {
        for (const e of p.escuadras) {
          const m = e.miembros.find(m => m.id === miembroId)
          if (m) return { miembro: m, escuadraId: e.id }
        }
      }
    }
    return null
  }, [grupos])

  const findEscuadra = useCallback((escuadraId: string) => {
    for (const g of grupos) {
      for (const p of g.pelotones) {
        const e = p.escuadras.find(e => e.id === escuadraId)
        if (e) return e
      }
    }
    return null
  }, [grupos])

  const moveMiembro = useCallback((miembroId: string, fromId: string, toId: string) => {
    setGrupos(prev => {
      const next = structuredClone(prev)
      let miembro: KanbanMiembro | undefined
      for (const g of next) {
        for (const p of g.pelotones) {
          for (const e of p.escuadras) {
            if (e.id === fromId) {
              const idx = e.miembros.findIndex(m => m.id === miembroId)
              if (idx !== -1) [miembro] = e.miembros.splice(idx, 1)
            }
          }
        }
      }
      if (!miembro) return prev
      for (const g of next) {
        for (const p of g.pelotones) {
          for (const e of p.escuadras) {
            if (e.id === toId) e.miembros.push(miembro!)
          }
        }
      }
      return next
    })
  }, [])

  const swapMiembros = useCallback((m1Id: string, e1Id: string, m2Id: string, e2Id: string) => {
    setGrupos(prev => {
      const next = structuredClone(prev)
      let m1: KanbanMiembro | undefined
      let m2: KanbanMiembro | undefined
      // Collect references
      for (const g of next) {
        for (const p of g.pelotones) {
          for (const e of p.escuadras) {
            if (e.id === e1Id) m1 = e.miembros.find(m => m.id === m1Id)
            if (e.id === e2Id) m2 = e.miembros.find(m => m.id === m2Id)
          }
        }
      }
      if (!m1 || !m2) return prev
      // Swap in place
      for (const g of next) {
        for (const p of g.pelotones) {
          for (const e of p.escuadras) {
            if (e.id === e1Id) {
              const idx = e.miembros.findIndex(m => m.id === m1Id)
              if (idx !== -1) e.miembros[idx] = m2!
            }
            if (e.id === e2Id) {
              const idx = e.miembros.findIndex(m => m.id === m2Id)
              if (idx !== -1) e.miembros[idx] = m1!
            }
          }
        }
      }
      return next
    })
  }, [])

  const handleDragStart = (event: DragStartEvent) => {
    const found = findMiembro(event.active.id as string)
    if (found) setActiveCard(found)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over || pending) return

    const miembroId = active.id as string
    const sourceEscuadraId = (active.data.current?.escuadraId as string) ?? ""
    const targetEscuadraId = over.id as string

    if (sourceEscuadraId === targetEscuadraId) return

    const found = findMiembro(miembroId)
    const targetEscuadra = findEscuadra(targetEscuadraId)
    if (!found || !targetEscuadra) return

    if (targetEscuadra.miembros.length < targetEscuadra.max_miembros) {
      // Transferencia directa — optimista
      moveMiembro(miembroId, sourceEscuadraId, targetEscuadraId)
      setPending(true)
      const result = await transferirMiembro(miembroId, targetEscuadraId)
      setPending(false)
      if ("error" in result) {
        moveMiembro(miembroId, targetEscuadraId, sourceEscuadraId)
        toast.error(result.error)
      } else {
        toast.success(`${found.miembro.nombre_milsim} → ${targetEscuadra.nombre}`)
      }
    } else {
      // Escuadra llena: mostrar diálogo de intercambio
      setSwapState({
        miembroId,
        miembroNick: found.miembro.nombre_milsim,
        sourceEscuadraId,
        targetEscuadra,
      })
    }
  }

  const handleSwapConfirm = async (swapMiembroId: string) => {
    if (!swapState) return
    const { miembroId, sourceEscuadraId, targetEscuadra } = swapState
    const swapMiembro = targetEscuadra.miembros.find(m => m.id === swapMiembroId)

    // Optimistic swap
    swapMiembros(miembroId, sourceEscuadraId, swapMiembroId, targetEscuadra.id)
    setSwapState(null)

    setPending(true)
    const result = await intercambiarMiembros(
      miembroId, sourceEscuadraId,
      swapMiembroId, targetEscuadra.id,
    )
    setPending(false)

    if ("error" in result) {
      // Revertir
      swapMiembros(miembroId, targetEscuadra.id, swapMiembroId, sourceEscuadraId)
      toast.error(result.error)
    } else {
      toast.success(`Intercambio completado con ${swapMiembro?.nombre_milsim ?? "operador"}`)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-8">
        {grupos.map(grupo => (
          <section key={grupo.compania_id}>
            {/* Compañía header */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest shrink-0">
                {grupo.compania_nombre}
              </h2>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>

            <div className="flex flex-col gap-5">
              {grupo.pelotones.map(peloton => (
                <div key={peloton.peloton_id}>
                  {/* Pelotón sub-header */}
                  <p className="text-[11px] text-slate-600 mb-2.5 font-medium tracking-wide uppercase">
                    ↳ {peloton.peloton_nombre}
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {peloton.escuadras.map(escuadra => (
                      <SquadColumn
                        key={escuadra.id}
                        escuadra={escuadra}
                        draggingMiembroId={activeCard?.miembro.id ?? null}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard && <OverlayCard miembro={activeCard.miembro} />}
      </DragOverlay>

      {swapState && (
        <SwapDialog
          state={swapState}
          onClose={() => setSwapState(null)}
          onConfirm={handleSwapConfirm}
          pending={pending}
        />
      )}
    </DndContext>
  )
}
