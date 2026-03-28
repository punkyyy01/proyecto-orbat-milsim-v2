-- ─────────────────────────────────────────────────────────────────────────────
-- Multi-Assignment: reemplazar FKs directos en miembros por tabla asignaciones.
-- Un miembro puede tener múltiples asignaciones (principal + secundarias).
--
-- Contexto: mandos como CSM Gameremi lideran en HQ y también participan en
-- equipos especiales (RSTB, 160th SOAR). Esto es normal en milsim.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── PASO 1: Crear tabla asignaciones ────────────────────────────────────────

CREATE TABLE asignaciones (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id   uuid        NOT NULL REFERENCES miembros(id)    ON DELETE CASCADE,
  regimiento_id uuid       REFERENCES regimientos(id)           ON DELETE CASCADE,
  compania_id  uuid        REFERENCES companias(id)             ON DELETE CASCADE,
  peloton_id   uuid        REFERENCES pelotones(id)             ON DELETE CASCADE,
  escuadra_id  uuid        REFERENCES escuadras(id)             ON DELETE CASCADE,
  es_principal boolean     NOT NULL DEFAULT false,
  rol_en_unidad text       DEFAULT NULL,
  orden        int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),

  -- Exactamente UNO de los FKs de unidad debe tener valor
  CONSTRAINT chk_asignacion_single_level CHECK (
    (CASE WHEN regimiento_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN compania_id   IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN peloton_id    IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN escuadra_id   IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

-- Índices de performance
CREATE INDEX idx_asignaciones_miembro    ON asignaciones(miembro_id);
CREATE INDEX idx_asignaciones_escuadra   ON asignaciones(escuadra_id)   WHERE escuadra_id   IS NOT NULL;
CREATE INDEX idx_asignaciones_peloton    ON asignaciones(peloton_id)    WHERE peloton_id    IS NOT NULL;
CREATE INDEX idx_asignaciones_compania   ON asignaciones(compania_id)   WHERE compania_id   IS NOT NULL;
CREATE INDEX idx_asignaciones_regimiento ON asignaciones(regimiento_id) WHERE regimiento_id IS NOT NULL;

-- Un miembro no puede estar dos veces en la misma unidad exacta
CREATE UNIQUE INDEX uq_miembro_escuadra   ON asignaciones(miembro_id, escuadra_id)   WHERE escuadra_id   IS NOT NULL;
CREATE UNIQUE INDEX uq_miembro_peloton    ON asignaciones(miembro_id, peloton_id)    WHERE peloton_id    IS NOT NULL;
CREATE UNIQUE INDEX uq_miembro_compania   ON asignaciones(miembro_id, compania_id)   WHERE compania_id   IS NOT NULL;
CREATE UNIQUE INDEX uq_miembro_regimiento ON asignaciones(miembro_id, regimiento_id) WHERE regimiento_id IS NOT NULL;

-- ─── PASO 2: Migrar datos existentes ─────────────────────────────────────────
-- Cada FK directo en miembros se convierte en una asignación principal.

INSERT INTO asignaciones (miembro_id, regimiento_id, es_principal, orden)
SELECT id, regimiento_id, true, 0 FROM miembros WHERE regimiento_id IS NOT NULL;

INSERT INTO asignaciones (miembro_id, compania_id, es_principal, orden)
SELECT id, compania_id, true, 0 FROM miembros WHERE compania_id IS NOT NULL;

INSERT INTO asignaciones (miembro_id, peloton_id, es_principal, orden)
SELECT id, peloton_id, true, 0 FROM miembros WHERE peloton_id IS NOT NULL;

INSERT INTO asignaciones (miembro_id, escuadra_id, es_principal, orden)
SELECT id, escuadra_id, true, 0 FROM miembros WHERE escuadra_id IS NOT NULL;

-- ─── PASO 3: Eliminar FKs de miembros ────────────────────────────────────────

ALTER TABLE miembros DROP CONSTRAINT IF EXISTS chk_single_assignment;
ALTER TABLE miembros DROP COLUMN IF EXISTS regimiento_id;
ALTER TABLE miembros DROP COLUMN IF EXISTS compania_id;
ALTER TABLE miembros DROP COLUMN IF EXISTS peloton_id;
ALTER TABLE miembros DROP COLUMN IF EXISTS escuadra_id;

-- ─── PASO 4: Recrear vista_orbat (una fila por asignación por miembro) ────────
-- La clave: COALESCE resuelve la jerarquía desde la asignación hacia arriba.

DROP VIEW IF EXISTS vista_orbat CASCADE;
CREATE VIEW vista_orbat AS
SELECT
  m.id              AS miembro_id,
  m.nombre_milsim,
  m.rango,
  m.rol,
  m.activo,
  m.fecha_ingreso,
  m.discord_id,
  m.steam_id,
  m.notas_admin,

  a.id              AS asignacion_id,
  a.es_principal,

  e.id              AS escuadra_id,
  e.nombre          AS escuadra_nombre,
  e.indicativo_radio AS escuadra_indicativo_radio,
  e.max_miembros    AS escuadra_max_miembros,
  e.orden           AS escuadra_orden,

  p.id              AS peloton_id,
  p.nombre          AS peloton_nombre,
  p.orden           AS peloton_orden,

  c.id              AS compania_id,
  c.nombre          AS compania_nombre,
  c.logo_url        AS compania_logo_url,
  c.orden           AS compania_orden,

  r.id              AS regimiento_id,
  r.nombre          AS regimiento_nombre,
  r.descripcion     AS regimiento_descripcion,
  r.comandante      AS regimiento_comandante

FROM miembros m
JOIN  asignaciones a ON a.miembro_id  = m.id
LEFT JOIN escuadras   e ON a.escuadra_id  = e.id
LEFT JOIN pelotones   p ON COALESCE(a.peloton_id,   e.peloton_id)              = p.id
LEFT JOIN companias   c ON COALESCE(a.compania_id,  p.compania_id, e.compania_id) = c.id
LEFT JOIN regimientos r ON COALESCE(a.regimiento_id, c.regimiento_id)           = r.id;

-- ─── PASO 5: Recrear vista_orbat_publica (solo activos, sin datos sensibles) ──

DROP VIEW IF EXISTS vista_orbat_publica CASCADE;
CREATE VIEW vista_orbat_publica AS
SELECT
  m.id              AS miembro_id,
  m.nombre_milsim,
  m.rango,
  m.rol,
  m.fecha_ingreso,

  a.es_principal,

  e.id              AS escuadra_id,
  e.nombre          AS escuadra_nombre,
  e.indicativo_radio AS escuadra_indicativo_radio,
  e.max_miembros    AS escuadra_max_miembros,
  e.orden           AS escuadra_orden,

  p.id              AS peloton_id,
  p.nombre          AS peloton_nombre,
  p.orden           AS peloton_orden,

  c.id              AS compania_id,
  c.nombre          AS compania_nombre,
  c.logo_url        AS compania_logo_url,
  c.orden           AS compania_orden,

  r.id              AS regimiento_id,
  r.nombre          AS regimiento_nombre,
  r.descripcion     AS regimiento_descripcion,
  r.comandante      AS regimiento_comandante

FROM miembros m
JOIN  asignaciones a ON a.miembro_id  = m.id
LEFT JOIN escuadras   e ON a.escuadra_id  = e.id
LEFT JOIN pelotones   p ON COALESCE(a.peloton_id,   e.peloton_id)              = p.id
LEFT JOIN companias   c ON COALESCE(a.compania_id,  p.compania_id, e.compania_id) = c.id
LEFT JOIN regimientos r ON COALESCE(a.regimiento_id, c.regimiento_id)           = r.id
WHERE m.activo = true;
