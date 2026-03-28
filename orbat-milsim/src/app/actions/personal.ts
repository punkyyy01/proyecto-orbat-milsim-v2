"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { RangoMilitar } from "@/lib/types/database"

export type ActionResult = { error: string } | { success: true }

export type AsignacionConNombres = {
  id: string // synthetic: miembro_id
  es_principal: boolean
  escuadra_id: string | null
  peloton_id: string | null
  compania_id: string | null
  regimiento_id: string | null
  regimientos: { nombre: string } | null
  companias: { nombre: string } | null
  pelotones: { nombre: string } | null
  escuadras: { nombre: string } | null
}

// ─── Crear miembro ────────────────────────────────────────────────────────────

export async function crearMiembro(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const nombre_milsim = (formData.get("nombre_milsim") as string)?.trim()
  const rango = formData.get("rango") as RangoMilitar

  if (!nombre_milsim) return { error: "El nombre milsim es requerido" }
  if (!rango) return { error: "El rango es requerido" }

  const nivel = formData.get("nivel") as string | null
  const unidad_id = (formData.get("unidad_id") as string) || null

  const unitFields: Record<string, string | null> = {
    escuadra_id: null,
    peloton_id: null,
    compania_id: null,
    regimiento_id: null,
  }
  if (nivel === "escuadra" && unidad_id) unitFields.escuadra_id = unidad_id
  else if (nivel === "peloton" && unidad_id) unitFields.peloton_id = unidad_id
  else if (nivel === "compania" && unidad_id) unitFields.compania_id = unidad_id
  else if (nivel === "regimiento" && unidad_id) unitFields.regimiento_id = unidad_id

  const { data: miembro, error } = await supabase
    .from("miembros")
    .insert({
      nombre_milsim,
      rango,
      rol: (formData.get("rol") as string) || null,
      discord_id: (formData.get("discord_id") as string) || null,
      steam_id: (formData.get("steam_id") as string) || null,
      activo: formData.get("activo") === "true",
      notas_admin: (formData.get("notas_admin") as string) || null,
      ...unitFields,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  const cursosRaw = (formData.get("cursos") as string) || ""
  const cursoIds = cursosRaw.split(",").filter(Boolean)
  if (cursoIds.length > 0 && miembro) {
    const { error: cursosError } = await supabase.from("miembro_cursos").insert(
      cursoIds.map((curso_id) => ({
        miembro_id: miembro.id,
        curso_id,
        fecha_completado: new Date().toISOString().split("T")[0],
      }))
    )
    if (cursosError) return { error: cursosError.message }
  }

  revalidatePath("/personal")
  return { success: true }
}

// ─── Importar miembros en masa ────────────────────────────────────────────────

export async function importarMiembrosBulk(
  filas: { nombre_milsim: string; rango: RangoMilitar; rol: string | null; escuadra_id: string | null }[]
): Promise<{ insertados: number; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("miembros")
    .insert(filas.map(({ nombre_milsim, rango, rol, escuadra_id }) => ({
      nombre_milsim, rango, rol, activo: true, escuadra_id: escuadra_id ?? null,
    })))
    .select("id")

  if (error) return { insertados: 0, error: error.message }

  revalidatePath("/personal")
  return { insertados: data?.length ?? 0 }
}

// ─── Actualizar miembro ───────────────────────────────────────────────────────

export async function actualizarMiembro(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const nombre_milsim = (formData.get("nombre_milsim") as string)?.trim()
  const rango = formData.get("rango") as RangoMilitar

  if (!nombre_milsim) return { error: "El nombre milsim es requerido" }
  if (!rango) return { error: "El rango es requerido" }

  const { error } = await supabase
    .from("miembros")
    .update({
      nombre_milsim,
      rango,
      rol: (formData.get("rol") as string) || null,
      discord_id: (formData.get("discord_id") as string) || null,
      steam_id: (formData.get("steam_id") as string) || null,
      activo: formData.get("activo") === "true",
      notas_admin: (formData.get("notas_admin") as string) || null,
    })
    .eq("id", id)

  if (error) return { error: error.message }

  // Reemplazar cursos: borrar todos y re-insertar
  const { error: deleteError } = await supabase.from("miembro_cursos").delete().eq("miembro_id", id)
  if (deleteError) return { error: deleteError.message }

  const cursosRaw = (formData.get("cursos") as string) || ""
  const cursoIds = cursosRaw.split(",").filter(Boolean)
  if (cursoIds.length > 0) {
    const { error: insertError } = await supabase.from("miembro_cursos").insert(
      cursoIds.map((curso_id) => ({
        miembro_id: id,
        curso_id,
        fecha_completado: new Date().toISOString().split("T")[0],
      }))
    )
    if (insertError) return { error: insertError.message }
  }

  revalidatePath("/personal")
  return { success: true }
}

// ─── Eliminar miembro ─────────────────────────────────────────────────────────

export async function eliminarMiembro(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("miembros").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/personal")
  return { success: true }
}

// ─── Toggle activo ────────────────────────────────────────────────────────────

export async function toggleActivoMiembro(
  id: string,
  activo: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("miembros")
    .update({ activo })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/personal")
  return { success: true }
}

// ─── Cambiar rango ────────────────────────────────────────────────────────────

export async function cambiarRangoMiembro(
  id: string,
  rango: RangoMilitar
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("miembros")
    .update({ rango })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/personal")
  return { success: true }
}

// ─── Obtener cursos completados de un miembro ────────────────────────────────

export async function getCursosCompletadosMiembro(id: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("miembro_cursos")
    .select("curso_id")
    .eq("miembro_id", id)
  return (data ?? []).map((r) => r.curso_id)
}

// ─── Verificar nick duplicado (para validación en tiempo real) ────────────────

export async function checkNickExiste(
  nombre: string,
  excludeId?: string
): Promise<{ existe: boolean }> {
  const supabase = await createClient()
  let query = supabase
    .from("miembros")
    .select("id")
    .ilike("nombre_milsim", nombre.trim())
  if (excludeId) {
    query = query.neq("id", excludeId)
  }
  const { data } = await query.limit(1)
  return { existe: (data?.length ?? 0) > 0 }
}

// ─── Asignaciones ─────────────────────────────────────────────────────────────

export async function getAsignacionesMiembro(
  miembro_id: string
): Promise<AsignacionConNombres[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("miembros")
    .select("id, escuadra_id, peloton_id, compania_id, regimiento_id, escuadras(nombre), pelotones(nombre), companias(nombre), regimientos(nombre)")
    .eq("id", miembro_id)
    .single()
  if (error) throw new Error(`getAsignacionesMiembro: ${error.message}`)
  if (!data) return []
  if (!data.escuadra_id && !data.peloton_id && !data.compania_id && !data.regimiento_id) return []
  return [{
    id: data.id,
    es_principal: true,
    escuadra_id: data.escuadra_id ?? null,
    peloton_id: data.peloton_id ?? null,
    compania_id: data.compania_id ?? null,
    regimiento_id: data.regimiento_id ?? null,
    escuadras: data.escuadras ?? null,
    pelotones: data.pelotones ?? null,
    companias: data.companias ?? null,
    regimientos: data.regimientos ?? null,
  }]
}

export async function agregarAsignacion(
  miembro_id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const nivel = formData.get("nivel") as string | null
  const unidad_id = (formData.get("unidad_id") as string) || null

  if (!nivel || !unidad_id) return { error: "Nivel y unidad son requeridos" }
  if (!["regimiento", "compania", "peloton", "escuadra"].includes(nivel))
    return { error: "Nivel inválido" }

  const update = {
    escuadra_id: nivel === "escuadra" ? unidad_id : null,
    peloton_id: nivel === "peloton" ? unidad_id : null,
    compania_id: nivel === "compania" ? unidad_id : null,
    regimiento_id: nivel === "regimiento" ? unidad_id : null,
  }

  const { error } = await supabase.from("miembros").update(update).eq("id", miembro_id)
  if (error) return { error: error.message }
  revalidatePath("/personal")
  return { success: true }
}

export async function eliminarAsignacion(
  miembro_id: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("miembros")
    .update({ escuadra_id: null, peloton_id: null, compania_id: null, regimiento_id: null })
    .eq("id", miembro_id)
  if (error) return { error: error.message }
  revalidatePath("/personal")
  return { success: true }
}

export async function marcarAsignacionPrincipal(
  _asignacion_id: string,
  _miembro_id: string
): Promise<ActionResult> {
  // Only one assignment per member; always principal
  return { success: true }
}
