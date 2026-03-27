import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getMiembros, getEstructura } from "@/lib/supabase/queries"
import type { RangoMilitar, CursoRow } from "@/lib/types/database"
import { FiltrosPersonal } from "@/components/personal/filtros-personal"
import { MiembrosTable } from "@/components/personal/miembros-table"
import { MiembroDialog } from "@/components/personal/miembro-dialog"

export const metadata: Metadata = { title: "Personal" }

async function getCursos(): Promise<CursoRow[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("cursos").select("*").order("sigla")
  return data ?? []
}

interface SearchParams {
  q?: string
  rango?: string
  compania_id?: string
  activo?: string
  page?: string
}

export default async function PersonalPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams

  const filtros = {
    busqueda: sp.q || undefined,
    rango: sp.rango as RangoMilitar | undefined,
    compania_id: sp.compania_id || undefined,
    activo:
      sp.activo === "true" ? true : sp.activo === "false" ? false : undefined,
    page: sp.page ? parseInt(sp.page, 10) : 1,
    pageSize: 25,
  }

  const supabase = await createClient()

  const [membrosPage, estructura, cursos, { data: ocupacionRaw }] = await Promise.all([
    getMiembros(filtros),
    getEstructura(),
    getCursos(),
    // Conteo de miembros activos por escuadra para mostrar slots disponibles
    supabase
      .from("miembros")
      .select("escuadra_id")
      .not("escuadra_id", "is", null)
      .eq("activo", true),
  ])

  // Construir mapa escuadra_id → conteo
  const escuadraConteos: Record<string, number> = {}
  for (const row of ocupacionRaw ?? []) {
    const id = row.escuadra_id as string
    escuadraConteos[id] = (escuadraConteos[id] ?? 0) + 1
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Personal</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {membrosPage.count}{" "}
            operador{membrosPage.count !== 1 ? "es" : ""} registrados
          </p>
        </div>
        <MiembroDialog
          mode="create"
          estructura={estructura}
          cursos={cursos}
          escuadraConteos={escuadraConteos}
        />
      </div>

      {/* Filters */}
      <FiltrosPersonal estructura={estructura} />

      {/* Table */}
      <MiembrosTable
        miembros={membrosPage.data}
        totalPages={membrosPage.totalPages}
        currentPage={membrosPage.page}
        estructura={estructura}
        cursos={cursos}
        escuadraConteos={escuadraConteos}
      />
    </div>
  )
}
