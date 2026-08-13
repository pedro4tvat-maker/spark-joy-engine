import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP_ROLES, labelOf, type AppRole } from "@/lib/psvne";
import { isAdminRole, useSessionProfile } from "@/hooks/use-session-profile";
import {
  createAppUser,
  listAppUsers,
  setAppUserActive,
  setAppUserRole,
} from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsersPage,
  head: () => ({
    meta: [
      { title: "Usuários | PSVNE Operações" },
      {
        name: "description",
        content:
          "Crie contas de acesso, defina o papel de cada usuário e controle quem enxerga os dados financeiros do PSVNE.",
      },
      { property: "og:title", content: "Usuários | PSVNE Operações" },
      {
        property: "og:description",
        content: "Gestão de contas e permissões do sistema operacional do PSVNE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function UsersPage() {
  const { data: profile } = useSessionProfile();
  const admin = isAdminRole(profile?.roles);
  const queryClient = useQueryClient();

  const fetchUsers = useServerFn(listAppUsers);
  const createUser = useServerFn(createAppUser);
  const changeRole = useServerFn(setAppUserRole);
  const changeActive = useServerFn(setAppUserActive);

  const { data: users, isLoading } = useQuery({
    queryKey: ["app-users"],
    queryFn: () => fetchUsers(),
    enabled: admin,
  });

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "vendedor" as AppRole,
  });
  const [saving, setSaving] = useState(false);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["app-users"] });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createUser({ data: form });
      toast.success("Usuário criado", { description: "Compartilhe o e-mail e a senha inicial." });
      setForm({ fullName: "", email: "", password: "", role: "vendedor" });
      refresh();
    } catch (error) {
      toast.error("Não foi possível criar", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    }
    setSaving(false);
  }

  if (!admin) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Apenas administradores e coordenadores podem gerenciar usuários.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Crie contas com acesso limitado. Apenas administrador, coordenador e financeiro enxergam
          valores de vendas e entregas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                className="h-11"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                className="h-11"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha inicial</Label>
              <Input
                id="password"
                className="h-11"
                minLength={6}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as AppRole })}
              >
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APP_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="h-11" disabled={saving}>
                <UserPlus className="mr-2 size-4" />
                {saving ? "Criando…" : "Criar usuário"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas do sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {(users ?? []).map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.fullName || "Sem nome"}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email ?? "—"}</p>
              </div>
              {!u.active && <Badge variant="secondary">inativo</Badge>}
              <Select
                value={u.roles[0] ?? ""}
                onValueChange={async (v) => {
                  try {
                    await changeRole({ data: { userId: u.id, role: v as AppRole } });
                    toast.success("Papel atualizado");
                    refresh();
                  } catch (error) {
                    toast.error("Erro ao atualizar papel", {
                      description: error instanceof Error ? error.message : undefined,
                    });
                  }
                }}
              >
                <SelectTrigger className="h-10 w-44">
                  <SelectValue placeholder="Sem papel" />
                </SelectTrigger>
                <SelectContent>
                  {APP_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await changeActive({ data: { userId: u.id, active: !u.active } });
                    refresh();
                  } catch (error) {
                    toast.error("Erro ao alterar acesso", {
                      description: error instanceof Error ? error.message : undefined,
                    });
                  }
                }}
              >
                {u.active ? "Desativar" : "Reativar"}
              </Button>
            </div>
          ))}
          {!isLoading && (users ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum usuário.</p>
          )}
          <p className="pt-2 text-xs text-muted-foreground">
            Papéis com acesso ao financeiro: {APP_ROLES.filter((r) =>
              ["administrador", "coordenador", "financeiro"].includes(r.value),
            ).map((r) => labelOf(APP_ROLES, r.value)).join(", ")}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
