-- MULTI-TENANT ARCHITECTURE & GOOGLE AUTH SETUP FOR NEXUS AI
BEGIN;

-- 1. Create Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Default Company for existing data safety
INSERT INTO public.companies (id, name, code) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Company', 'DEFAULT')
ON CONFLICT DO NOTHING;

-- 3. Update Existing Roles Enum safely (if they don't exist)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'company_admin';

-- 4. Add company_id safely to all core tables
DO $$
DECLARE 
  t TEXT;
  tables TEXT[] := ARRAY['app_users', 'departments', 'tasks', 'data_sources', 'data_source_rows', 'ai_rules', 'notifications', 'activity_logs', 'google_drive_connections'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE public.%I SET company_id = %L WHERE company_id IS NULL', t, '00000000-0000-0000-0000-000000000000');
    -- We won't strictly enforce NOT NULL yet in the DO block to prevent constraints errors on existing corrupted data easily, but ideally it should be:
    -- EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET NOT NULL', t);
  END LOOP;
END $$;

-- 5. Add auth link to app_users (We use Email as primary bridge for pre-authorized Google Logins)
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- Upgrade existing root admin back to Super Admin for safety so the user doesn't get locked out
UPDATE public.app_users SET role = 'super_admin' WHERE email = 'admin@demo.com';

-- 6. Helper Functions for Secure RLS (Reads from JWT email safely)
CREATE OR REPLACE FUNCTION auth_company_id() RETURNS UUID AS $$
  SELECT company_id FROM public.app_users WHERE email = auth.jwt()->>'email' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT role::text FROM public.app_users WHERE email = auth.jwt()->>'email' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_app_user_id() RETURNS UUID AS $$
  SELECT id FROM public.app_users WHERE email = auth.jwt()->>'email' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 7. RE-WRITE ROW LEVEL SECURITY BOUNDARIES 
-- We enforce total tenant isolation here.

-- Helper: drop all existing policies dynamically to reset them
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Configure RLS logic for COMPANIES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SuperAdmins view all companies, users view their own" ON public.companies FOR SELECT USING (
  auth_role() = 'super_admin' OR id = auth_company_id()
);
CREATE POLICY "SuperAdmins insert companies" ON public.companies FOR INSERT WITH CHECK (auth_role() = 'super_admin');
CREATE POLICY "SuperAdmins update companies" ON public.companies FOR UPDATE USING (auth_role() = 'super_admin');

-- Configure RLS logic for APP_USERS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view logic" ON public.app_users FOR SELECT USING (
  auth_role() = 'super_admin' OR company_id = auth_company_id()
);
CREATE POLICY "SuperAdmin and CompanyAdmin Insert" ON public.app_users FOR INSERT WITH CHECK (
  auth_role() = 'super_admin' OR (auth_role() = 'company_admin' AND company_id = auth_company_id())
);
CREATE POLICY "SuperAdmin and CompanyAdmin Update" ON public.app_users FOR UPDATE USING (
  auth_role() = 'super_admin' OR (auth_role() = 'company_admin' AND company_id = auth_company_id())
);
CREATE POLICY "SuperAdmin and CompanyAdmin Delete" ON public.app_users FOR DELETE USING (
  auth_role() = 'super_admin' OR (auth_role() = 'company_admin' AND company_id = auth_company_id())
);

-- Configure RLS logic for DEPARTMENTS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dept select" ON public.departments FOR SELECT USING (auth_role() = 'super_admin' OR company_id = auth_company_id());
CREATE POLICY "Dept modify" ON public.departments FOR ALL USING (
  auth_role() = 'super_admin' OR (auth_role() = 'company_admin' AND company_id = auth_company_id())
);

-- Configure RLS logic for TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Task select" ON public.tasks FOR SELECT USING (
  auth_role() = 'super_admin' 
  OR (auth_role() = 'company_admin' AND company_id = auth_company_id())
  OR (auth_role() = 'department_user' AND company_id = auth_company_id() AND department_id IN (SELECT department_id FROM public.app_users WHERE email = auth.jwt()->>'email'))
);
CREATE POLICY "Task modify" ON public.tasks FOR ALL USING (
  auth_role() = 'super_admin' 
  OR (auth_role() = 'company_admin' AND company_id = auth_company_id())
  OR (auth_role() = 'department_user' AND company_id = auth_company_id() AND department_id IN (SELECT department_id FROM public.app_users WHERE email = auth.jwt()->>'email'))
);

-- Standard isolation for Data Sources, Rules, Logs, Notifications, Connections
DO $$
DECLARE 
  t TEXT;
  tables TEXT[] := ARRAY['data_sources', 'data_source_rows', 'ai_rules', 'notifications', 'activity_logs', 'google_drive_connections'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "Generic Tenant Select" ON public.%I FOR SELECT USING (auth_role() = ''super_admin'' OR company_id = auth_company_id());', t);
    EXECUTE format('CREATE POLICY "Generic Tenant Modify" ON public.%I FOR ALL USING (auth_role() = ''super_admin'' OR (auth_role() = ''company_admin'' AND company_id = auth_company_id()));', t);
  END LOOP;
END $$;

COMMIT;
