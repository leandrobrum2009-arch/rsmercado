 -- SECURITY HARDENING V2
 
 -- 1. Fix Recipes INSERT policy
 DROP POLICY IF EXISTS "Users can create their own recipes" ON public.recipes;
 CREATE POLICY "Users can create their own recipes" 
 ON public.recipes FOR INSERT 
 TO authenticated 
 WITH CHECK (auth.uid() = author_id);
 
 -- 2. Fix Comments INSERT policy
 DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
 CREATE POLICY "Authenticated users can insert comments" 
 ON public.comments FOR INSERT 
 TO authenticated 
 WITH CHECK (auth.uid() = user_id);
 
 -- 3. Tighten Store Settings SELECT policy
 DROP POLICY IF EXISTS "Public store settings are viewable by everyone" ON public.store_settings;
 CREATE POLICY "Public store settings are viewable by everyone" 
 ON public.store_settings 
 FOR SELECT 
 USING (
   key NOT IN (
     'whatsapp_config', 
     'api_keys', 
     'secret_config', 
     'master_key', 
     'admin_key', 
     'stripe_secret', 
     'smtp_password',
     'supabase_service_role'
   )
 );
 
 -- 4. Ensure RLS on user_roles
 ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
 DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
 CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
 DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
 CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin());