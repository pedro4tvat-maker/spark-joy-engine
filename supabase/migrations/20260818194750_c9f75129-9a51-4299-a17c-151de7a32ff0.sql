DROP VIEW IF EXISTS public.profiles_basic;

DROP POLICY IF EXISTS profiles_select_own_or_manager ON public.profiles;
CREATE POLICY profiles_select_auth ON public.profiles
  FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, avatar_url, active) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;