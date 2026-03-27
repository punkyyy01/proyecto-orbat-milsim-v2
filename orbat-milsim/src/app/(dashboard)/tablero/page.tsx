import { getOrbatCompleto } from "@/lib/supabase/queries"
import { TablerKanban, type KanbanGrupo } from "@/components/tablero/tablero-kanban"

export default async function TablerPage() {
  let orbat: Awaited<ReturnType<typeof getOrbatCompleto>> = []
  let errorMsg: string | null = null

  try {
    orbat = await getOrbatCompleto()
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Error desconocido al cargar el ORBAT."
  }

  const grupos: KanbanGrupo[] = orbat.flatMap(reg =>
    reg.companias.map(comp => ({
      compania_id: comp.id,
      compania_nombre: comp.nombre,
      pelotones: comp.pelotones
        .map(pel => ({
          peloton_id: pel.id,
          peloton_nombre: pel.nombre,
          escuadras: pel.escuadras.map(esc => ({
            id: esc.id,
            nombre: esc.nombre,
            indicativo_radio: esc.indicativo_radio,
            max_miembros: esc.max_miembros,
            miembros: esc.miembros.map(m => ({
              id: m.miembro_id,
              nombre_milsim: m.nombre_milsim,
              rango: m.rango,
              rol: m.rol,
            })),
          })),
        }))
        .filter(pel => pel.escuadras.length > 0),
    })).filter(comp => comp.pelotones.length > 0)
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Tablero de Escuadras</h1>
        <p className="text-sm text-slate-500 mt-1">
          Arrastra operadores entre escuadras para transferirlos. Si la escuadra destino está llena se ofrecerá un intercambio.
        </p>
      </div>

      {errorMsg ? (
        <div className="rounded-md border border-red-800 bg-red-950/40 p-4 text-sm text-red-400">
          <p className="font-medium">No se pudo cargar el tablero</p>
          <p className="mt-1 font-mono text-xs text-red-500">{errorMsg}</p>
          <p className="mt-2 text-xs text-slate-500">
            Posible causa: la vista <code>vista_orbat</code> aún no existe en la base de datos. Ejecuta el schema SQL en Supabase.
          </p>
        </div>
      ) : grupos.length === 0 ? (
        <p className="text-sm text-slate-500">
          No hay escuadras con personal asignado.
        </p>
      ) : (
        <TablerKanban grupos={grupos} />
      )}
    </div>
  )
}
