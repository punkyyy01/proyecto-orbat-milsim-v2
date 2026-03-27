"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ActionResult = { error: string } | { success: true }

// ─── Regimiento ───────────────────────────────────────────────────────────────

export async function crearRegimiento(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const nombre = (formData.get("nombre") as string)?.trim()
  if (!nombre) return { error: "El nombre es requerido" }

  const { error } = await supabase.from("regimientos").insert({ nombre })
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

export async function actualizarRegimiento(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const nombre = (formData.get("nombre") as string)?.trim()
  if (!nombre) return { error: "El nombre es requerido" }

  const { error } = await supabase
    .from("regimientos")
    .update({ nombre })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

export async function eliminarRegimiento(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("regimientos").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

// ─── Compañía ─────────────────────────────────────────────────────────────────

export async function crearCompania(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const nombre = (formData.get("nombre") as string)?.trim()
  const regimiento_id = formData.get("regimiento_id") as string
  if (!nombre) return { error: "El nombre es requerido" }
  if (!regimiento_id) return { error: "El regimiento es requerido" }

  const { data: siblings } = await supabase
    .from("companias")
    .select("orden")
    .eq("regimiento_id", regimiento_id)
    .order("orden", { ascending: false })
    .limit(1)

  const orden = siblings && siblings.length > 0 ? siblings[0].orden + 1 : 1

  const { error } = await supabase
    .from("companias")
    .insert({ nombre, regimiento_id, orden })
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

export async function actualizarCompania(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const nombre = (formData.get("nombre") as string)?.trim()
  if (!nombre) return { error: "El nombre es requerido" }

  const { error } = await supabase
    .from("companias")
    .update({ nombre })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

export async function eliminarCompania(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("companias").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

export async function reordenarCompania(
  id: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: current, error: e1 } = await supabase
    .from("companias")
    .select("orden, regimiento_id")
    .eq("id", id)
    .single()

  if (e1 || !current) return { error: "Compañía no encontrada" }

  const targetOrden =
    direction === "up" ? current.orden - 1 : current.orden + 1

  const { data: sibling, error: e2 } = await supabase
    .from("companias")
    .select("id, orden")
    .eq("regimiento_id", current.regimiento_id)
    .eq("orden", targetOrden)
    .single()

  if (e2 || !sibling) return { success: true }

  await supabase.from("companias").update({ orden: sibling.orden }).eq("id", id)
  await supabase
    .from("companias")
    .update({ orden: current.orden })
    .eq("id", sibling.id)

  revalidatePath("/estructura")
  return { success: true }
}

// ─── Pelotón ──────────────────────────────────────────────────────────────────

export async function crearPeloton(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const nombre = (formData.get("nombre") as string)?.trim()
  const compania_id = formData.get("compania_id") as string
  if (!nombre) return { error: "El nombre es requerido" }
  if (!compania_id) return { error: "La compañía es requerida" }

  const { data: siblings } = await supabase
    .from("pelotones")
    .select("orden")
    .eq("compania_id", compania_id)
    .order("orden", { ascending: false })
    .limit(1)

  const orden = siblings && siblings.length > 0 ? siblings[0].orden + 1 : 1

  const { error } = await supabase
    .from("pelotones")
    .insert({ nombre, compania_id, orden })
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

export async function actualizarPeloton(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const nombre = (formData.get("nombre") as string)?.trim()
  if (!nombre) return { error: "El nombre es requerido" }

  const { error } = await supabase
    .from("pelotones")
    .update({ nombre })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

export async function eliminarPeloton(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("pelotones").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

export async function reordenarPeloton(
  id: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: current, error: e1 } = await supabase
    .from("pelotones")
    .select("orden, compania_id")
    .eq("id", id)
    .single()

  if (e1 || !current) return { error: "Pelotón no encontrado" }

  const targetOrden =
    direction === "up" ? current.orden - 1 : current.orden + 1

  const { data: sibling, error: e2 } = await supabase
    .from("pelotones")
    .select("id, orden")
    .eq("compania_id", current.compania_id)
    .eq("orden", targetOrden)
    .single()

  if (e2 || !sibling) return { success: true }

  await supabase.from("pelotones").update({ orden: sibling.orden }).eq("id", id)
  await supabase
    .from("pelotones")
    .update({ orden: current.orden })
    .eq("id", sibling.id)

  revalidatePath("/estructura")
  return { success: true }
}

// ─── Escuadra ─────────────────────────────────────────────────────────────────

export async function crearEscuadra(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const nombre = (formData.get("nombre") as string)?.trim()
  const peloton_id = formData.get("peloton_id") as string
  const indicativo_radio =
    (formData.get("indicativo_radio") as string)?.trim() || null
  if (!nombre) return { error: "El nombre es requerido" }
  if (!peloton_id) return { error: "El pelotón es requerido" }

  const { data: siblings } = await supabase
    .from("escuadras")
    .select("orden")
    .eq("peloton_id", peloton_id)
    .order("orden", { ascending: false })
    .limit(1)

  const orden = siblings && siblings.length > 0 ? siblings[0].orden + 1 : 1

  const { error } = await supabase
    .from("escuadras")
    .insert({ nombre, peloton_id, indicativo_radio, orden })
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

export async function actualizarEscuadra(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const nombre = (formData.get("nombre") as string)?.trim()
  const indicativo_radio =
    (formData.get("indicativo_radio") as string)?.trim() || null
  if (!nombre) return { error: "El nombre es requerido" }

  const { error } = await supabase
    .from("escuadras")
    .update({ nombre, indicativo_radio })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

export async function actualizarIndicativoEscuadra(
  id: string,
  indicativo_radio: string | null
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("escuadras")
    .update({ indicativo_radio: indicativo_radio || null })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

export async function eliminarEscuadra(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("escuadras").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/estructura")
  return { success: true }
}

export async function reordenarEscuadra(
  id: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: current, error: e1 } = await supabase
    .from("escuadras")
    .select("orden, peloton_id")
    .eq("id", id)
    .single()

  if (e1 || !current) return { error: "Escuadra no encontrada" }

  const targetOrden =
    direction === "up" ? current.orden - 1 : current.orden + 1

  const { data: sibling, error: e2 } = await supabase
    .from("escuadras")
    .select("id, orden")
    .eq("peloton_id", current.peloton_id)
    .eq("orden", targetOrden)
    .single()

  if (e2 || !sibling) return { success: true }

  await supabase.from("escuadras").update({ orden: sibling.orden }).eq("id", id)
  await supabase
    .from("escuadras")
    .update({ orden: current.orden })
    .eq("id", sibling.id)

  revalidatePath("/estructura")
  return { success: true }
}

// ─── Swap orden (drag & drop) ─────────────────────────────────────────────────

export async function swapOrdenCompanias(
  id1: string,
  id2: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("companias")
    .select("id, orden")
    .in("id", [id1, id2])
  if (!data || data.length !== 2) return { error: "No encontrado" }
  const [a, b] = data
  await supabase.from("companias").update({ orden: b.orden }).eq("id", a.id)
  await supabase.from("companias").update({ orden: a.orden }).eq("id", b.id)
  revalidatePath("/estructura")
  return { success: true }
}

export async function swapOrdenPelotones(
  id1: string,
  id2: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("pelotones")
    .select("id, orden")
    .in("id", [id1, id2])
  if (!data || data.length !== 2) return { error: "No encontrado" }
  const [a, b] = data
  await supabase.from("pelotones").update({ orden: b.orden }).eq("id", a.id)
  await supabase.from("pelotones").update({ orden: a.orden }).eq("id", b.id)
  revalidatePath("/estructura")
  return { success: true }
}

export async function swapOrdenEscuadras(
  id1: string,
  id2: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("escuadras")
    .select("id, orden")
    .in("id", [id1, id2])
  if (!data || data.length !== 2) return { error: "No encontrado" }
  const [a, b] = data
  await supabase.from("escuadras").update({ orden: b.orden }).eq("id", a.id)
  await supabase.from("escuadras").update({ orden: a.orden }).eq("id", b.id)
  revalidatePath("/estructura")
  return { success: true }
}
