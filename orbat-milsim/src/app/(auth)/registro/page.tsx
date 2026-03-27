"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction } from "@/app/actions/auth";

export default function RegistroPage() {
  const [state, formAction, pending] = useActionState(signupAction, null);

  return (
    <div className="w-full max-w-sm">
      {/* Logo / marca */}
      <div className="text-center mb-8">
        <p
          className="font-mono text-xs font-black tracking-[0.35em] uppercase mb-2"
          style={{ color: "#4ade80" }}
        >
          ◈ ORBAT MilSim
        </p>
        <h1 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>
          Solicitar acceso
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Un administrador revisará tu solicitud y asignará tu rol
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: "#0d1512", borderColor: "#2d4a3e" }}
      >
        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="nombre"
              className="block font-mono text-[11px] uppercase tracking-wider mb-1.5"
              style={{ color: "#64748b" }}
            >
              Nombre MilSim
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              autoComplete="nickname"
              placeholder="Ej: SGT Smith"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: "#0a0f0d",
                borderColor: "#2d4a3e",
                color: "#f1f5f9",
              }}
            />
          </div>

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
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
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
              autoComplete="new-password"
              minLength={8}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: "#0a0f0d",
                borderColor: "#2d4a3e",
                color: "#f1f5f9",
              }}
            />
            <p
              className="text-[11px] mt-1"
              style={{ color: "#374151" }}
            >
              Mínimo 8 caracteres
            </p>
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
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "#16a34a", color: "#f1f5f9" }}
          >
            {pending ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>
      </div>

      {/* Enlace a login */}
      <p className="text-center text-xs mt-4" style={{ color: "#374151" }}>
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="transition-colors"
          style={{ color: "#4ade80" }}
        >
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
