"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { RangoMilitar } from "@/lib/types/database"

export type ActionResult = { error: string } | { success: true }

// ─── Crear miembro ────────────────────────────────────────────────────────────

export async function crearMiembro(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const nombre_milsim = (formData.get("nombre_milsim") as string)?.trim()
  const rango = formData.get("rango") as RangoMilitar

  if (!nombre_milsim) return { error: "El nombre milsim es requerido" }
  if (!rango) return { error: "El rango es requerido" }

  const nivel = formData.get("nivel") as string | null
  const unidad_id = (formData.get("unidad_id") as string) || null

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
      regimiento_id: nivel === "regimiento" ? unidad_id : null,
      compania_id: nivel === "compania" ? unidad_id : null,
      peloton_id: nivel === "peloton" ? unidad_id : null,
      escuadra_id: nivel === "escuadra" ? unidad_id : null,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  const cursosRaw = (formData.get("cursos") as string) || ""
  const cursoIds = cursosRaw.split(",").filter(Boolean)
  if (cursoIds.length > 0 && miembro) {
    await supabase.from("miembro_cursos").insert(
      cursoIds.map((curso_id) => ({
        miembro_id: miembro.id,
        curso_id,
        fecha_completado: new Date().toISOString().split("T")[0],
      }))
    )
  }

  revalidatePath("/personal")
  return { success: true }
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

  const nivel = formData.get("nivel") as string | null
  const unidad_id = (formData.get("unidad_id") as string) || null

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
      regimiento_id: nivel === "regimiento" ? unidad_id : null,
      compania_id: nivel === "compania" ? unidad_id : null,
      peloton_id: nivel === "peloton" ? unidad_id : null,
      escuadra_id: nivel === "escuadra" ? unidad_id : null,
    })
    .eq("id", id)

  if (error) return { error: error.message }

  // Reemplazar cursos: borrar todos y re-insertar
  await supabase.from("miembro_cursos").delete().eq("miembro_id", id)
  const cursosRaw = (formData.get("cursos") as string) || ""
  const cursoIds = cursosRaw.split(",").filter(Boolean)
  if (cursoIds.length > 0) {
    await supabase.from("miembro_cursos").insert(
      cursoIds.map((curso_id) => ({
        miembro_id: id,
        curso_id,
        fecha_completado: new Date().toISOString().split("T")[0],
      }))
    )
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
