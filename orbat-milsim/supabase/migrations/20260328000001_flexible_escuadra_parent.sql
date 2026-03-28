-- ─────────────────────────────────────────────────────────────────────────────
-- Flexible parent para escuadras: pelotón O compañía directa (no ambos, no ninguno)
--
-- Contexto: el RSTB tiene equipos pequeños (3-7 personas) que cuelgan directamente
-- de la compañía sin pelotones intermedios (160th SOAR, BULLDOG, RSB, SAC, Mike).
-- Las compañías regulares (HYDRA, CHARLIE, etc.) no cambian.
-- ─────────────────────────────────────────────────────────────────────────────

-- Paso 1: Hacer peloton_id nullable
ALTER TABLE escuadras ALTER COLUMN peloton_id DROP NOT NULL;

-- Paso 2: Agregar compania_id como padre alternativo
ALTER TABLE escuadras
  ADD COLUMN compania_id uuid REFERENCES companias(id) ON DELETE CASCADE;

-- Paso 3: Constraint — exactamente UN padre (pelotón O compañía, no ambos, no ninguno)
ALTER TABLE escuadras
  ADD CONSTRAINT chk_escuadra_single_parent CHECK (
    (peloton_id IS NOT NULL AND compania_id IS NULL) OR
    (peloton_id IS NULL   AND compania_id IS NOT NULL)
  );

-- Paso 4: Índice para queries de escuadras directas bajo compañía
CREATE INDEX IF NOT EXISTS escuadras_compania_id_idx ON escuadras(compania_id)
  WHERE compania_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Paso 5: Recrear vista_orbat para manejar escuadras directas bajo compañía.
-- La clave: COALESCE(m.compania_id, p.compania_id, e.compania_id) resuelve la
-- compañía tanto para escuadras con pelotón como para escuadras directas.
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS vista_orbat CASCADE;
CREATE VIEW vista_orbat AS
SELECT
  m.id                    AS miembro_id,
  m.nombre_milsim,
  m.rango,
  m.rol,
  m.activo,
  m.fecha_ingreso,
  m.discord_id,
  m.steam_id,
  m.notas_admin,

  -- Escuadra (null si el miembro está asignado a un nivel superior)
  e.id                    AS escuadra_id,
  e.nombre                AS escuadra_nombre,
  e.indicativo_radio      AS escuadra_indicativo_radio,
  e.max_miembros          AS escuadra_max_miembros,
  e.orden                 AS escuadra_orden,

  -- Pelotón (null si la escuadra es directa o el miembro no está en escuadra/pelotón)
  p.id                    AS peloton_id,
  p.nombre                AS peloton_nombre,
  p.orden                 AS peloton_orden,

  -- Compañía: resuelta via pelotón, escuadra directa, o asignación directa del miembro
  c.id                    AS compania_id,
  c.nombre                AS compania_nombre,
  c.logo_url              AS compania_logo_url,
  c.orden                 AS compania_orden,

  -- Regimiento
  r.id                    AS regimiento_id,
  r.nombre                AS regimiento_nombre,
  r.descripcion           AS regimiento_descripcion,
  r.comandante            AS regimiento_comandante

FROM miembros m
LEFT JOIN escuadras  e ON m.escuadra_id = e.id
LEFT JOIN pelotones  p ON e.peloton_id  = p.id
LEFT JOIN companias  c ON COALESCE(m.compania_id, p.compania_id, e.compania_id) = c.id
LEFT JOIN regimientos r ON COALESCE(m.regimiento_id, c.regimiento_id) = r.id;

-- ─────────────────────────────────────────────────────────────────────────────
-- Paso 6: Recrear vista_orbat_publica (igual pero solo activos, sin datos sensibles)
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS vista_orbat_publica CASCADE;
CREATE VIEW vista_orbat_publica AS
SELECT
  m.id                    AS miembro_id,
  m.nombre_milsim,
  m.rango,
  m.rol,
  m.fecha_ingreso,

  e.id                    AS escuadra_id,
  e.nombre                AS escuadra_nombre,
  e.indicativo_radio      AS escuadra_indicativo_radio,
  e.max_miembros          AS escuadra_max_miembros,
  e.orden                 AS escuadra_orden,

  p.id                    AS peloton_id,
  p.nombre                AS peloton_nombre,
  p.orden                 AS peloton_orden,

  c.id                    AS compania_id,
  c.nombre                AS compania_nombre,
  c.logo_url              AS compania_logo_url,
  c.orden                 AS compania_orden,

  r.id                    AS regimiento_id,
  r.nombre                AS regimiento_nombre,
  r.descripcion           AS regimiento_descripcion,
  r.comandante            AS regimiento_comandante

FROM miembros m
LEFT JOIN escuadras  e ON m.escuadra_id = e.id
LEFT JOIN pelotones  p ON e.peloton_id  = p.id
LEFT JOIN companias  c ON COALESCE(m.compania_id, p.compania_id, e.compania_id) = c.id
LEFT JOIN regimientos r ON COALESCE(m.regimiento_id, c.regimiento_id) = r.id
WHERE m.activo = true;
