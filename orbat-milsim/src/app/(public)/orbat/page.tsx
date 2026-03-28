import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getOrbatPublico } from "@/lib/supabase/queries";
import type {
  MiembroOrbat,
  OrbatCompania,
  OrbatEscuadra,
  OrbatPeloton,
  OrbatRegimiento,
} from "@/lib/supabase/queries";
import { RANKS } from "@/constants";
import type { RangoMilitar } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ORBAT — Orden de Batalla",
  description: "Estructura militar activa de la unidad.",
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  pageBg:    "#0a0f0d",
  reg:       "#0d1512",
  regHd:     "#0f1c16",
  comp:      "#0e1914",
  compHd:    "#101e18",
  plt:       "#0c1511",
  pltHd:     "#0e1a14",
  esc:       "#0a1209",
  escHd:     "#0c1610",
  hq:        "#080e0b",
  border:    "#2d4a3e",
  borderComp:"#3d6050",
  borderPlt: "#2a4a38",
  borderEsc: "#1d3a2e",
  connector: "#162a20",
  green:     "#4ade80",
  greenDim:  "#2d5a40",
  amber:     "#f59e0b",
  amberBg:   "#1a1005",
  amberBd:   "#78350f",
  text:      "#f1f5f9",
  textMuted: "#94a3b8",
  textDim:   "#374151",
};

// ─── Rank colours ─────────────────────────────────────────────────────────────

const rankCatMap = new Map(RANKS.map((r) => [r.code, r.category]));
const CAT_COLOR: Record<string, string> = {
  officer:  "#fbbf24",
  warrant:  "#fb923c",
  nco:      "#4ade80",
  enlisted: "#94a3b8",
};

function rankColor(rango: RangoMilitar): string {
  return CAT_COLOR[rankCatMap.get(rango) ?? "enlisted"];
}

// ─── Count helpers ────────────────────────────────────────────────────────────

function countRegimiento(reg: OrbatRegimiento): number {
  return (
    reg.miembros_directos.length +
    reg.companias.reduce(
      (s, c) =>
        s +
        c.miembros_directos.length +
        c.escuadras_directas.reduce((s2, e) => s2 + e.miembros.length, 0) +
        c.pelotones.reduce(
          (s2, p) =>
            s2 +
            p.miembros_directos.length +
            p.escuadras.reduce((s3, e) => s3 + e.miembros.length, 0),
          0
        ),
      0
    )
  );
}

// ─── Tree primitives ─────────────────────────────────────────────────────────
//
// TreeBranch: contenedor que dibuja la línea vertical de conexión.
// TreeNode:   envuelve cada hijo y dibuja su conector horizontal.
//
// Geometría:
//   · border-l del Branch es la línea vertical (left edge del padding).
//   · El conector horizontal es un <div> absoluto que va desde la línea
//     vertical hasta el borde izquierdo del card hijo.
//   · pl-5 (20 px) y left:-1.25rem son simétricos: el conector mide exactamente
//     el ancho del padding, tocando la línea vertical en su extremo izquierdo.

function TreeBranch({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative ml-5 pl-5 border-l"
      style={{ borderColor: C.connector }}
    >
      {children}
    </div>
  );
}

function TreeNode({ children }: { children: ReactNode }) {
  return (
    <div className="relative mb-3 last:mb-0">
      {/* Conector horizontal: va de la línea vertical al card */}
      <div
        className="absolute top-5 w-5 border-t pointer-events-none"
        style={{ left: "-1.25rem", borderColor: C.connector }}
      />
      {children}
    </div>
  );
}

// ─── MiembroRow ───────────────────────────────────────────────────────────────

function MiembroRow({ m }: { m: MiembroOrbat }) {
  return (
    <div className="flex items-baseline gap-2 py-[3px]">
      <span
        className="font-mono text-[11px] font-bold w-9 shrink-0 tabular-nums"
        style={{ color: rankColor(m.rango) }}
      >
        {m.rango}
      </span>
      <span className="text-sm leading-snug truncate" style={{ color: C.text }}>
        {m.nombre_milsim}
      </span>
      {m.rol && (
        <span className="text-xs shrink-0 truncate" style={{ color: C.textDim }}>
          — {m.rol}
        </span>
      )}
    </div>
  );
}

// ─── EstadoMayor ─────────────────────────────────────────────────────────────

function EstadoMayor({
  miembros,
  label = "ESTADO MAYOR",
}: {
  miembros: MiembroOrbat[];
  label?: string;
}) {
  if (miembros.length === 0) return null;
  return (
    <div
      className="rounded border px-3 py-2 mb-3"
      style={{ background: C.hq, borderColor: C.borderEsc }}
    >
      <p
        className="text-[9px] font-mono font-black tracking-[0.25em] mb-1.5 uppercase"
        style={{ color: C.green }}
      >
        ⬡ {label}
      </p>
      <div>
        {miembros.map((m) => (
          <MiembroRow key={m.miembro_id} m={m} />
        ))}
      </div>
    </div>
  );
}

// ─── EscuadraCard ─────────────────────────────────────────────────────────────

function EscuadraCard({ escuadra }: { escuadra: OrbatEscuadra }) {
  const ocupados = escuadra.miembros.length;
  const max = escuadra.max_miembros;
  const slotColor =
    ocupados === 0 ? C.textDim : ocupados >= max ? "#ef4444" : C.textMuted;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: C.esc, borderColor: C.borderEsc }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-1.5 border-b"
        style={{ background: C.escHd, borderColor: C.borderEsc }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-xs font-semibold truncate"
            style={{ color: C.text }}
          >
            {escuadra.nombre}
          </span>
          {escuadra.indicativo_radio && (
            <span
              className="font-mono text-[10px] px-1.5 py-px rounded border tracking-wider shrink-0"
              style={{
                color: C.amber,
                borderColor: C.amberBd,
                background: C.amberBg,
              }}
            >
              📻 {escuadra.indicativo_radio}
            </span>
          )}
        </div>
        <span
          className="font-mono text-[10px] tabular-nums shrink-0"
          style={{ color: slotColor }}
        >
          {ocupados}/{max}
        </span>
      </div>

      {/* Miembros */}
      <div className="px-3 py-1.5">
        {ocupados === 0 ? (
          <p
            className="text-xs italic py-0.5"
            style={{ color: C.textDim }}
          >
            Sin efectivos
          </p>
        ) : (
          escuadra.miembros.map((m) => (
            <MiembroRow key={m.miembro_id} m={m} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── PelotonCard ──────────────────────────────────────────────────────────────

function PelotonCard({ peloton }: { peloton: OrbatPeloton }) {
  const total =
    peloton.miembros_directos.length +
    peloton.escuadras.reduce((s, e) => s + e.miembros.length, 0);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: C.plt, borderColor: C.borderPlt }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 border-b"
        style={{ background: C.pltHd, borderColor: C.borderPlt }}
      >
        <span
          className="font-mono text-[9px] font-black tracking-[0.2em] border px-1.5 py-px rounded shrink-0"
          style={{
            color: C.green,
            borderColor: C.borderPlt,
            background: "#07100a",
          }}
        >
          PLT
        </span>
        <h3
          className="font-semibold text-sm truncate"
          style={{ color: C.text }}
        >
          {peloton.nombre}
        </h3>
        <span
          className="ml-auto font-mono text-[10px] tabular-nums shrink-0"
          style={{ color: C.greenDim }}
        >
          {total} EFT
        </span>
      </div>

      {/* Body */}
      <div className="p-3">
        <EstadoMayor miembros={peloton.miembros_directos} label="PLT HQ" />

        {peloton.escuadras.length > 0 && (
          <TreeBranch>
            {peloton.escuadras.map((esc) => (
              <TreeNode key={esc.id}>
                <EscuadraCard escuadra={esc} />
              </TreeNode>
            ))}
          </TreeBranch>
        )}

        {peloton.escuadras.length === 0 &&
          peloton.miembros_directos.length === 0 && (
            <p className="text-xs italic" style={{ color: C.textDim }}>
              Sin unidades asignadas
            </p>
          )}
      </div>
    </div>
  );
}

// ─── CompaniaCard ─────────────────────────────────────────────────────────────

function CompaniaCard({ compania }: { compania: OrbatCompania }) {
  const total =
    compania.miembros_directos.length +
    compania.escuadras_directas.reduce((s, e) => s + e.miembros.length, 0) +
    compania.pelotones.reduce(
      (s, p) =>
        s +
        p.miembros_directos.length +
        p.escuadras.reduce((s2, e) => s2 + e.miembros.length, 0),
      0
    );

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: C.comp, borderColor: C.borderComp }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 border-b"
        style={{ background: C.compHd, borderColor: C.borderComp }}
      >
        {compania.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={compania.logo_url}
            alt=""
            className="w-7 h-7 object-contain shrink-0"
          />
        )}
        <h2
          className="font-bold text-base truncate"
          style={{ color: C.text }}
        >
          {compania.nombre}
        </h2>
        <span
          className="ml-auto font-mono text-xs px-2.5 py-0.5 rounded-full border shrink-0"
          style={{
            color: C.amber,
            borderColor: C.amberBd,
            background: C.amberBg,
          }}
        >
          {total} EFT
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <EstadoMayor miembros={compania.miembros_directos} label="CO HQ" />

        {/* Escuadras directas bajo compañía (sin pelotón — caso RSTB) */}
        {compania.escuadras_directas.length > 0 && (
          <TreeBranch>
            {compania.escuadras_directas.map((esc) => (
              <TreeNode key={esc.id}>
                <EscuadraCard escuadra={esc} />
              </TreeNode>
            ))}
          </TreeBranch>
        )}

        {compania.pelotones.length > 0 && (
          <TreeBranch>
            {compania.pelotones.map((plt) => (
              <TreeNode key={plt.id}>
                <PelotonCard peloton={plt} />
              </TreeNode>
            ))}
          </TreeBranch>
        )}

        {compania.pelotones.length === 0 &&
          compania.escuadras_directas.length === 0 &&
          compania.miembros_directos.length === 0 && (
            <p className="text-sm italic" style={{ color: C.textDim }}>
              Sin unidades asignadas
            </p>
          )}
      </div>
    </div>
  );
}

// ─── RegimientoSection ────────────────────────────────────────────────────────

function RegimientoSection({ reg }: { reg: OrbatRegimiento }) {
  const total = countRegimiento(reg);

  return (
    <section aria-label={`Regimiento ${reg.nombre}`}>
      <div
        className="rounded-2xl border-2 overflow-hidden"
        style={{ background: C.reg, borderColor: C.border }}
      >
        {/* Header regimiento */}
        <div
          className="px-6 py-5 border-b-2"
          style={{ background: C.regHd, borderColor: C.border }}
        >
          <div className="flex items-start justify-between gap-6">
            {/* Info */}
            <div className="min-w-0">
              <p
                className="font-mono text-[9px] font-black tracking-[0.35em] uppercase mb-1.5"
                style={{ color: C.green }}
              >
                ◈ Regimiento
              </p>
              <h1
                className="text-2xl sm:text-3xl font-bold leading-tight"
                style={{ color: C.text }}
              >
                {reg.nombre}
              </h1>
              {reg.descripcion && (
                <p
                  className="mt-1.5 text-sm leading-relaxed"
                  style={{ color: C.textMuted }}
                >
                  {reg.descripcion}
                </p>
              )}
              {reg.comandante && (
                <p
                  className="mt-2 font-mono text-xs"
                  style={{ color: C.amber }}
                >
                  CDR: {reg.comandante}
                </p>
              )}
            </div>

            {/* Efectivos badge */}
            <div
              className="shrink-0 text-center px-4 sm:px-6 py-3 rounded-xl border"
              style={{ background: "#07100a", borderColor: C.border }}
            >
              <div
                className="text-3xl font-bold font-mono tabular-nums"
                style={{ color: C.green }}
              >
                {total}
              </div>
              <div
                className="text-[9px] font-mono font-black tracking-[0.25em] mt-0.5 uppercase"
                style={{ color: C.greenDim }}
              >
                Efectivos
              </div>
            </div>
          </div>
        </div>

        {/* Estado mayor + compañías */}
        <div className="p-4 sm:p-6">
          <EstadoMayor miembros={reg.miembros_directos} />

          {reg.companias.length > 0 ? (
            <TreeBranch>
              {reg.companias.map((comp) => (
                <TreeNode key={comp.id}>
                  <CompaniaCard compania={comp} />
                </TreeNode>
              ))}
            </TreeBranch>
          ) : (
            <p className="text-sm italic" style={{ color: C.textDim }}>
              Sin compañías registradas
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Leyenda de rangos ────────────────────────────────────────────────────────

function RankLegend() {
  const items = [
    { label: "Oficial",    color: "#fbbf24" },
    { label: "Warrant",   color: "#fb923c" },
    { label: "NCO",       color: "#4ade80" },
    { label: "Tropa",     color: "#94a3b8" },
  ] as const;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {items.map(({ label, color }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: color }}
          />
          <span className="text-[10px] font-mono" style={{ color: C.textDim }}>
            {label}
          </span>
        </span>
      ))}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default async function OrbatPublicaPage() {
  const regimientos = await getOrbatPublico();
  const totalGlobal = regimientos.reduce((s, r) => s + countRegimiento(r), 0);
  const fecha = new Date().toISOString().split("T")[0];

  return (
    <div style={{ background: C.pageBg, minHeight: "100svh" }}>
      {/* ── Header de página ───────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-sm"
        style={{ borderColor: C.connector, background: "rgba(10,15,13,0.92)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="font-mono text-xs font-black tracking-widest shrink-0"
              style={{ color: C.green }}
            >
              ◈ ORBAT
            </span>
            <span
              className="hidden sm:block text-xs"
              style={{ color: C.textDim }}
            >
              Orden de Batalla — Público
            </span>
          </div>

          <div className="flex items-center gap-6">
            <RankLegend />
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-xs tabular-nums"
                style={{ color: C.green }}
              >
                {totalGlobal}
              </span>
              <span
                className="font-mono text-[10px] hidden sm:block"
                style={{ color: C.textDim }}
              >
                EFT ACTIVOS
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Contenido ──────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {regimientos.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-32 gap-5"
            style={{ animation: "orbat-fadein 0.6s ease both" }}
          >
            <div
              className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center"
              style={{ borderColor: C.border, background: C.regHd }}
            >
              <span className="font-mono text-2xl" style={{ color: C.green }}>◈</span>
            </div>
            <div className="text-center space-y-2">
              <p
                className="font-mono text-sm font-bold tracking-widest uppercase"
                style={{ color: C.textMuted }}
              >
                ORBAT sin datos
              </p>
              <p className="text-sm max-w-sm" style={{ color: C.textDim }}>
                No hay unidades registradas aún. Si eres administrador, accede al panel para configurar la estructura.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all hover:opacity-100"
              style={{
                borderColor: C.border,
                color: C.green,
                background: "rgba(74,222,128,0.05)",
                opacity: 0.8,
              }}
            >
              Acceder al Panel de Administración →
            </Link>
          </div>
        ) : (
          <div
            className="space-y-10 sm:space-y-14"
            style={{ animation: "orbat-fadein 0.5s ease both" }}
          >
            {regimientos.map((reg) => (
              <RegimientoSection key={reg.id} reg={reg} />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes orbat-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer
        className="border-t mt-16"
        style={{ borderColor: C.connector }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className="font-mono text-[10px] tracking-widest"
              style={{ color: C.textDim }}
            >
              CLASIFICACIÓN: PÚBLICO
            </span>
            <span
              className="font-mono text-[10px] tabular-nums hidden sm:block"
              style={{ color: C.connector }}
            >
              {fecha}
            </span>
          </div>
          <Link
            href="/dashboard"
            className="font-mono text-xs tracking-wide transition-all duration-200 px-3 py-1.5 rounded border hover:opacity-100"
            style={{
              color: C.green,
              borderColor: C.greenDim,
              background: "rgba(74,222,128,0.04)",
              opacity: 0.75,
            }}
          >
            Panel de Administración →
          </Link>
        </div>
      </footer>
    </div>
  );
}
