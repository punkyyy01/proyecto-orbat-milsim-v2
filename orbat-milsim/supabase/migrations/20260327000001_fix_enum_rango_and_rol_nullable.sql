-- Migration: fix rango_militar enum and make rol nullable
-- 1. Add missing general officer ranks to rango_militar enum
-- 2. Add PVT (Private) to rango_militar enum (constants.ts uses PVT; PV1 kept for retrocompat)
-- 3. Make miembros.rol nullable (it's an optional field in the bulk import form)

ALTER TYPE rango_militar ADD VALUE IF NOT EXISTS 'GEN';
ALTER TYPE rango_militar ADD VALUE IF NOT EXISTS 'LTG';
ALTER TYPE rango_militar ADD VALUE IF NOT EXISTS 'MG';
ALTER TYPE rango_militar ADD VALUE IF NOT EXISTS 'BG';
ALTER TYPE rango_militar ADD VALUE IF NOT EXISTS 'PVT';

ALTER TABLE miembros ALTER COLUMN rol DROP NOT NULL;
