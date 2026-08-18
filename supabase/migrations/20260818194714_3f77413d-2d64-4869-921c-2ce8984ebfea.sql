-- profiles: restrict full row reads
DROP POLICY IF EXISTS profiles_select_auth ON public.profiles;
CREATE POLICY profiles_select_own_or_manager ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_manager(auth.uid()) OR public.is_admin(auth.uid()));

-- non-sensitive directory view (name/avatar only)
CREATE OR REPLACE VIEW public.profiles_basic
  WITH (security_invoker = off) AS
  SELECT id, full_name, avatar_url, active FROM public.profiles;
GRANT SELECT ON public.profiles_basic TO authenticated;

-- user_roles: own row or managers
DROP POLICY IF EXISTS user_roles_select_auth ON public.user_roles;
CREATE POLICY user_roles_select_own_or_manager ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_manager(auth.uid()) OR public.is_admin(auth.uid()));

-- reference data: keep insert/update open to staff, restrict deletes to managers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cities','schools','labs','partners','lens_types','vehicles','employees'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_manage', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_manager(auth.uid()) OR public.is_admin(auth.uid()))', t || '_delete', t);
  END LOOP;
END $$;

-- trigger helper does not need to be callable by API roles
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated, anon;