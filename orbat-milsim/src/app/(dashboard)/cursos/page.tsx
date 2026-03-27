import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { CursosContent } from "@/components/cursos/cursos-content"
import type { CursoConConteo } from "@/components/cursos/cursos-content"

export const metadata: Metadata = { title: "Cursos" }

async function getCursosConConteo(): Promise<CursoConConteo[]> {
  const supabase = await createClient()

  const [cursosResult, conteosResult] = await Promise.all([
    supabase.from("cursos").select("*").order("sigla"),
    supabase.from("miembro_cursos").select("curso_id"),
  ])

  const cursos = cursosResult.data ?? []
  const miembroCursos = conteosResult.data ?? []

  // Count members per curso
  const conteoMap: Record<string, number> = {}
  for (const mc of miembroCursos) {
    conteoMap[mc.curso_id] = (conteoMap[mc.curso_id] ?? 0) + 1
  }

  return cursos.map((c) => ({
    ...c,
    total_miembros: conteoMap[c.id] ?? 0,
  }))
}

export default async function CursosPage() {
  const cursos = await getCursosConConteo()

  const totalAsignaciones = cursos.reduce((acc, c) => acc + c.total_miembros, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Cursos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {cursos.length} curso{cursos.length !== 1 ? "s" : ""} ·{" "}
            {totalAsignaciones} asignaciones
          </p>
        </div>
      </div>

      <CursosContent cursos={cursos} />
    </div>
  )
}
