"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ActionResult = { error: string } | { success: true }

export async function crearCurso(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const sigla = (formData.get("sigla") as string)?.trim().toUpperCase()
  const nombre = (formData.get("nombre") as string)?.trim()
  const descripcion = (formData.get("descripcion") as string)?.trim() || null

  if (!sigla) return { error: "La sigla es requerida" }
  if (!nombre) return { error: "El nombre es requerido" }

  const { error } = await supabase
    .from("cursos")
    .insert({ sigla, nombre, descripcion })
  if (error) return { error: error.message }
  revalidatePath("/cursos")
  return { success: true }
}

export async function actualizarCurso(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const sigla = (formData.get("sigla") as string)?.trim().toUpperCase()
  const nombre = (formData.get("nombre") as string)?.trim()
  const descripcion = (formData.get("descripcion") as string)?.trim() || null

  if (!sigla) return { error: "La sigla es requerida" }
  if (!nombre) return { error: "El nombre es requerido" }

  const { error } = await supabase
    .from("cursos")
    .update({ sigla, nombre, descripcion })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/cursos")
  return { success: true }
}

export async function eliminarCurso(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Delete junction rows first (in case FK doesn't cascade)
  await supabase.from("miembro_cursos").delete().eq("curso_id", id)

  const { error } = await supabase.from("cursos").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/cursos")
  return { success: true }
}
