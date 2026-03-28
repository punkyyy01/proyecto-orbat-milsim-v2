"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { AsignacionRow, RangoMilitar } from "@/lib/types/database"

export type ActionResult = { error: string } | { success: true }

export type AsignacionConNombres = AsignacionRow & {
  regimientos: { nombre: string } | null;
  companias: { nombre: string } | null;
  pelotones: { nombre: string } | null;
  escuadras: { nombre: string } | null;
}

// ─── Crear miembro ────────────────────────────────────────────────────────────

export async function crearMiembro(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const nombre_milsim = (formData.get("nombre_milsim") as string)?.trim()
  const rango = formData.get("rango") as RangoMilitar

  if (!nombre_milsim) return { error: "El nombre milsim es requerido" }
  if (!rango) return { error: "El rango es requerido" }

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
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  // Insertar asignación principal si se eligió una unidad
  const nivel = formData.get("nivel") as string | null
  const unidad_id = (formData.get("unidad_id") as string) || null

  if (nivel && unidad_id && miembro) {
    const asignacion: Record<string, unknown> = {
      miembro_id: miembro.id,
      es_principal: true,
      orden: 0,
    }
    if (nivel === "regimiento") asignacion.regimiento_id = unidad_id
    else if (nivel === "compania") asignacion.compania_id = unidad_id
    else if (nivel === "peloton") asignacion.peloton_id = unidad_id
    else if (nivel === "escuadra") asignacion.escuadra_id = unidad_id

    const { error: aError } = await supabase.from("asignaciones").insert(asignacion)
    if (aError) return { error: aError.message }
  }

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
    .insert(filas.map(({ nombre_milsim, rango, rol }) => ({ nombre_milsim, rango, rol, activo: true })))
    .select("id")

  if (error) return { insertados: 0, error: error.message }

  // Crear asignación principal para los que tienen escuadra_id
  const asignaciones = (data ?? [])
    .map((m, i) => ({ miembro_id: m.id, escuadra_id: filas[i].escuadra_id }))
    .filter((a) => a.escuadra_id !== null)
    .map((a) => ({ miembro_id: a.miembro_id, escuadra_id: a.escuadra_id!, es_principal: true, orden: 0 }))

  if (asignaciones.length > 0) {
    const { error: aError } = await supabase.from("asignaciones").insert(asignaciones)
    if (aError) return { insertados: data?.length ?? 0, error: aError.message }
  }

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
  const { data, error } = await supabase
    .from("asignaciones")
    .select("*, regimientos(nombre), companias(nombre), pelotones(nombre), escuadras(nombre)")
    .eq("miembro_id", miembro_id)
    .order("es_principal", { ascending: false })
    .order("orden")
  if (error) throw new Error(`getAsignacionesMiembro: ${error.message}`)
  return (data ?? []) as AsignacionConNombres[]
}

export async function agregarAsignacion(
  miembro_id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const nivel = formData.get("nivel") as string | null
  const unidad_id = (formData.get("unidad_id") as string) || null

  if (!nivel || !unidad_id) return { error: "Nivel y unidad son requeridos" }

  const asignacion: Record<string, unknown> = {
    miembro_id,
    es_principal: false,
    orden: 0,
  }
  if (nivel === "regimiento") asignacion.regimiento_id = unidad_id
  else if (nivel === "compania") asignacion.compania_id = unidad_id
  else if (nivel === "peloton") asignacion.peloton_id = unidad_id
  else if (nivel === "escuadra") asignacion.escuadra_id = unidad_id
  else return { error: "Nivel inválido" }

  const { error } = await supabase.from("asignaciones").insert(asignacion)
  if (error) return { error: error.message }
  revalidatePath("/personal")
  return { success: true }
}

export async function eliminarAsignacion(
  asignacion_id: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("asignaciones").delete().eq("id", asignacion_id)
  if (error) return { error: error.message }
  revalidatePath("/personal")
  return { success: true }
}

export async function marcarAsignacionPrincipal(
  asignacion_id: string,
  miembro_id: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Quitar principal de todas las asignaciones del miembro
  const { error: e1 } = await supabase
    .from("asignaciones")
    .update({ es_principal: false })
    .eq("miembro_id", miembro_id)
  if (e1) return { error: e1.message }

  // Marcar la nueva principal
  const { error: e2 } = await supabase
    .from("asignaciones")
    .update({ es_principal: true })
    .eq("id", asignacion_id)
  if (e2) return { error: e2.message }

  revalidatePath("/personal")
  return { success: true }
}
