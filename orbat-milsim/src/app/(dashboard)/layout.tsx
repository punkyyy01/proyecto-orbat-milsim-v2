import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { Toaster } from "sonner"
import { createClient } from "@/lib/supabase/server"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: roleData } = await supabase
    .from("app_roles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const userInfo = {
    email: user.email ?? "",
    name: (
      (user.user_metadata?.nombre as string | undefined) ??
      user.email?.split("@")[0] ??
      "Usuario"
    ),
    role: roleData?.role ?? "viewer",
  }

  return (
    <div
      className="flex h-screen overflow-hidden dark"
      style={{ background: "#111827" }}
    >
      <SidebarNav isAdmin={userInfo.role === "admin"} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <DashboardHeader userInfo={userInfo} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  )
}
