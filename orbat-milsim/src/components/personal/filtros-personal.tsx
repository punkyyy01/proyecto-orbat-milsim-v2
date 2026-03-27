"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useRef, useTransition } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RANKS_BY_CATEGORY } from "@/constants"
import type { EstructuraRegimiento } from "@/lib/supabase/queries"

const CATEGORIAS = [
  { key: "officer"  as const, label: "Oficiales" },
  { key: "warrant"  as const, label: "Warrant Officers" },
  { key: "nco"      as const, label: "Suboficiales" },
  { key: "enlisted" as const, label: "Tropa" },
]

export function FiltrosPersonal({
  estructura,
}: {
  estructura: EstructuraRegimiento[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const companias = estructura.flatMap((r) => r.companias)

  const updateParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete("page")
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const hasFilters =
    searchParams.get("q") ||
    searchParams.get("rango") ||
    searchParams.get("compania_id") ||
    searchParams.get("activo")

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        <Input
          placeholder="Buscar por nick..."
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => {
            const val = e.target.value
            if (searchTimer.current) clearTimeout(searchTimer.current)
            searchTimer.current = setTimeout(
              () => updateParam("q", val || undefined),
              350
            )
          }}
          className="pl-9 w-52 bg-slate-900 border-white/10 text-slate-200 placeholder:text-slate-600 focus-visible:border-blue-500/50 focus-visible:ring-0"
        />
      </div>

      {/* Rango */}
      <Select
        value={searchParams.get("rango") ?? "all"}
        onValueChange={(v) => updateParam("rango", v === "all" ? undefined : v)}
      >
        <SelectTrigger className="w-44 bg-slate-900 border-white/10 text-slate-200 focus:ring-0">
          <SelectValue placeholder="Rango" />
        </SelectTrigger>
        <SelectContent
          className="border"
          style={{
            background: "#0f172a",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <SelectItem value="all" className="text-slate-400">
            Todos los rangos
          </SelectItem>
          {CATEGORIAS.map(({ key, label }) => (
            <SelectGroup key={key}>
              <SelectLabel className="text-slate-500 text-[10px] uppercase tracking-wider px-2">
                {label}
              </SelectLabel>
              {RANKS_BY_CATEGORY[key].map((r) => (
                <SelectItem
                  key={r.code}
                  value={r.code}
                  className="text-slate-200"
                >
                  <span className="font-mono text-xs text-slate-400 mr-1.5">
                    {r.code}
                  </span>
                  {r.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {/* Compañía */}
      {companias.length > 0 && (
        <Select
          value={searchParams.get("compania_id") ?? "all"}
          onValueChange={(v) =>
            updateParam("compania_id", v === "all" ? undefined : v)
          }
        >
          <SelectTrigger className="w-44 bg-slate-900 border-white/10 text-slate-200 focus:ring-0">
            <SelectValue placeholder="Compañía" />
          </SelectTrigger>
          <SelectContent
            className="border"
            style={{
              background: "#0f172a",
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <SelectItem value="all" className="text-slate-400">
              Todas las compañías
            </SelectItem>
            {companias.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-slate-200">
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Estado */}
      <Select
        value={searchParams.get("activo") ?? "all"}
        onValueChange={(v) =>
          updateParam("activo", v === "all" ? undefined : v)
        }
      >
        <SelectTrigger className="w-36 bg-slate-900 border-white/10 text-slate-200 focus:ring-0">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent
          className="border"
          style={{
            background: "#0f172a",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <SelectItem value="all" className="text-slate-400">
            Todos
          </SelectItem>
          <SelectItem value="true" className="text-slate-200">
            Activos
          </SelectItem>
          <SelectItem value="false" className="text-slate-200">
            Inactivos
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            startTransition(() => router.push(pathname))
          }
          className="text-slate-400 hover:text-slate-200 gap-1.5 h-9"
        >
          <X className="w-3.5 h-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
