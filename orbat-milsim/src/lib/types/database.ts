// ─── Primitivos ──────────────────────────────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums de la DB ──────────────────────────────────────────────────────────

export type RangoMilitar =
  | "GEN"
  | "LTG"
  | "MG"
  | "BG"
  | "COL"
  | "LTC"
  | "MAJ"
  | "CPT"
  | "1LT"
  | "2LT"
  | "CW5"
  | "CW4"
  | "CW3"
  | "CW2"
  | "WO1"
  | "CSM"
  | "SGM"
  | "1SG"
  | "MSG"
  | "SFC"
  | "SSG"
  | "SGT"
  | "CPL"
  | "SPC"
  | "PFC"
  | "PV2"
  | "PV1"
  | "PVT";

export type AppRole = "admin" | "officer" | "viewer";

// ─── Database ────────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      regimientos: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          comandante: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          descripcion?: string | null;
          comandante?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          descripcion?: string | null;
          comandante?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      companias: {
        Row: {
          id: string;
          nombre: string;
          regimiento_id: string;
          logo_url: string | null;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          regimiento_id: string;
          logo_url?: string | null;
          orden: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          regimiento_id?: string;
          logo_url?: string | null;
          orden?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "companias_regimiento_id_fkey";
            columns: ["regimiento_id"];
            referencedRelation: "regimientos";
            referencedColumns: ["id"];
          },
        ];
      };

      pelotones: {
        Row: {
          id: string;
          nombre: string;
          compania_id: string;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          compania_id: string;
          orden: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          compania_id?: string;
          orden?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pelotones_compania_id_fkey";
            columns: ["compania_id"];
            referencedRelation: "companias";
            referencedColumns: ["id"];
          },
        ];
      };

      escuadras: {
        Row: {
          id: string;
          nombre: string;
          /** null cuando la escuadra cuelga directamente de una compañía */
          peloton_id: string | null;
          /** null cuando la escuadra cuelga de un pelotón */
          compania_id: string | null;
          indicativo_radio: string | null;
          max_miembros: number;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          peloton_id?: string | null;
          compania_id?: string | null;
          indicativo_radio?: string | null;
          max_miembros?: number;
          orden: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          peloton_id?: string | null;
          compania_id?: string | null;
          indicativo_radio?: string | null;
          max_miembros?: number;
          orden?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "escuadras_peloton_id_fkey";
            columns: ["peloton_id"];
            referencedRelation: "pelotones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "escuadras_compania_id_fkey";
            columns: ["compania_id"];
            referencedRelation: "companias";
            referencedColumns: ["id"];
          },
        ];
      };

      cursos: {
        Row: {
          id: string;
          sigla: string;
          nombre: string;
          descripcion: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sigla: string;
          nombre: string;
          descripcion?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sigla?: string;
          nombre?: string;
          descripcion?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      miembros: {
        Row: {
          id: string;
          nombre_milsim: string;
          rango: RangoMilitar;
          rol: string | null;
          /** Solo uno de los cuatro FKs de unidad puede ser non-null */
          regimiento_id: string | null;
          compania_id: string | null;
          peloton_id: string | null;
          escuadra_id: string | null;
          activo: boolean;
          fecha_ingreso: string | null;
          discord_id: string | null;
          steam_id: string | null;
          notas_admin: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre_milsim: string;
          rango: RangoMilitar;
          rol?: string | null;
          regimiento_id?: string | null;
          compania_id?: string | null;
          peloton_id?: string | null;
          escuadra_id?: string | null;
          activo?: boolean;
          fecha_ingreso?: string | null;
          discord_id?: string | null;
          steam_id?: string | null;
          notas_admin?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre_milsim?: string;
          rango?: RangoMilitar;
          rol?: string | null;
          regimiento_id?: string | null;
          compania_id?: string | null;
          peloton_id?: string | null;
          escuadra_id?: string | null;
          activo?: boolean;
          fecha_ingreso?: string | null;
          discord_id?: string | null;
          steam_id?: string | null;
          notas_admin?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "miembros_regimiento_id_fkey";
            columns: ["regimiento_id"];
            referencedRelation: "regimientos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "miembros_compania_id_fkey";
            columns: ["compania_id"];
            referencedRelation: "companias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "miembros_peloton_id_fkey";
            columns: ["peloton_id"];
            referencedRelation: "pelotones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "miembros_escuadra_id_fkey";
            columns: ["escuadra_id"];
            referencedRelation: "escuadras";
            referencedColumns: ["id"];
          },
        ];
      };

      miembro_cursos: {
        Row: {
          miembro_id: string;
          curso_id: string;
          fecha_completado: string | null;
        };
        Insert: {
          miembro_id: string;
          curso_id: string;
          fecha_completado?: string | null;
        };
        Update: {
          miembro_id?: string;
          curso_id?: string;
          fecha_completado?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "miembro_cursos_miembro_id_fkey";
            columns: ["miembro_id"];
            referencedRelation: "miembros";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "miembro_cursos_curso_id_fkey";
            columns: ["curso_id"];
            referencedRelation: "cursos";
            referencedColumns: ["id"];
          },
        ];
      };

      audit_log: {
        Row: {
          id: string;
          tabla: string;
          registro_id: string;
          accion: string;
          datos_anteriores: Json | null;
          datos_nuevos: Json | null;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tabla: string;
          registro_id: string;
          accion: string;
          datos_anteriores?: Json | null;
          datos_nuevos?: Json | null;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tabla?: string;
          registro_id?: string;
          accion?: string;
          datos_anteriores?: Json | null;
          datos_nuevos?: Json | null;
          usuario_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      app_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: AppRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: AppRole;
          created_at?: string;
        };
        Relationships: [];
      };
    };

    Views: {
      /**
       * Vista completa del ORBAT. Incluye datos sensibles (discord_id, steam_id,
       * notas_admin). Solo accesible con rol admin u officer.
       * Cada fila representa UN miembro con toda su cadena jerárquica.
       * Los campos de unidad son null en los niveles que el miembro no tiene asignados.
       */
      vista_orbat: {
        Row: {
          // ── Miembro ─────────────────────────────────────────────────────
          miembro_id: string;
          nombre_milsim: string;
          rango: RangoMilitar;
          rol: string | null;
          activo: boolean;
          fecha_ingreso: string | null;
          discord_id: string | null;
          steam_id: string | null;
          notas_admin: string | null;
          // ── Escuadra (null si el miembro está en un nivel superior) ─────
          escuadra_id: string | null;
          escuadra_nombre: string | null;
          escuadra_indicativo_radio: string | null;
          escuadra_max_miembros: number | null;
          escuadra_orden: number | null;
          // ── Pelotón ──────────────────────────────────────────────────────
          peloton_id: string | null;
          peloton_nombre: string | null;
          peloton_orden: number | null;
          // ── Compañía ─────────────────────────────────────────────────────
          compania_id: string | null;
          compania_nombre: string | null;
          compania_logo_url: string | null;
          compania_orden: number | null;
          // ── Regimiento ───────────────────────────────────────────────────
          regimiento_id: string | null;
          regimiento_nombre: string | null;
          regimiento_descripcion: string | null;
          regimiento_comandante: string | null;
        };
        Relationships: [];
      };

      /**
       * Vista pública del ORBAT. Solo miembros activos, sin discord_id,
       * steam_id ni notas_admin. Accesible sin autenticación.
       */
      vista_orbat_publica: {
        Row: {
          miembro_id: string;
          nombre_milsim: string;
          rango: RangoMilitar;
          rol: string | null;
          fecha_ingreso: string | null;
          escuadra_id: string | null;
          escuadra_nombre: string | null;
          escuadra_indicativo_radio: string | null;
          escuadra_max_miembros: number | null;
          escuadra_orden: number | null;
          peloton_id: string | null;
          peloton_nombre: string | null;
          peloton_orden: number | null;
          compania_id: string | null;
          compania_nombre: string | null;
          compania_logo_url: string | null;
          compania_orden: number | null;
          regimiento_id: string | null;
          regimiento_nombre: string | null;
          regimiento_descripcion: string | null;
          regimiento_comandante: string | null;
        };
        Relationships: [];
      };
    };

    Functions: Record<string, never>;

    Enums: {
      rango_militar: RangoMilitar;
      app_role: AppRole;
    };

    CompositeTypes: Record<string, never>;
  };
}

// ─── Helpers de tipos derivados ──────────────────────────────────────────────

type PublicTables = Database["public"]["Tables"];
type PublicViews = Database["public"]["Views"];

export type RegimientoRow = PublicTables["regimientos"]["Row"];
export type RegimientoInsert = PublicTables["regimientos"]["Insert"];
export type RegimientoUpdate = PublicTables["regimientos"]["Update"];

export type CompaniaRow = PublicTables["companias"]["Row"];
export type CompaniaInsert = PublicTables["companias"]["Insert"];
export type CompaniaUpdate = PublicTables["companias"]["Update"];

export type PelotonRow = PublicTables["pelotones"]["Row"];
export type PelotonInsert = PublicTables["pelotones"]["Insert"];
export type PelotonUpdate = PublicTables["pelotones"]["Update"];

export type EscuadraRow = PublicTables["escuadras"]["Row"];
export type EscuadraInsert = PublicTables["escuadras"]["Insert"];
export type EscuadraUpdate = PublicTables["escuadras"]["Update"];

export type CursoRow = PublicTables["cursos"]["Row"];
export type CursoInsert = PublicTables["cursos"]["Insert"];
export type CursoUpdate = PublicTables["cursos"]["Update"];

export type MiembroRow = PublicTables["miembros"]["Row"];
export type MiembroInsert = PublicTables["miembros"]["Insert"];
export type MiembroUpdate = PublicTables["miembros"]["Update"];

export type MiembroCursoRow = PublicTables["miembro_cursos"]["Row"];
export type MiembroCursoInsert = PublicTables["miembro_cursos"]["Insert"];

export type AuditLogRow = PublicTables["audit_log"]["Row"];

export type AppRoleRow = PublicTables["app_roles"]["Row"];
export type AppRoleInsert = PublicTables["app_roles"]["Insert"];

export type VistaOrbatRow = PublicViews["vista_orbat"]["Row"];
export type VistaOrbatPublicaRow = PublicViews["vista_orbat_publica"]["Row"];

// ─── Tipos compuestos (query results) ────────────────────────────────────────

/** Miembro con sus cursos completados, usado en getMiembro() */
export type MiembroConCursos = MiembroRow & {
  cursos: (MiembroCursoRow & { curso: CursoRow })[];
};
