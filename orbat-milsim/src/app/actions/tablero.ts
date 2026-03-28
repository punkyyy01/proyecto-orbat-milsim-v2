"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ActionResult = { error: string } | { success: true }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Encuentra la asignación principal de tipo escuadra de un miembro. */
async function getPrincipalEscuadraAsignacion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  miembroId: string
) {
  return supabase
    .from("asignaciones")
    .select("id, escuadra_id")
    .eq("miembro_id", miembroId)
    .not("escuadra_id", "is", null)
    .eq("es_principal", true)
    .limit(1)
    .maybeSingle()
}

/** Mueve la asignación principal de escuadra de un miembro a otra escuadra.
 *  Si no tiene asignación escuadra-principal, la crea (marcando las otras como no-principal).
 */
async function moverAEscuadra(
  supabase: Awaited<ReturnType<typeof createClient>>,
  miembroId: string,
  targetEscuadraId: string
): Promise<{ error: string } | { success: true }> {
  const { data: existing, error: findError } = await getPrincipalEscuadraAsignacion(supabase, miembroId)
  if (findError) return { error: findError.message }

  if (existing) {
    const { error } = await supabase
      .from("asignaciones")
      .update({ escuadra_id: targetEscuadraId })
      .eq("id", existing.id)
    if (error) return { error: error.message }
  } else {
    // Marcar cualquier asignación principal actual como no-principal
    await supabase
      .from("asignaciones")
      .update({ es_principal: false })
      .eq("miembro_id", miembroId)
      .eq("es_principal", true)
    // Crear nueva asignación principal de escuadra
    const { error } = await supabase
      .from("asignaciones")
      .insert({ miembro_id: miembroId, escuadra_id: targetEscuadraId, es_principal: true, orden: 0 })
    if (error) return { error: error.message }
  }

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
    supabase.from("asignaciones").select("*", { count: "exact", head: true }).eq("escuadra_id", targetEscuadraId),
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

  // Encontrar asignaciones antes de modificar
  const [asign1, asign2] = await Promise.all([
    getPrincipalEscuadraAsignacion(supabase, miembro1Id),
    getPrincipalEscuadraAsignacion(supabase, miembro2Id),
  ])

  if (asign1.error) return { error: asign1.error.message }
  if (asign2.error) return { error: asign2.error.message }

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
