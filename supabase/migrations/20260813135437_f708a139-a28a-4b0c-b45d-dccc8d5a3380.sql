CREATE TABLE public.access_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  is_manager boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  built_in boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_types TO authenticated;
GRANT ALL ON public.access_types TO service_role;

ALTER TABLE public.access_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem tipos de acesso" ON public.access_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam tipos de acesso" ON public.access_types
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_access_types_updated BEFORE UPDATE ON public.access_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.access_types (key, label, description, position, is_manager, is_admin, built_in) VALUES
  ('administrador', 'Administrador', 'Acesso total', 1, true, true, true),
  ('coordenador', 'Coordenador', 'Gerencia atividades', 2, true, true, true),
  ('financeiro', 'Financeiro', 'Prestação de contas', 3, true, false, true),
  ('vendedor', 'Vendedor', 'Vê apenas seus atendimentos', 4, false, false, true),
  ('optometrista', 'Optometrista', 'Vê apenas seus atendimentos', 5, false, false, true),
  ('entregador', 'Entregador', 'Vê apenas suas entregas', 6, false, false, true),
  ('motorista', 'Motorista', 'Vê apenas viagens', 7, false, false, true);

-- Papéis passam a ser texto livre (validado pela tabela access_types)
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.role_permissions ALTER COLUMN role TYPE text USING role::text;

-- Funções de checagem continuam com a mesma assinatura para não quebrar policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role::text);
$$;

CREATE OR REPLACE FUNCTION public.has_role_key(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.access_types at ON at.key = ur.role
    WHERE ur.user_id = _user_id AND at.active AND at.is_admin
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.access_types at ON at.key = ur.role
    WHERE ur.user_id = _user_id AND at.active AND at.is_manager
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_role_key(uuid, text) FROM anon;
