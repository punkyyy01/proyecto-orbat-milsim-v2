"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ActionResult = { error: string } | { success: true }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mueve la escuadra de un miembro actualizando el campo directo en la tabla miembros. */
async function moverAEscuadra(
  supabase: Awaited<ReturnType<typeof createClient>>,
  miembroId: string,
  targetEscuadraId: string
): Promise<{ error: string } | { success: true }> {
  const { error } = await supabase
    .from("miembros")
    .update({ escuadra_id: targetEscuadraId })
    .eq("id", miembroId)
  if (error) return { error: error.message }
  return { success: true }
}

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

  const result = await moverAEscuadra(supabase, miembroId, targetEscuadraId)
  if ("error" in result) return result

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

  // miembro1 → escuadra2
  const r1 = await moverAEscuadra(supabase, miembro1Id, escuadra2Id)
  if ("error" in r1) return r1

  // miembro2 → escuadra1
  const r2 = await moverAEscuadra(supabase, miembro2Id, escuadra1Id)
  if ("error" in r2) {
    // Revertir miembro1
    await moverAEscuadra(supabase, miembro1Id, escuadra1Id)
    return r2
  }

  revalidatePath("/tablero")
  return { success: true }
}
