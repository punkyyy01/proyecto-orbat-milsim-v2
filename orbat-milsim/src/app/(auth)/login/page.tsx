"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, Suspense } from "react";
import { loginAction } from "@/app/actions/auth";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/personal";

  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div>
        <label
          htmlFor="email"
          className="block font-mono text-[11px] uppercase tracking-wider mb-1.5"
          style={{ color: "#64748b" }}
        >
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
          style={{
            background: "#0a0f0d",
            borderColor: "#2d4a3e",
            color: "#f1f5f9",
          }}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block font-mono text-[11px] uppercase tracking-wider mb-1.5"
          style={{ color: "#64748b" }}
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
          style={{
            background: "#0a0f0d",
            borderColor: "#2d4a3e",
            color: "#f1f5f9",
          }}
        />
      </div>

      {state?.error && (
        <p
          className="text-xs rounded-lg border px-3 py-2"
          style={{
            color: "#f87171",
            background: "rgba(248,113,113,0.06)",
            borderColor: "rgba(248,113,113,0.2)",
          }}
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
        style={{ background: "#16a34a", color: "#f1f5f9" }}
      >
        {pending ? "Verificando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      {/* Marca */}
      <div className="text-center mb-8">
        <p
          className="font-mono text-xs font-black tracking-[0.35em] uppercase mb-2"
          style={{ color: "#4ade80" }}
        >
          ◈ ORBAT MilSim
        </p>
        <h1 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>
          Panel de Administración
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Acceso restringido — solo personal autorizado
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: "#0d1512", borderColor: "#2d4a3e" }}
      >
        <Suspense fallback={<div style={{ color: "#64748b" }} className="text-sm text-center py-4">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>

      {/* Enlace a registro */}
      <p className="text-center text-xs mt-4" style={{ color: "#374151" }}>
        ¿Sin cuenta?{" "}
        <Link href="/registro" style={{ color: "#4ade80" }}>
          Solicitar acceso
        </Link>
      </p>
    </div>
  );
}
