"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Users, GitBranch, BookOpen, ClipboardList, Menu, Shield, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

const BASE_NAV_ITEMS = [
  { href: "/personal",   label: "Personal",   icon: Users,         adminOnly: false },
  { href: "/estructura", label: "Estructura", icon: GitBranch,     adminOnly: false },
  { href: "/tablero",    label: "Tablero",    icon: LayoutGrid,    adminOnly: false },
  { href: "/cursos",     label: "Cursos",     icon: BookOpen,      adminOnly: false },
  { href: "/auditoria",  label: "Auditoría",  icon: ClipboardList, adminOnly: true  },
] as const

function NavContent({
  pathname,
  isAdmin,
  onNavigate,
}: {
  pathname: string
  isAdmin: boolean
  onNavigate?: () => void
}) {
  const navItems = BASE_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#0f172a" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 h-16 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-7 h-7 rounded flex items-center justify-center shrink-0"
          style={{ background: "#1e3a5f" }}
        >
          <Shield className="w-4 h-4 text-blue-400" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-white leading-none">ORBAT</p>
          <p className="text-[10px] text-slate-500 font-mono tracking-wider mt-0.5">
            ADMIN PANEL
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border",
                active
                  ? "bg-blue-600/15 text-blue-400 border-blue-600/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <p className="text-[10px] text-slate-600 font-mono text-center">
          ORBAT v2.0
        </p>
      </div>
    </div>
  )
}

export function SidebarNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile trigger button (shown in header area) */}
      <div className="lg:hidden fixed top-0 left-0 z-40 h-16 flex items-center px-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-slate-200 hover:bg-white/5 w-9 h-9"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-0 w-56 border-r"
            style={{
              background: "#0f172a",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <NavContent
              pathname={pathname}
              isAdmin={isAdmin}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-56 shrink-0 flex-col border-r"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <NavContent pathname={pathname} isAdmin={isAdmin} />
      </aside>
    </>
  )
}
