import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AuditoriaContent } from "@/components/auditoria/auditoria-content"
import type { AuditLogEntry, AuditoriaFiltros, AuditUsuario } from "@/components/auditoria/auditoria-content"

export const metadata: Metadata = { title: "Auditoría" }

const PAGE_SIZE = 25

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ tabla?: string; accion?: string; desde?: string; hasta?: string; usuario?: string; page?: string }>
}) {
  const supabase = await createClient()

  // Verificar autenticación y rol admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: roleData } = await supabase
    .from("app_roles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (roleData?.role !== "admin") redirect("/personal")

  const params = await searchParams
  const filtros: AuditoriaFiltros = {
    tabla:   params.tabla,
    accion:  params.accion,
    desde:   params.desde,
    hasta:   params.hasta,
    usuario: params.usuario,
    page:    params.page,
  }

  const currentPage = Math.max(1, parseInt(params.page ?? "1"))
  const from = (currentPage - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  // Fetch distinct users (by usuario_id) for filter dropdown
  const { data: usuariosRaw } = await supabase
    .from("audit_log")
    .select("usuario_id")
    .not("usuario_id", "is", null)

  const usuariosSet = new Set<string>()
  for (const u of usuariosRaw ?? []) {
    if (u.usuario_id) usuariosSet.add(u.usuario_id)
  }
  const usuarios: AuditUsuario[] = [...usuariosSet].map(id => ({ id }))

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (filtros.tabla)   query = query.eq("tabla",          filtros.tabla)
  if (filtros.accion)  query = query.eq("accion",         filtros.accion)
  if (filtros.usuario) query = query.eq("usuario_id",     filtros.usuario)
  if (filtros.desde)   query = query.gte("created_at",    filtros.desde)
  if (filtros.hasta)   query = query.lte("created_at",    filtros.hasta + "T23:59:59.999Z")

  const { data: logs, count } = await query

  return (
    <AuditoriaContent
      logs={(logs ?? []) as AuditLogEntry[]}
      total={count ?? 0}
      page={currentPage}
      pageSize={PAGE_SIZE}
      filtros={filtros}
      usuarios={usuarios}
    />
  )
}
