-- Supabase SQL schema for Nexus AI Operations Assistant

-- 1. Departments Table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Users Table
CREATE TABLE public.app_users (
  id UUID PRIMARY KEY, -- Maps to auth.uid()
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department_id UUID REFERENCES public.departments(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'department_user', 'manager')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Data Sources Table
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_file_id TEXT NOT NULL,
  google_folder_id TEXT,
  file_name TEXT NOT NULL,
  file_type TEXT,
  mime_type TEXT,
  enabled BOOLEAN DEFAULT true,
  last_modified_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  row_count INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Spreadsheet Rows Table
CREATE TABLE public.data_source_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE CASCADE,
  sheet_name TEXT NOT NULL,
  row_key TEXT NOT NULL,
  row_hash TEXT NOT NULL,
  row_data JSONB NOT NULL,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(data_source_id, sheet_name, row_key)
);

-- 5. Tasks Table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  source_file_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  source_file_name TEXT,
  source_sheet_name TEXT,
  source_row_key TEXT,
  department_id UUID REFERENCES public.departments(id),
  assigned_user_id UUID REFERENCES public.app_users(id),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('unassigned', 'pending', 'in_progress', 'completed', 'rejected', 'cancelled')) DEFAULT 'unassigned',
  created_by TEXT, -- UUID or 'system'
  ai_classification BOOLEAN DEFAULT false,
  ai_confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 6. AI Rules Table
CREATE TABLE public.ai_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  keywords TEXT NOT NULL,
  source_conditions TEXT,
  target_department_id UUID REFERENCES public.departments(id),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Notifications Table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.app_users(id),
  department_id UUID REFERENCES public.departments(id),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Activity Logs Table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.app_users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Google Drive Connections Table
CREATE TABLE public.google_drive_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.app_users(id) NOT NULL UNIQUE,
  google_account_email TEXT NOT NULL,
  encrypted_access_token TEXT,
  encrypted_refresh_token TEXT,
  expiry TIMESTAMP WITH TIME ZONE,
  scopes TEXT,
  status TEXT DEFAULT 'connected',
  selected_folder_id TEXT,
  selected_folder_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_source_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_connections ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.app_users WHERE id = auth.uid();
$$;

-- Helper function to get current user department
CREATE OR REPLACE FUNCTION get_user_department()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT department_id FROM public.app_users WHERE id = auth.uid();
$$;

-- RLS Policies: Departments
CREATE POLICY "Everyone can read departments"
ON public.departments FOR SELECT USING (true);

-- RLS Policies: Users
CREATE POLICY "Users can view all users"
ON public.app_users FOR SELECT USING (true);

-- RLS Policies: Tasks
CREATE POLICY "Admin can view all tasks"
ON public.tasks FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Department users can view and update their department tasks"
ON public.tasks FOR SELECT USING (
  department_id = get_user_department() OR assigned_user_id = auth.uid() OR get_user_role() = 'admin'
);

CREATE POLICY "Department users can update their department tasks"
ON public.tasks FOR UPDATE USING (
  department_id = get_user_department() OR assigned_user_id = auth.uid()
);

-- RLS Policies: Notifications
CREATE POLICY "Admin can view all notifications"
ON public.notifications FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Users can only view their own notifications or department notifications"
ON public.notifications FOR SELECT USING (
  user_id = auth.uid() OR department_id = get_user_department() OR get_user_role() = 'admin'
);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE USING (
  user_id = auth.uid()
);

-- RLS Policies: AI Rules
CREATE POLICY "All users can view rules"
ON public.ai_rules FOR SELECT USING (true);

CREATE POLICY "Only admins can modify rules"
ON public.ai_rules FOR ALL USING (get_user_role() = 'admin');

-- RLS Policies: Data Sources and Rows
CREATE POLICY "Admin can completely access data sources"
ON public.data_sources FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Department users can read data sources" 
ON public.data_sources FOR SELECT USING (true);

CREATE POLICY "Admin can completely access data rows"
ON public.data_source_rows FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Department users can read rows"
ON public.data_source_rows FOR SELECT USING (true);

-- RLS Policies: Activity Logs
CREATE POLICY "Admin can view all logs"
ON public.activity_logs FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Users can insert logs"
ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies: Google Drive Connections
CREATE POLICY "Admins manage drive connections"
ON public.google_drive_connections FOR ALL USING (get_user_role() = 'admin');

-- Supabase Realtime Replacements
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.data_sources;
