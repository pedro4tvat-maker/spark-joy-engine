import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const LIST_GROUPS: { key: string; label: string; description: string }[] = [
  { key: "job_role", label: "Funções do funcionário", description: "Opções do campo Função" },
  { key: "document_category", label: "Categorias de anexos", description: "Opções ao enviar arquivos" },
];

/** Opções ativas de uma lista suspensa configurável. */
export function useListOptions(groupKey: string, fallback: string[] = []) {
  const query = useQuery({
    queryKey: ["list-options", groupKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("list_options")
        .select("id, name, position, active")
        .eq("group_key", groupKey)
        .eq("active", true)
        .order("position")
        .order("name");
      return (data ?? []).map((o) => o.name);
    },
    staleTime: 60_000,
  });

  return {
    ...query,
    options: query.data && query.data.length > 0 ? query.data : fallback,
  };
}
