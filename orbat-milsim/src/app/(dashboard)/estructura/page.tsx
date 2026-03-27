import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getEstructura } from "@/lib/supabase/queries"
import { ArbolEstructura } from "@/components/estructura/arbol-estructura"
import type {
  RegimientoConConteo,
  CompaniaConConteo,
  PelotonConConteo,
  EscuadraConConteo,
  MiembroInline,
} from "@/components/estructura/arbol-estructura"

export const metadata: Metadata = { title: "Estructura" }

// ─── Fetch member counts + names and merge into hierarchy ─────────────────────

async function getEstructuraConConteos(): Promise<RegimientoConConteo[]> {
  const supabase = await createClient()

  const [estructura, miembrosResult] = await Promise.all([
    getEstructura(),
    supabase
      .from("miembros")
      .select("regimiento_id, compania_id, peloton_id, escuadra_id, nombre_milsim, rango, rol")
      .order("nombre_milsim"),
  ])

  const miembros = miembrosResult.data ?? []

  // Build lookup maps: child_id → parent_id
  const escuadraToPeloton: Record<string, string> = {}
  const pelotoneToCompania: Record<string, string> = {}
  const companiaToRegimiento: Record<string, string> = {}

  for (const reg of estructura) {
    for (const comp of reg.companias) {
      companiaToRegimiento[comp.id] = reg.id
      for (const pel of comp.pelotones) {
        pelotoneToCompania[pel.id] = comp.id
        for (const esc of pel.escuadras) {
          escuadraToPeloton[esc.id] = pel.id
        }
      }
    }
  }

  // Aggregate counts bottom-up
  const porRegimiento: Record<string, number> = {}
  const porCompania: Record<string, number> = {}
  const porPeloton: Record<string, number> = {}
  const porEscuadra: Record<string, number> = {}

  // Member lists per escuadra for inline display
  const miembrosPorEscuadra: Record<string, MiembroInline[]> = {}

  for (const m of miembros) {
    if (m.escuadra_id) {
      porEscuadra[m.escuadra_id] = (porEscuadra[m.escuadra_id] ?? 0) + 1
      if (!miembrosPorEscuadra[m.escuadra_id]) miembrosPorEscuadra[m.escuadra_id] = []
      miembrosPorEscuadra[m.escuadra_id].push({
        nombre_milsim: m.nombre_milsim ?? "",
        rango: m.rango ?? null,
        rol: m.rol ?? null,
      })
      const pelId = escuadraToPeloton[m.escuadra_id]
      if (pelId) {
        porPeloton[pelId] = (porPeloton[pelId] ?? 0) + 1
        const compId = pelotoneToCompania[pelId]
        if (compId) {
          porCompania[compId] = (porCompania[compId] ?? 0) + 1
          const regId = companiaToRegimiento[compId]
          if (regId) porRegimiento[regId] = (porRegimiento[regId] ?? 0) + 1
        }
      }
    } else if (m.peloton_id) {
      porPeloton[m.peloton_id] = (porPeloton[m.peloton_id] ?? 0) + 1
      const compId = pelotoneToCompania[m.peloton_id]
      if (compId) {
        porCompania[compId] = (porCompania[compId] ?? 0) + 1
        const regId = companiaToRegimiento[compId]
        if (regId) porRegimiento[regId] = (porRegimiento[regId] ?? 0) + 1
      }
    } else if (m.compania_id) {
      porCompania[m.compania_id] = (porCompania[m.compania_id] ?? 0) + 1
      const regId = companiaToRegimiento[m.compania_id]
      if (regId) porRegimiento[regId] = (porRegimiento[regId] ?? 0) + 1
    } else if (m.regimiento_id) {
      porRegimiento[m.regimiento_id] = (porRegimiento[m.regimiento_id] ?? 0) + 1
    }
  }

  // Merge counts and member lists into hierarchy
  return estructura.map(
    (reg): RegimientoConConteo => ({
      ...reg,
      total_miembros: porRegimiento[reg.id] ?? 0,
      companias: reg.companias.map(
        (comp): CompaniaConConteo => ({
          ...comp,
          total_miembros: porCompania[comp.id] ?? 0,
          pelotones: comp.pelotones.map(
            (pel): PelotonConConteo => ({
              ...pel,
              total_miembros: porPeloton[pel.id] ?? 0,
              escuadras: pel.escuadras.map(
                (esc): EscuadraConConteo => ({
                  ...esc,
                  total_miembros: porEscuadra[esc.id] ?? 0,
                  miembros: miembrosPorEscuadra[esc.id] ?? [],
                })
              ),
            })
          ),
        })
      ),
    })
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EstructuraPage() {
  const regimientos = await getEstructuraConConteos()

  const totalUnidades = regimientos.reduce(
    (acc, r) =>
      acc +
      1 +
      r.companias.length +
      r.companias.reduce(
        (a, c) =>
          a + c.pelotones.length + c.pelotones.reduce((b, p) => b + p.escuadras.length, 0),
        0
      ),
    0
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Estructura</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {regimientos.length} regimiento{regimientos.length !== 1 ? "s" : ""} ·{" "}
          {totalUnidades} unidades en total
        </p>
      </div>

      <ArbolEstructura regimientos={regimientos} />
    </div>
  )
}
