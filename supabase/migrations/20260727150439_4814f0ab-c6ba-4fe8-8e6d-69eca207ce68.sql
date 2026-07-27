CREATE TABLE public.list_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key text NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_key, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.list_options TO authenticated;
GRANT ALL ON public.list_options TO service_role;

ALTER TABLE public.list_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY list_options_select ON public.list_options FOR SELECT TO authenticated USING (true);
CREATE POLICY list_options_manage ON public.list_options FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_list_options_updated_at BEFORE UPDATE ON public.list_options
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.list_options (group_key, name, position) VALUES
 ('job_role','Optometrista',0),
 ('job_role','Vendedor',1),
 ('job_role','Motorista',2),
 ('job_role','Prestador',3),
 ('job_role','Coordenador',4),
 ('job_role','Auxiliar',5),
 ('job_role','Administrativo',6),
 ('document_category','Fotos',0),
 ('document_category','Relatórios',1),
 ('document_category','Prestação de contas',2),
 ('document_category','Cards',3),
 ('document_category','Comprovantes',4),
 ('document_category','Outros',5);