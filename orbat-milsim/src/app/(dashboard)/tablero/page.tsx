import { getOrbatCompleto } from "@/lib/supabase/queries"
import { TablerKanban, type KanbanGrupo } from "@/components/tablero/tablero-kanban"

export default async function TablerPage() {
  const orbat = await getOrbatCompleto()

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

      {grupos.length === 0 ? (
        <p className="text-sm text-slate-500">
          No hay escuadras con personal asignado.
        </p>
      ) : (
        <TablerKanban grupos={grupos} />
      )}
    </div>
  )
}
