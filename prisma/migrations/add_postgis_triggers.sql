-- =====================================================
-- MIGRATION: PostGIS Completo
-- =====================================================

-- Ativar PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Criar índices espaciais
CREATE INDEX IF NOT EXISTS idx_gps_viagem_geom ON public.gps_viagem USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_alunos_home_geom ON public.alunos USING GIST (home_geom);
CREATE INDEX IF NOT EXISTS idx_alunos_geom ON public.alunos USING GIST (geom);

-- Função para sincronizar lat/lng → geometry
CREATE OR REPLACE FUNCTION sync_lat_lng_to_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'gps_viagem' THEN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
      NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'alunos' THEN
    IF NEW.home_lat IS NOT NULL AND NEW.home_lng IS NOT NULL THEN
      NEW.home_geom := ST_SetSRID(ST_MakePoint(NEW.home_lng, NEW.home_lat), 4326);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS gps_viagem_sync_geom ON public.gps_viagem;
CREATE TRIGGER gps_viagem_sync_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.gps_viagem
  FOR EACH ROW
  EXECUTE FUNCTION sync_lat_lng_to_geom();

DROP TRIGGER IF EXISTS alunos_sync_home_geom ON public.alunos;
CREATE TRIGGER alunos_sync_home_geom
  BEFORE INSERT OR UPDATE OF home_lat, home_lng ON public.alunos
  FOR EACH ROW
  EXECUTE FUNCTION sync_lat_lng_to_geom();

-- Atualizar registros existentes
UPDATE public.gps_viagem
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND geom IS NULL;

UPDATE public.alunos
SET home_geom = ST_SetSRID(ST_MakePoint(home_lng, home_lat), 4326)
WHERE home_lat IS NOT NULL 
  AND home_lng IS NOT NULL 
  AND home_geom IS NULL;

-- Verificação final
DO $$
DECLARE
  gps_count INTEGER;
  aluno_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO gps_count FROM public.gps_viagem WHERE geom IS NOT NULL;
  SELECT COUNT(*) INTO aluno_count FROM public.alunos WHERE home_geom IS NOT NULL;
  
  RAISE NOTICE '✅ Migration concluída!';
  RAISE NOTICE '📍 GPS com geometry: %', gps_count;
  RAISE NOTICE '👦 Alunos com home_geom: %', aluno_count;
END $$;
