import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/psvne";

export type SessionProfile = {
  userId: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  roles: AppRole[];
};

export function useSessionProfile() {
  return useQuery<SessionProfile | null>({
    queryKey: ["session-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, email").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      return {
        userId: user.id,
        email: profile?.email ?? user.email ?? null,
        fullName: profile?.full_name || (user.email ?? "Usuário"),
        avatarUrl: profile?.avatar_url ?? null,
        roles: (roles ?? []).map((r) => r.role as AppRole),
      };
    },
    staleTime: 30_000,
  });
}

export function isManagerRole(roles: AppRole[] | undefined) {
  return !!roles?.some((r) => r === "administrador" || r === "coordenador" || r === "financeiro");
}

export function isAdminRole(roles: AppRole[] | undefined) {
  return !!roles?.some((r) => r === "administrador" || r === "coordenador");
}
