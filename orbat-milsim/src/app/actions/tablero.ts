"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ActionResult = { error: string } | { success: true }

// ─── Transferir miembro a otra escuadra ───────────────────────────────────────

export async function transferirMiembro(
  miembroId: string,
  targetEscuadraId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autorizado" }

  // Verificar capacidad en paralelo
  const [escuadraRes, countRes] = await Promise.all([
    supabase.from("escuadras").select("max_miembros").eq("id", targetEscuadraId).single(),
    supabase.from("miembros").select("*", { count: "exact", head: true }).eq("escuadra_id", targetEscuadraId),
  ])

  if (escuadraRes.error || !escuadraRes.data) return { error: "Escuadra no encontrada" }
  if ((countRes.count ?? 0) >= escuadraRes.data.max_miembros) return { error: "La escuadra está llena" }

  const { error } = await supabase
    .from("miembros")
    .update({ escuadra_id: targetEscuadraId, peloton_id: null, compania_id: null, regimiento_id: null })
    .eq("id", miembroId)

  if (error) return { error: error.message }

  revalidatePath("/tablero")
  return { success: true }
}

// ─── Intercambiar miembros entre escuadras ────────────────────────────────────

export async function intercambiarMiembros(
  miembro1Id: string,
  escuadra1Id: string, // escuadra origen de miembro1 (destino de miembro2)
  miembro2Id: string,
  escuadra2Id: string, // escuadra origen de miembro2 (destino de miembro1)
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autorizado" }

  // miembro1 va a escuadra2
  const { error: err1 } = await supabase
    .from("miembros")
    .update({ escuadra_id: escuadra2Id, peloton_id: null, compania_id: null, regimiento_id: null })
    .eq("id", miembro1Id)

  if (err1) return { error: err1.message }

  // miembro2 va a escuadra1
  const { error: err2 } = await supabase
    .from("miembros")
    .update({ escuadra_id: escuadra1Id, peloton_id: null, compania_id: null, regimiento_id: null })
    .eq("id", miembro2Id)

  if (err2) {
    // Revertir miembro1
    await supabase
      .from("miembros")
      .update({ escuadra_id: escuadra1Id, peloton_id: null, compania_id: null, regimiento_id: null })
      .eq("id", miembro1Id)
    return { error: err2.message }
  }

  revalidatePath("/tablero")
  return { success: true }
}
