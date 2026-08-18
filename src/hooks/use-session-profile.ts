import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/psvne";

export type SessionProfile = {
  userId: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  roles: AppRole[];
  isManager: boolean;
  isAdmin: boolean;
};

export function useSessionProfile() {
  return useQuery<SessionProfile | null>({
    queryKey: ["session-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roles }, { data: accessTypes }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("access_types").select("key, is_manager, is_admin, active"),
      ]);

      const userRoles = (roles ?? []).map((r) => r.role as AppRole);
      const mine = (accessTypes ?? []).filter((t) => t.active && userRoles.includes(t.key));

      return {
        userId: user.id,
        email: profile?.email ?? user.email ?? null,
        fullName: profile?.full_name || (user.email ?? "Usuário"),
        avatarUrl: profile?.avatar_url ?? null,
        roles: userRoles,
        isManager: mine.some((t) => t.is_manager || t.is_admin),
        isAdmin: mine.some((t) => t.is_admin),
      };
    },
    staleTime: 30_000,
  });
}

/** Gestão: enxerga valores financeiros e itens de OS. */
export function isManagerRole(profile: SessionProfile | null | undefined) {
  return Boolean(profile?.isManager);
}

/** Administração: gerencia usuários, permissões e tipos de acesso. */
export function isAdminRole(profile: SessionProfile | null | undefined) {
  return Boolean(profile?.isAdmin);
}
