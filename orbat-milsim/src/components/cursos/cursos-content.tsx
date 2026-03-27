"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, BookOpen, Upload } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { crearCurso, actualizarCurso, eliminarCurso } from "@/app/actions/cursos"
import type { CursoRow } from "@/lib/types/database"
import { BulkImportCursosDialog } from "@/components/cursos/bulk-import-cursos-dialog"

// ─── Types ────────────────────────────────────────────────────────────────────

export type CursoConConteo = CursoRow & { total_miembros: number }

type DialogState =
  | { type: "create" }
  | { type: "edit"; curso: CursoConConteo }
  | { type: "delete"; curso: CursoConConteo }
  | null

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputClass =
  "bg-slate-900 border-white/10 text-slate-200 placeholder:text-slate-600 focus-visible:border-blue-500/50 focus-visible:ring-0"
const labelClass = "text-slate-300 text-sm font-medium"

// ─── Main component ───────────────────────────────────────────────────────────

export function CursosContent({ cursos }: { cursos: CursoConConteo[] }) {
  const [dialog, setDialog] = useState<DialogState>(null)
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  function closeDialog() {
    setDialog(null)
    setFormError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      let result
      if (dialog?.type === "create") {
        result = await crearCurso(fd)
      } else if (dialog?.type === "edit") {
        result = await actualizarCurso(dialog.curso.id, fd)
      } else {
        return
      }

      if ("error" in result) {
        setFormError(result.error)
      } else {
        toast.success(dialog?.type === "create" ? "Curso creado" : "Curso actualizado")
        closeDialog()
      }
    })
  }

  function handleDelete() {
    if (dialog?.type !== "delete") return
    startTransition(async () => {
      const result = await eliminarCurso(dialog.curso.id)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Curso eliminado")
        closeDialog()
      }
    })
  }

  return (
    <>
      {/* Table */}
      {cursos.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <BookOpen className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">
            No hay cursos registrados. Crea el primero.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <Table>
            <TableHeader>
              <TableRow
                className="border-b hover:bg-transparent"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <TableHead className="text-slate-400 font-mono text-xs w-24">
                  Sigla
                </TableHead>
                <TableHead className="text-slate-400 font-mono text-xs">
                  Nombre
                </TableHead>
                <TableHead className="text-slate-400 font-mono text-xs hidden md:table-cell">
                  Descripción
                </TableHead>
                <TableHead className="text-slate-400 font-mono text-xs text-right w-28">
                  Miembros
                </TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cursos.map((curso) => (
                <TableRow
                  key={curso.id}
                  className="border-b group hover:bg-white/3"
                  style={{ borderColor: "rgba(255,255,255,0.04)" }}
                >
                  <TableCell>
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-0.5">
                      {curso.sigla}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-200 font-medium text-sm">
                    {curso.nombre}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm hidden md:table-cell max-w-xs truncate">
                    {curso.descripcion ?? (
                      <span className="italic text-slate-700">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        curso.total_miembros > 0
                          ? "text-slate-300 font-mono text-sm"
                          : "text-slate-600 font-mono text-sm"
                      }
                    >
                      {curso.total_miembros}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-slate-500 hover:text-slate-300 hover:bg-white/5"
                        onClick={() =>
                          setDialog({ type: "edit", curso })
                        }
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() =>
                          setDialog({ type: "delete", curso })
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 h-8"
          onClick={() => setDialog({ type: "create" })}
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo curso
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 border-white/10 text-slate-300 hover:text-slate-100 hover:bg-white/5"
          onClick={() => setBulkOpen(true)}
        >
          <Upload className="w-3.5 h-3.5" />
          Importar en masa
        </Button>
      </div>

      <BulkImportCursosDialog open={bulkOpen} onOpenChange={setBulkOpen} />

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent
          className="sm:max-w-sm border"
          style={{
            background: "#111827",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          {/* Create / Edit */}
          {(dialog?.type === "create" || dialog?.type === "edit") && (
            <>
              <DialogHeader>
                <DialogTitle className="text-slate-100">
                  {dialog.type === "create" ? "Nuevo curso" : "Editar curso"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sigla" className={labelClass}>
                    Sigla <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="sigla"
                    name="sigla"
                    defaultValue={
                      dialog.type === "edit" ? dialog.curso.sigla : ""
                    }
                    placeholder="e.g. BAS, AIT, SNCO…"
                    required
                    autoFocus
                    className={`${inputClass} uppercase`}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nombre" className={labelClass}>
                    Nombre <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    defaultValue={
                      dialog.type === "edit" ? dialog.curso.nombre : ""
                    }
                    placeholder="Nombre completo del curso…"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="descripcion" className={labelClass}>
                    Descripción
                  </Label>
                  <Textarea
                    id="descripcion"
                    name="descripcion"
                    defaultValue={
                      dialog.type === "edit"
                        ? (dialog.curso.descripcion ?? "")
                        : ""
                    }
                    placeholder="Descripción opcional…"
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>

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
          )}

          {/* Delete confirm */}
          {dialog?.type === "delete" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-slate-100">
                  Eliminar curso
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 mt-2">
                <p className="text-sm text-slate-300">
                  ¿Eliminar el curso{" "}
                  <span className="font-mono font-bold text-blue-400">
                    {dialog.curso.sigla}
                  </span>{" "}
                  —{" "}
                  <span className="font-semibold text-slate-100">
                    {dialog.curso.nombre}
                  </span>
                  ?
                </p>

                {dialog.curso.total_miembros > 0 && (
                  <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5">
                    <p className="text-xs text-amber-400">
                      <span className="font-semibold">
                        {dialog.curso.total_miembros}
                      </span>{" "}
                      operador
                      {dialog.curso.total_miembros !== 1 ? "es tienen" : " tiene"}{" "}
                      este curso asignado. Se eliminará de su historial.
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
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
