import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/psvne";

/** Chaves de permissão configuráveis por papel. */
export const PERMISSIONS: { key: string; label: string; description: string }[] = [
  { key: "ver_todas_atividades", label: "Ver todas as atividades", description: "Enxerga atividades de toda a operação" },
  { key: "criar_atividades", label: "Criar atividades", description: "Pode agendar novas atividades" },
  { key: "editar_atividades", label: "Editar atividades", description: "Pode alterar dados e status" },
  { key: "ver_financeiro", label: "Ver financeiro", description: "Enxerga valores de vendas e entregas" },
  { key: "lancar_financeiro", label: "Lançar financeiro", description: "Pode registrar valores e itens de OS" },
  { key: "ver_cadastros", label: "Ver cadastros", description: "Acessa cidades, escolas e funcionários" },
  { key: "editar_cadastros", label: "Editar cadastros", description: "Pode criar e alterar cadastros" },
  { key: "gerenciar_listas", label: "Gerenciar listas suspensas", description: "Edita as opções configuráveis" },
  { key: "gerenciar_usuarios", label: "Gerenciar usuários", description: "Cria contas e define permissões" },
];

export type RolePermissionRow = {
  id: string;
  role: AppRole;
  permission: string;
  allowed: boolean;
};

export function useRolePermissions() {
  return useQuery<RolePermissionRow[]>({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("id, role, permission, allowed");
      if (error) throw error;
      return (data ?? []) as RolePermissionRow[];
    },
    staleTime: 60_000,
  });
}

/** Mapa papel -> conjunto de permissões liberadas. */
export function toPermissionMap(rows: RolePermissionRow[] | undefined) {
  const map = new Map<string, Set<string>>();
  for (const row of rows ?? []) {
    if (!row.allowed) continue;
    const set = map.get(row.role) ?? new Set<string>();
    set.add(row.permission);
    map.set(row.role, set);
  }
  return map;
}
