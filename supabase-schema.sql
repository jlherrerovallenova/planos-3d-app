-- ==============================================================================
-- SCHEMA SUPABASE PARA GESTIÓN Y SUBIDA MASIVA DE PLANOS POR PROMOCIÓN
-- ==============================================================================
-- Ejecuta este script en el "SQL Editor" de tu panel de Supabase.
-- Crea las tablas 'promotions' y 'plans', el bucket de almacenamiento y las políticas RLS.

-- 1. Extensión para UUIDs (normalmente habilitada por defecto)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Promociones Inmobiliarias
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    developer_name TEXT,
    agency_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Planos asociados a Promociones
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
    portal TEXT NOT NULL DEFAULT 'Portal 1',
    typology TEXT NOT NULL DEFAULT 'Vivienda Tipo',
    unit_identifier TEXT, -- Ejemplo: "1º A", "Bajo B", "Ático C"
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT,
    num_pages INTEGER DEFAULT 1,
    useful_area NUMERIC(6,2),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_plans_promotion_id ON public.plans(promotion_id);
CREATE INDEX IF NOT EXISTS idx_plans_portal ON public.plans(portal);
CREATE INDEX IF NOT EXISTS idx_plans_typology ON public.plans(typology);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para acceso con clave pública (anon) y autenticado
DROP POLICY IF EXISTS "Permitir lectura publica de promociones" ON public.promotions;
CREATE POLICY "Permitir lectura publica de promociones" 
ON public.promotions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion de promociones" ON public.promotions;
CREATE POLICY "Permitir insercion de promociones" 
ON public.promotions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de promociones" ON public.promotions;
CREATE POLICY "Permitir actualizacion de promociones" 
ON public.promotions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir eliminacion de promociones" ON public.promotions;
CREATE POLICY "Permitir eliminacion de promociones" 
ON public.promotions FOR DELETE USING (true);

-- Políticas para planos
DROP POLICY IF EXISTS "Permitir lectura publica de planos" ON public.plans;
CREATE POLICY "Permitir lectura publica de planos" 
ON public.plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion de planos" ON public.plans;
CREATE POLICY "Permitir insercion de planos" 
ON public.plans FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de planos" ON public.plans;
CREATE POLICY "Permitir actualizacion de planos" 
ON public.plans FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir eliminacion de planos" ON public.plans;
CREATE POLICY "Permitir eliminacion de planos" 
ON public.plans FOR DELETE USING (true);

-- 5. Bucket de Almacenamiento (Storage) para Archivos de Planos
INSERT INTO storage.buckets (id, name, public)
VALUES ('promociones-planos', 'promociones-planos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para el bucket 'promociones-planos'
DROP POLICY IF EXISTS "Lectura publica bucket planos" ON storage.objects;
CREATE POLICY "Lectura publica bucket planos"
ON storage.objects FOR SELECT
USING (bucket_id = 'promociones-planos');

DROP POLICY IF EXISTS "Subida publica bucket planos" ON storage.objects;
CREATE POLICY "Subida publica bucket planos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'promociones-planos');

DROP POLICY IF EXISTS "Modificacion bucket planos" ON storage.objects;
CREATE POLICY "Modificacion bucket planos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'promociones-planos');

DROP POLICY IF EXISTS "Eliminacion bucket planos" ON storage.objects;
CREATE POLICY "Eliminacion bucket planos"
ON storage.objects FOR DELETE
USING (bucket_id = 'promociones-planos');
