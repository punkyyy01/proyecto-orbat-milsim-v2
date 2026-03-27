"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition, useState } from "react"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { RANKS, RANKS_BY_CATEGORY } from "@/constants"
import { toggleActivoMiembro, eliminarMiembro, cambiarRangoMiembro } from "@/app/actions/personal"
import { MiembroDialog } from "@/components/personal/miembro-dialog"
import type { MiembroRow, CursoRow, RangoMilitar } from "@/lib/types/database"
import type { EstructuraRegimiento } from "@/lib/supabase/queries"

// ─── Rank styling ─────────────────────────────────────────────────────────────

const RANK_CAT_MAP = new Map(RANKS.map((r) => [r.code, r.category]))

const CAT_CLASSES: Record<string, string> = {
  officer:  "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  warrant:  "text-orange-400 border-orange-500/30 bg-orange-500/10",
  nco:      "text-green-400  border-green-500/30  bg-green-500/10",
  enlisted: "text-slate-400  border-slate-500/30  bg-slate-500/10",
}

function rankClass(rango: string) {
  return CAT_CLASSES[RANK_CAT_MAP.get(rango) ?? "enlisted"]
}

// ─── Unit label helper ────────────────────────────────────────────────────────

function getUnidadLabel(
  m: MiembroRow,
  estructura: EstructuraRegimiento[]
): string {
  if (m.escuadra_id) {
    for (const reg of estructura)
      for (const comp of reg.companias)
        for (const pel of comp.pelotones)
          for (const esc of pel.escuadras)
            if (esc.id === m.escuadra_id) return esc.nombre
  }
  if (m.peloton_id) {
    for (const reg of estructura)
      for (const comp of reg.companias)
        for (const pel of comp.pelotones)
          if (pel.id === m.peloton_id) return pel.nombre
  }
  if (m.compania_id) {
    for (const reg of estructura)
      for (const comp of reg.companias)
        if (comp.id === m.compania_id) return comp.nombre
  }
  if (m.regimiento_id) {
    for (const reg of estructura)
      if (reg.id === m.regimiento_id) return reg.nombre
  }
  return "—"
}

// ─── Inline Active Toggle ─────────────────────────────────────────────────────

function ActiveToggle({ id, activo }: { id: string; activo: boolean }) {
  const [pending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState(activo)

  function handleToggle() {
    const next = !optimistic
    setOptimistic(next)
    startTransition(async () => {
      const result = await toggleActivoMiembro(id, next)
      if ("error" in result) {
        setOptimistic(!next)
        toast.error(result.error)
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      title={optimistic ? "Activo — click para desactivar" : "Inactivo — click para activar"}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full border transition-colors",
        optimistic
          ? "bg-green-600 border-green-500/50"
          : "bg-slate-700 border-slate-600/50",
        pending && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
          optimistic ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

// ─── Inline Rank Select ───────────────────────────────────────────────────────

const CATEGORIAS = [
  { key: "officer"  as const, label: "Oficiales" },
  { key: "warrant"  as const, label: "Warrant Officers" },
  { key: "nco"      as const, label: "Suboficiales" },
  { key: "enlisted" as const, label: "Tropa" },
]

function RankSelectInline({ id, rango }: { id: string; rango: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Select
      value={rango}
      onValueChange={(value) => {
        startTransition(async () => {
          const result = await cambiarRangoMiembro(id, value as RangoMilitar)
          if ("error" in result) toast.error(result.error)
        })
      }}
      disabled={pending}
    >
      <SelectTrigger
        className={cn(
          "h-6 px-2 text-xs font-mono border rounded w-auto gap-1 focus:ring-0",
          rankClass(rango),
          "bg-transparent hover:opacity-80"
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        className="border"
        style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.1)" }}
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
                className="text-slate-200 text-xs font-mono"
              >
                {r.code} — {r.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

// ─── Delete Button with Dialog confirmation ───────────────────────────────────

function DeleteButton({ id, nombre }: { id: string; nombre: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await eliminarMiembro(id)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success(`${nombre} eliminado`)
        setOpen(false)
      }
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="w-7 h-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-sm border"
          style={{
            background: "#0f172a",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                ¿Eliminar operador?
              </h3>
              <p className="text-sm text-slate-400 mt-1.5">
                Esto eliminará permanentemente a{" "}
                <span className="text-slate-200 font-medium">{nombre}</span>{" "}
                y todos sus registros de cursos. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  className="text-slate-400 hover:text-slate-200 hover:bg-white/5"
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Main Table ───────────────────────────────────────────────────────────────

interface Props {
  miembros: MiembroRow[]
  totalPages: number
  currentPage: number
  estructura: EstructuraRegimiento[]
  cursos: CursoRow[]
}

export function MiembrosTable({
  miembros,
  totalPages,
  currentPage,
  estructura,
  cursos,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    router.push(`${pathname}?${params.toString()}`)
  }

  if (miembros.length === 0) {
    return (
      <div
        className="rounded-xl border py-20 text-center"
        style={{
          background: "#0f172a",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <p className="text-slate-500 text-sm">
          No hay operadores que coincidan con los filtros.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <Table>
          <TableHeader>
            <TableRow
              className="border-b hover:bg-transparent"
              style={{
                background: "rgba(15,23,42,0.8)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <TableHead className="text-slate-400 text-xs font-medium w-32">
                Rango
              </TableHead>
              <TableHead className="text-slate-400 text-xs font-medium">
                Nick
              </TableHead>
              <TableHead className="text-slate-400 text-xs font-medium hidden md:table-cell">
                Rol
              </TableHead>
              <TableHead className="text-slate-400 text-xs font-medium hidden lg:table-cell">
                Unidad
              </TableHead>
              <TableHead className="text-slate-400 text-xs font-medium w-20 text-center">
                Estado
              </TableHead>
              <TableHead className="text-slate-400 text-xs font-medium w-20 text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {miembros.map((m) => (
              <TableRow
                key={m.id}
                className="border-b hover:bg-white/[0.02] group"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              >
                {/* Rango (inline select) */}
                <TableCell className="py-2.5">
                  <RankSelectInline id={m.id} rango={m.rango} />
                </TableCell>

                {/* Nick */}
                <TableCell className="py-2.5">
                  <span className="text-slate-200 text-sm font-medium">
                    {m.nombre_milsim}
                  </span>
                </TableCell>

                {/* Rol */}
                <TableCell className="py-2.5 hidden md:table-cell">
                  <span className="text-slate-400 text-sm">
                    {m.rol || "—"}
                  </span>
                </TableCell>

                {/* Unidad */}
                <TableCell className="py-2.5 hidden lg:table-cell">
                  <span className="text-slate-400 text-sm">
                    {getUnidadLabel(m, estructura)}
                  </span>
                </TableCell>

                {/* Estado (toggle) */}
                <TableCell className="py-2.5 text-center">
                  <ActiveToggle id={m.id} activo={m.activo} />
                </TableCell>

                {/* Acciones */}
                <TableCell className="py-2.5">
                  <div className="flex items-center justify-end gap-0.5">
                    <MiembroDialog
                      mode="edit"
                      miembro={m}
                      estructura={estructura}
                      cursos={cursos}
                    />
                    <DeleteButton id={m.id} nombre={m.nombre_milsim} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-white/5"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-white/5"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
