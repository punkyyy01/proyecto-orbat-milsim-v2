"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MiembroDialog } from "@/components/personal/miembro-dialog"
import { BulkImportMiembrosDialog } from "@/components/personal/bulk-import-miembros-dialog"
import type { CursoRow } from "@/lib/types/database"
import type { EstructuraRegimiento } from "@/lib/supabase/queries"

interface Props {
  estructura: EstructuraRegimiento[]
  cursos: CursoRow[]
  escuadraConteos: Record<string, number>
}

export function PersonalHeaderActions({ estructura, cursos, escuadraConteos }: Props) {
  const [bulkOpen, setBulkOpen] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 h-9 border-white/10 text-slate-300 hover:text-slate-100 hover:bg-white/5"
        onClick={() => setBulkOpen(true)}
      >
        <Upload className="w-3.5 h-3.5" />
        Importar en masa
      </Button>

      <MiembroDialog
        mode="create"
        estructura={estructura}
        cursos={cursos}
        escuadraConteos={escuadraConteos}
      />

      <BulkImportMiembrosDialog open={bulkOpen} onOpenChange={setBulkOpen} estructura={estructura} />
    </div>
  )
}
