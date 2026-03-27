"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronRight, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const BREADCRUMB_LABELS: Record<string, string> = {
  personal:   "Personal",
  estructura: "Estructura",
  tablero:    "Tablero",
  cursos:     "Cursos",
  auditoria:  "Auditoría",
}

const ROLE_LABELS: Record<string, string> = {
  admin:   "Administrador",
  officer: "Oficial",
  viewer:  "Observador",
}

export interface UserInfo {
  name: string
  email: string
  role: string
}

export function DashboardHeader({ userInfo }: { userInfo: UserInfo }) {
  const pathname = usePathname()
  const router = useRouter()

  const segments = pathname.split("/").filter(Boolean)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header
      className="h-16 flex items-center justify-between px-6 border-b shrink-0"
      style={{ background: "#111827", borderColor: "rgba(255,255,255,0.06)" }}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm pl-10 lg:pl-0">
        <Link href="/" className="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
          ◈
        </Link>
        {segments.length > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-700" />}
        {segments.map((seg, i) => {
          const label = BREADCRUMB_LABELS[seg] ?? seg
          const isLast = i === segments.length - 1
          const href = "/" + segments.slice(0, i + 1).join("/")
          return (
            <span key={seg} className="flex items-center gap-1.5">
              {isLast ? (
                <span className="text-slate-200 font-medium">{label}</span>
              ) : (
                <Link href={href} className="text-slate-500 hover:text-slate-300 transition-colors">
                  {label}
                </Link>
              )}
              {!isLast && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
              )}
            </span>
          )
        })}
      </nav>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2.5 h-auto py-1.5 px-2.5 hover:bg-white/5 rounded-lg"
          >
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-xs font-bold bg-blue-900/50 text-blue-300">
                {userInfo.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-200 leading-none">
                {userInfo.name}
              </p>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">
                {ROLE_LABELS[userInfo.role] ?? userInfo.role}
              </p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 border"
          style={{
            background: "#0f172a",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <DropdownMenuLabel className="text-slate-400 text-xs font-normal truncate">
            {userInfo.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.06)" }} />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer gap-2"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
