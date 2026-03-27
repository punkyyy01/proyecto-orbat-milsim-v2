import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AppRole,
  CursoRow,
  MiembroCursoRow,
  MiembroRow,
  RangoMilitar,
  VistaOrbatPublicaRow,
  VistaOrbatRow,
} from "@/lib/types/database";

// ─── Tipos de retorno ────────────────────────────────────────────────────────

export type MiembroOrbat = Pick<
  VistaOrbatRow,
  | "miembro_id"
  | "nombre_milsim"
  | "rango"
  | "rol"
  | "activo"
  | "fecha_ingreso"
  | "discord_id"
  | "steam_id"
  | "notas_admin"
>;

export type MiembroOrbatPublico = Pick<
  VistaOrbatPublicaRow,
  "miembro_id" | "nombre_milsim" | "rango" | "rol" | "fecha_ingreso"
>;

export type OrbatEscuadra = {
  id: string;
  nombre: string;
  indicativo_radio: string | null;
  max_miembros: number;
  orden: number;
  miembros: MiembroOrbat[];
};

export type OrbatPeloton = {
  id: string;
  nombre: string;
  orden: number;
  escuadras: OrbatEscuadra[];
  /** Miembros asignados directamente al pelotón (sin escuadra) */
  miembros_directos: MiembroOrbat[];
};

export type OrbatCompania = {
  id: string;
  nombre: string;
  logo_url: string | null;
  orden: number;
  pelotones: OrbatPeloton[];
  /** Miembros asignados directamente a la compañía (sin pelotón) */
  miembros_directos: MiembroOrbat[];
};

export type OrbatRegimiento = {
  id: string;
  nombre: string;
  descripcion: string | null;
  comandante: string | null;
  companias: OrbatCompania[];
  /** Miembros asignados directamente al regimiento (sin compañía) */
  miembros_directos: MiembroOrbat[];
};

export type MiembroConCursos = MiembroRow & {
  cursos: (MiembroCursoRow & { curso: CursoRow })[];
};

export type MiembrosFiltros = {
  activo?: boolean;
  rango?: RangoMilitar;
  regimiento_id?: string;
  compania_id?: string;
  peloton_id?: string;
  escuadra_id?: string;
  /** Búsqueda por nombre_milsim (ilike) */
  busqueda?: string;
  page?: number;
  pageSize?: number;
};

export type MiembrosPage = {
  data: MiembroRow[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Estructura jerárquica para selects (sin miembros)
export type EstructuraEscuadra = {
  id: string;
  nombre: string;
  indicativo_radio: string | null;
  max_miembros: number;
  orden: number;
};

export type EstructuraPeloton = {
  id: string;
  nombre: string;
  orden: number;
  escuadras: EstructuraEscuadra[];
};

export type EstructuraCompania = {
  id: string;
  nombre: string;
  logo_url: string | null;
  orden: number;
  pelotones: EstructuraPeloton[];
};

export type EstructuraRegimiento = {
  id: string;
  nombre: string;
  descripcion: string | null;
  comandante: string | null;
  companias: EstructuraCompania[];
};

// ─── Helpers internos ────────────────────────────────────────────────────────

function extractMiembro(row: VistaOrbatRow): MiembroOrbat {
  return {
    miembro_id: row.miembro_id,
    nombre_milsim: row.nombre_milsim,
    rango: row.rango,
    rol: row.rol,
    activo: row.activo,
    fecha_ingreso: row.fecha_ingreso,
    discord_id: row.discord_id,
    steam_id: row.steam_id,
    notas_admin: row.notas_admin,
  };
}

/**
 * Agrupa las filas planas de vista_orbat en un árbol regimiento > compañía >
 * pelotón > escuadra, colocando a cada miembro en el nivel más profundo al
 * que está asignado.
 */
function groupOrbatRows(rows: VistaOrbatRow[]): OrbatRegimiento[] {
  const regimientoMap = new Map<string, OrbatRegimiento>();

  for (const row of rows) {
    if (!row.regimiento_id || !row.regimiento_nombre) continue;

    // ── Regimiento ──────────────────────────────────────────────────────────
    if (!regimientoMap.has(row.regimiento_id)) {
      regimientoMap.set(row.regimiento_id, {
        id: row.regimiento_id,
        nombre: row.regimiento_nombre,
        descripcion: row.regimiento_descripcion,
        comandante: row.regimiento_comandante,
        companias: [],
        miembros_directos: [],
      });
    }
    const regimiento = regimientoMap.get(row.regimiento_id)!;

    // Miembro asignado directamente al regimiento
    if (!row.compania_id) {
      regimiento.miembros_directos.push(extractMiembro(row));
      continue;
    }

    // ── Compañía ────────────────────────────────────────────────────────────
    let compania = regimiento.companias.find((c) => c.id === row.compania_id);
    if (!compania) {
      compania = {
        id: row.compania_id,
        nombre: row.compania_nombre!,
        logo_url: row.compania_logo_url,
        orden: row.compania_orden ?? 0,
        pelotones: [],
        miembros_directos: [],
      };
      regimiento.companias.push(compania);
    }

    // Miembro asignado directamente a la compañía
    if (!row.peloton_id) {
      compania.miembros_directos.push(extractMiembro(row));
      continue;
    }

    // ── Pelotón ─────────────────────────────────────────────────────────────
    let peloton = compania.pelotones.find((p) => p.id === row.peloton_id);
    if (!peloton) {
      peloton = {
        id: row.peloton_id,
        nombre: row.peloton_nombre!,
        orden: row.peloton_orden ?? 0,
        escuadras: [],
        miembros_directos: [],
      };
      compania.pelotones.push(peloton);
    }

    // Miembro asignado directamente al pelotón
    if (!row.escuadra_id) {
      peloton.miembros_directos.push(extractMiembro(row));
      continue;
    }

    // ── Escuadra ────────────────────────────────────────────────────────────
    let escuadra = peloton.escuadras.find((e) => e.id === row.escuadra_id);
    if (!escuadra) {
      escuadra = {
        id: row.escuadra_id,
        nombre: row.escuadra_nombre!,
        indicativo_radio: row.escuadra_indicativo_radio,
        max_miembros: row.escuadra_max_miembros ?? 5,
        orden: row.escuadra_orden ?? 0,
        miembros: [],
      };
      peloton.escuadras.push(escuadra);
    }

    escuadra.miembros.push(extractMiembro(row));
  }

  // Ordenar por campo `orden` en todos los niveles
  const result = Array.from(regimientoMap.values());
  for (const reg of result) {
    reg.companias.sort((a, b) => a.orden - b.orden);
    for (const comp of reg.companias) {
      comp.pelotones.sort((a, b) => a.orden - b.orden);
      for (const pel of comp.pelotones) {
        pel.escuadras.sort((a, b) => a.orden - b.orden);
      }
    }
  }

  return result;
}

// ─── Queries públicas ────────────────────────────────────────────────────────

/**
 * Devuelve el ORBAT completo (con datos sensibles).
 * Usar solo en Server Components/Actions protegidos por rol.
 */
export async function getOrbatCompleto(): Promise<OrbatRegimiento[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vista_orbat")
    .select("*")
    .order("regimiento_nombre")
    .order("compania_orden")
    .order("peloton_orden")
    .order("escuadra_orden");

  if (error) throw new Error(`getOrbatCompleto: ${error.message}`);

  return groupOrbatRows(data ?? []);
}

/**
 * Devuelve el ORBAT público (solo miembros activos, sin datos sensibles).
 * Usa el admin client para bypasear RLS ya que los visitantes no tienen sesión.
 * La vista vista_orbat_publica ya excluye miembros inactivos y datos sensibles.
 */
export async function getOrbatPublico(): Promise<OrbatRegimiento[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("vista_orbat_publica")
    .select("*")
    .order("regimiento_nombre")
    .order("compania_orden")
    .order("peloton_orden")
    .order("escuadra_orden");

  if (error) throw new Error(`getOrbatPublico: ${error.message}`);

  // La vista_orbat_publica tiene el mismo shape de jerarquía pero sin campos
  // sensibles. Casteamos para reutilizar groupOrbatRows añadiendo los nulls.
  const rowsNormalizados = (data ?? []).map((row) => ({
    ...row,
    activo: true as const,
    discord_id: null,
    steam_id: null,
    notas_admin: null,
  })) satisfies VistaOrbatRow[];

  return groupOrbatRows(rowsNormalizados);
}

/**
 * Lista de miembros con paginación y filtros opcionales.
 */
export async function getMiembros(
  filtros: MiembrosFiltros = {}
): Promise<MiembrosPage> {
  const {
    activo,
    rango,
    regimiento_id,
    compania_id,
    peloton_id,
    escuadra_id,
    busqueda,
    page = 1,
    pageSize = 20,
  } = filtros;

  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("miembros")
    .select("*", { count: "exact" })
    .range(from, to)
    .order("nombre_milsim");

  if (activo !== undefined) query = query.eq("activo", activo);
  if (rango) query = query.eq("rango", rango);
  if (regimiento_id) query = query.eq("regimiento_id", regimiento_id);
  if (compania_id) query = query.eq("compania_id", compania_id);
  if (peloton_id) query = query.eq("peloton_id", peloton_id);
  if (escuadra_id) query = query.eq("escuadra_id", escuadra_id);
  if (busqueda) query = query.ilike("nombre_milsim", `%${busqueda}%`);

  const { data, error, count } = await query;

  if (error) throw new Error(`getMiembros: ${error.message}`);

  const total = count ?? 0;
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Obtiene un miembro por ID junto a sus cursos completados.
 * Devuelve null si no existe.
 */
export async function getMiembro(
  id: string
): Promise<MiembroConCursos | null> {
  const supabase = await createClient();

  const [
    { data: miembro, error: miembroError },
    { data: miembroCursos, error: cursosError },
  ] = await Promise.all([
    supabase.from("miembros").select("*").eq("id", id).single(),
    supabase
      .from("miembro_cursos")
      .select("*, curso:cursos(*)")
      .eq("miembro_id", id)
      .order("fecha_completado", { ascending: false }),
  ]);

  if (miembroError) {
    if (miembroError.code === "PGRST116") return null; // not found
    throw new Error(`getMiembro: ${miembroError.message}`);
  }

  if (cursosError) throw new Error(`getMiembro (cursos): ${cursosError.message}`);

  return {
    ...miembro!,
    cursos: (miembroCursos ?? []) as (MiembroCursoRow & { curso: CursoRow })[],
  };
}

/**
 * Devuelve la jerarquía completa (regimientos > compañías > pelotones >
 * escuadras) sin miembros. Útil para selects en formularios.
 * Cacheado 60s — revalidate automático cada 60s.
 */
export const getEstructura = unstable_cache(
  async (): Promise<EstructuraRegimiento[]> => {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("regimientos")
      .select(
        `
        id, nombre, descripcion, comandante,
        companias (
          id, nombre, logo_url, orden,
          pelotones (
            id, nombre, orden,
            escuadras (
              id, nombre, indicativo_radio, max_miembros, orden
            )
          )
        )
      `
      )
      .order("nombre");

    if (error) throw new Error(`getEstructura: ${error.message}`);

    return (data ?? []).map((reg) => ({
      id: reg.id,
      nombre: reg.nombre,
      descripcion: reg.descripcion,
      comandante: reg.comandante,
      companias: (reg.companias ?? [])
        .sort((a, b) => a.orden - b.orden)
        .map((comp) => ({
          id: comp.id,
          nombre: comp.nombre,
          logo_url: comp.logo_url,
          orden: comp.orden,
          pelotones: (comp.pelotones ?? [])
            .sort((a, b) => a.orden - b.orden)
            .map((pel) => ({
              id: pel.id,
              nombre: pel.nombre,
              orden: pel.orden,
              escuadras: (pel.escuadras ?? []).sort((a, b) => a.orden - b.orden),
            })),
        })),
    }));
  },
  ["estructura"],
  { revalidate: 60, tags: ["estructura"] }
);

/**
 * Obtiene el rol de la aplicación del usuario autenticado actualmente.
 * Devuelve null si no está autenticado o no tiene rol asignado.
 */
export async function getCurrentUserRole(): Promise<AppRole | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("app_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // sin rol asignado
    throw new Error(`getCurrentUserRole: ${error.message}`);
  }

  return data.role;
}
