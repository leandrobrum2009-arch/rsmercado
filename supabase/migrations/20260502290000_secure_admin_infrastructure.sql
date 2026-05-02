-- SECURE ADMIN INFRASTRUCTURE FIX

-- 1. Ensure user_roles is secure and manageable
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Admins can manage roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 2. Ensure profiles are secure and manageable
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by owner" 
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Ensure import_logs are secure
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all import logs" ON public.import_logs;
DROP POLICY IF EXISTS "Admins can insert import logs" ON public.import_logs;

CREATE POLICY "Admins can manage import logs" 
ON public.import_logs 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
