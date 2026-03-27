-- Migration: fix audit log trigger and add usuario_email
-- Problems fixed:
--   1. Trigger was saving NEW for both datos_anteriores and datos_nuevos on UPDATE
--   2. Trigger fired even when no fields actually changed (no WHEN clause)
--   3. usuario_email was not captured, only the UUID

-- 1. Add usuario_email column to audit_log
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS usuario_email text;

-- 2. Recreate the trigger function with correct OLD/NEW logic
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid  uuid;
  _email text;
BEGIN
  _uid   := auth.uid();
  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id, usuario_email)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', NULL, row_to_json(NEW), _uid, _email);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id, usuario_email)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', row_to_json(OLD), row_to_json(NEW), _uid, _email);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id, usuario_email)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', row_to_json(OLD), NULL, _uid, _email);
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. Recreate triggers on all audited tables.
--    UPDATE triggers now include WHEN (OLD IS DISTINCT FROM NEW) so no-op
--    updates (all fields identical) are never written to audit_log.

-- miembros
DROP TRIGGER IF EXISTS audit_miembros ON miembros;
CREATE TRIGGER audit_miembros
  AFTER INSERT OR DELETE ON miembros
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS audit_miembros_update ON miembros;
CREATE TRIGGER audit_miembros_update
  AFTER UPDATE ON miembros
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION fn_audit_log();

-- escuadras
DROP TRIGGER IF EXISTS audit_escuadras ON escuadras;
CREATE TRIGGER audit_escuadras
  AFTER INSERT OR DELETE ON escuadras
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS audit_escuadras_update ON escuadras;
CREATE TRIGGER audit_escuadras_update
  AFTER UPDATE ON escuadras
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION fn_audit_log();

-- pelotones
DROP TRIGGER IF EXISTS audit_pelotones ON pelotones;
CREATE TRIGGER audit_pelotones
  AFTER INSERT OR DELETE ON pelotones
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS audit_pelotones_update ON pelotones;
CREATE TRIGGER audit_pelotones_update
  AFTER UPDATE ON pelotones
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION fn_audit_log();

-- companias
DROP TRIGGER IF EXISTS audit_companias ON companias;
CREATE TRIGGER audit_companias
  AFTER INSERT OR DELETE ON companias
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS audit_companias_update ON companias;
CREATE TRIGGER audit_companias_update
  AFTER UPDATE ON companias
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION fn_audit_log();

-- regimientos
DROP TRIGGER IF EXISTS audit_regimientos ON regimientos;
CREATE TRIGGER audit_regimientos
  AFTER INSERT OR DELETE ON regimientos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS audit_regimientos_update ON regimientos;
CREATE TRIGGER audit_regimientos_update
  AFTER UPDATE ON regimientos
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION fn_audit_log();

-- app_roles
DROP TRIGGER IF EXISTS audit_app_roles ON app_roles;
CREATE TRIGGER audit_app_roles
  AFTER INSERT OR DELETE ON app_roles
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS audit_app_roles_update ON app_roles;
CREATE TRIGGER audit_app_roles_update
  AFTER UPDATE ON app_roles
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION fn_audit_log();
