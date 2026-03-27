// ─── Categorías de rango ────────────────────────────────────────────────────

export type RankCategory = "officer" | "warrant" | "nco" | "enlisted";

export interface Rank {
  code: string;
  label: string;
  category: RankCategory;
}

// ─── Catálogo de rangos (US Army / MilSim genérico) ─────────────────────────

export const RANKS: Rank[] = [
  // Officers
  { code: "GEN",  label: "General",                    category: "officer" },
  { code: "LTG",  label: "Lieutenant General",          category: "officer" },
  { code: "MG",   label: "Major General",               category: "officer" },
  { code: "BG",   label: "Brigadier General",           category: "officer" },
  { code: "COL",  label: "Colonel",                     category: "officer" },
  { code: "LTC",  label: "Lieutenant Colonel",          category: "officer" },
  { code: "MAJ",  label: "Major",                       category: "officer" },
  { code: "CPT",  label: "Captain",                     category: "officer" },
  { code: "1LT",  label: "First Lieutenant",            category: "officer" },
  { code: "2LT",  label: "Second Lieutenant",           category: "officer" },

  // Warrant Officers
  { code: "CW5",  label: "Chief Warrant Officer 5",     category: "warrant" },
  { code: "CW4",  label: "Chief Warrant Officer 4",     category: "warrant" },
  { code: "CW3",  label: "Chief Warrant Officer 3",     category: "warrant" },
  { code: "CW2",  label: "Chief Warrant Officer 2",     category: "warrant" },
  { code: "WO1",  label: "Warrant Officer 1",           category: "warrant" },

  // Non-Commissioned Officers
  { code: "CSM",  label: "Command Sergeant Major",      category: "nco" },
  { code: "SGM",  label: "Sergeant Major",              category: "nco" },
  { code: "MSG",  label: "Master Sergeant",             category: "nco" },
  { code: "1SG",  label: "First Sergeant",              category: "nco" },
  { code: "SFC",  label: "Sergeant First Class",        category: "nco" },
  { code: "SSG",  label: "Staff Sergeant",              category: "nco" },
  { code: "SGT",  label: "Sergeant",                    category: "nco" },
  { code: "CPL",  label: "Corporal",                    category: "nco" },

  // Enlisted
  { code: "SPC",  label: "Specialist",                  category: "enlisted" },
  { code: "PFC",  label: "Private First Class",         category: "enlisted" },
  { code: "PV2",  label: "Private Second Class",        category: "enlisted" },
  { code: "PVT",  label: "Private",                     category: "enlisted" },
];

export const RANKS_BY_CATEGORY = RANKS.reduce<Record<RankCategory, Rank[]>>(
  (acc, rank) => {
    acc[rank.category].push(rank);
    return acc;
  },
  { officer: [], warrant: [], nco: [], enlisted: [] }
);

// ─── Roles de usuario en el sistema ─────────────────────────────────────────

export type UserRole = "admin" | "editor" | "viewer";

export const USER_ROLES: Record<UserRole, string> = {
  admin:  "Administrador",
  editor: "Editor",
  viewer: "Observador",
};

// ─── Rutas ───────────────────────────────────────────────────────────────────

export const ROUTES = {
  home:      "/",
  login:     "/login",
  dashboard: "/dashboard",
} as const;
