# ORBAT MilSim v2

Sistema de gestión de ORBAT (Orden de Batalla) para comunidades MilSim. Administra efectivos, escuadras, compañías, pelotones y regimientos con control de acceso por roles y auditoría automática.

## Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** shadcn/ui v4 + Tailwind CSS v4
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth

## Requisitos previos

- Node.js 18+
- Cuenta de Supabase (o instancia self-hosted)
- `pnpm` (recomendado) o `npm`

## Instalación

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd orbat-milsim

# 2. Instalar dependencias
pnpm install

# 3. Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase
```

## Variables de entorno

Crea `.env.local` con las siguientes variables (obtenidas desde el dashboard de Supabase → Settings → API):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> La `SERVICE_ROLE_KEY` solo se usa en el servidor para bypass de RLS en la vista pública del ORBAT.

## Setup de base de datos

Ejecuta el SQL del archivo `supabase/schema.sql` en el editor de Supabase (SQL Editor → New query).

### Esquema resumido

| Tabla | Descripción |
|-------|-------------|
| `regimientos` | Nivel regimiento/batallón |
| `companias` | Nivel compañía |
| `pelotones` | Nivel pelotón |
| `escuadras` | Nivel escuadra (con `max_miembros`) |
| `miembros` | Efectivos (asignados a un nivel de la jerarquía) |
| `cursos` | Cursos y certificaciones |
| `miembro_cursos` | Relación M2M miembro ↔ curso |
| `app_roles` | Roles de usuario (`admin`, `officer`, `viewer`) |
| `audit_log` | Log automático de todos los cambios |

### Triggers de auditoría

La auditoría es **automática vía triggers de Postgres**. Cada INSERT, UPDATE o DELETE en `miembros`, `escuadras`, `pelotones`, `companias`, `regimientos` y `app_roles` genera un registro en `audit_log` con:

- La tabla afectada
- La acción (`INSERT`/`UPDATE`/`DELETE`)
- El estado anterior (`datos_anteriores`) y nuevo (`datos_nuevos`) como JSONB
- El usuario que realizó la acción

```sql
-- Función de auditoría genérica
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_usuario_id UUID;
BEGIN
  BEGIN
    v_usuario_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID;
  EXCEPTION WHEN OTHERS THEN v_usuario_id := NULL; END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', NULL, to_jsonb(NEW), v_usuario_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_usuario_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id)
    VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', to_jsonb(OLD), NULL, v_usuario_id);
    RETURN OLD;
  END IF;
END; $$;

-- Aplicar a todas las tablas auditadas
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['miembros','escuadras','pelotones','companias','regimientos','app_roles'] LOOP
    EXECUTE format('
      CREATE TRIGGER trg_audit_%1$s
      AFTER INSERT OR UPDATE OR DELETE ON %1$s
      FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    ', t);
  END LOOP;
END; $$;
```

## Ejecutar en desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Crear el primer usuario admin

1. Regístrate desde `/registro` o crea el usuario en Supabase → Authentication → Users → Invite user
2. Asigna el rol admin directamente en la base de datos:

```sql
INSERT INTO app_roles (user_id, role)
VALUES ('<uuid-del-usuario>', 'admin');
```

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| `admin` | Acceso completo, incluyendo `/auditoria` y gestión de roles |
| `officer` | Personal, estructura, tablero, cursos |
| `viewer` | Solo lectura |

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/           # Login y registro
│   ├── (dashboard)/      # Panel admin (requiere auth)
│   │   ├── page.tsx      # Panel de control con estadísticas
│   │   ├── personal/     # Gestión de miembros
│   │   ├── estructura/   # Árbol jerárquico CRUD
│   │   ├── tablero/      # Asignación de escuadras (kanban)
│   │   ├── cursos/       # Gestión de cursos
│   │   └── auditoria/    # Log de auditoría (solo admin)
│   ├── (public)/         # ORBAT público (sin auth)
│   └── actions/          # Server Actions (CRUD)
├── components/
│   ├── dashboard/        # Sidebar y header
│   ├── auditoria/        # Tabla de auditoría con diff viewer
│   ├── personal/         # Tabla y formularios de miembros
│   ├── estructura/       # Árbol jerárquico
│   ├── tablero/          # Kanban drag-and-drop
│   └── cursos/           # Gestión de cursos
└── lib/
    ├── supabase/         # Clientes (server/client/admin) + queries
    └── types/            # Tipos TypeScript de la DB
```

## Build para producción

```bash
pnpm build
pnpm start
```

## Notas importantes

- La página `/` sirve el ORBAT público. Si deseas usar `/` como dashboard de control, mueve `src/app/(public)/page.tsx` a otra ruta (p.ej. `/orbat`).
- La página de Auditoría (`/auditoria`) solo es visible en el sidebar para usuarios con rol `admin`.
- Los triggers de auditoría deben crearse manualmente en Supabase antes de que la página de auditoría muestre datos.
