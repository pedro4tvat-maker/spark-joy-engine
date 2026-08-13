import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP_ROLES, JOB_ROLES, type AppRole } from "@/lib/psvne";
import { useListOptions } from "@/hooks/use-list-options";
import { PERMISSIONS, toPermissionMap, useRolePermissions } from "@/lib/permissions";
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
      { title: "Usuários e permissões | PSVNE Operações" },
      {
        name: "description",
        content:
          "Crie contas de acesso, defina a função de cada pessoa e configure as permissões de cada tipo de usuário do PSVNE.",
      },
      { property: "og:title", content: "Usuários e permissões | PSVNE Operações" },
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
          Defina primeiro o que cada tipo de usuário pode fazer e depois crie as contas.
        </p>
      </div>

      <Tabs defaultValue="contas">
        <TabsList>
          <TabsTrigger value="contas">Contas</TabsTrigger>
          <TabsTrigger value="permissoes">Permissões</TabsTrigger>
        </TabsList>
        <TabsContent value="contas" className="mt-4 space-y-5">
          <AccountsTab />
        </TabsContent>
        <TabsContent value="permissoes" className="mt-4">
          <PermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccountsTab() {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listAppUsers);
  const createUser = useServerFn(createAppUser);
  const changeRole = useServerFn(setAppUserRole);
  const changeActive = useServerFn(setAppUserActive);

  const { options: jobRoles } = useListOptions("job_role", JOB_ROLES as unknown as string[]);
  const { data: permissionRows } = useRolePermissions();
  const permissionMap = toPermissionMap(permissionRows);

  const { data: users, isLoading } = useQuery({
    queryKey: ["app-users"],
    queryFn: () => fetchUsers(),
  });

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "vendedor" as AppRole,
    jobTitle: "",
  });
  const [saving, setSaving] = useState(false);

  const selectedPermissions = PERMISSIONS.filter((p) =>
    permissionMap.get(form.role)?.has(p.key),
  );

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["app-users"] });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createUser({ data: form });
      toast.success("Usuário criado", { description: "Compartilhe o e-mail e a senha inicial." });
      setForm({ fullName: "", email: "", password: "", role: "vendedor", jobTitle: "" });
      refresh();
    } catch (error) {
      toast.error("Não foi possível criar", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    }
    setSaving(false);
  }

  return (
    <>
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
              <Label>Função (cargo)</Label>
              <Select
                value={form.jobTitle}
                onValueChange={(v) => setForm({ ...form, jobTitle: v })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {jobRoles.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                As opções vêm de Cadastros → Listas → Funções do funcionário.
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Tipo de acesso (permissões)</Label>
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
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedPermissions.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Nenhuma permissão liberada para este tipo de acesso.
                  </span>
                ) : (
                  selectedPermissions.map((p) => (
                    <Badge key={p.key} variant="secondary">{p.label}</Badge>
                  ))
                )}
              </div>
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
                <p className="truncate text-xs text-muted-foreground">
                  {u.email ?? "—"}
                  {u.jobTitle ? ` · ${u.jobTitle}` : ""}
                </p>
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
        </CardContent>
      </Card>
    </>
  );
}

function PermissionsTab() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading } = useRolePermissions();
  const [role, setRole] = useState<AppRole>("vendedor");
  const [busy, setBusy] = useState<string | null>(null);

  const current = new Map(
    (rows ?? []).filter((r) => r.role === role).map((r) => [r.permission, r]),
  );

  async function toggle(permission: string, allowed: boolean) {
    setBusy(permission);
    const { error } = await supabase
      .from("role_permissions")
      .upsert({ role, permission, allowed }, { onConflict: "role,permission" });
    setBusy(null);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="text-base">Permissões por tipo de usuário</CardTitle>
        <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
          <SelectTrigger className="h-11 w-full sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {APP_ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {PERMISSIONS.map((p) => (
          <div key={p.key} className="flex items-center gap-3 rounded-lg border px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </div>
            <Switch
              checked={Boolean(current.get(p.key)?.allowed)}
              disabled={busy === p.key}
              onCheckedChange={(v) => toggle(p.key, v)}
            />
          </div>
        ))}
        <p className="pt-2 text-xs text-muted-foreground">
          O papel Administrador mantém acesso total ao sistema, independente destas opções.
        </p>
      </CardContent>
    </Card>
  );
}
