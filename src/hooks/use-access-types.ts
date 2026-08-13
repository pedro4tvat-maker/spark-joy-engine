import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { APP_ROLES } from "@/lib/psvne";

export type AccessType = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  position: number;
  isManager: boolean;
  isAdmin: boolean;
  builtIn: boolean;
  active: boolean;
};

/** Tipos de acesso cadastrados (com fallback nos tipos padrão do sistema). */
export function useAccessTypes(includeInactive = false) {
  const query = useQuery<AccessType[]>({
    queryKey: ["access-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_types")
        .select("id, key, label, description, position, is_manager, is_admin, built_in, active")
        .order("position")
        .order("label");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        key: r.key,
        label: r.label,
        description: r.description,
        position: r.position,
        isManager: r.is_manager,
        isAdmin: r.is_admin,
        builtIn: r.built_in,
        active: r.active,
      }));
    },
    staleTime: 60_000,
  });

  const all = query.data ?? [];
  const list = includeInactive ? all : all.filter((t) => t.active);

  const options =
    list.length > 0
      ? list.map((t) => ({ value: t.key, label: t.label, description: t.description ?? "" }))
      : APP_ROLES.map((r) => ({ value: r.value as string, label: r.label, description: r.description }));

  return { ...query, accessTypes: list, options };
}
