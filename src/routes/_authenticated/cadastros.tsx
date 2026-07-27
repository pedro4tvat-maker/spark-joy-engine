import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_ROLES } from "@/lib/psvne";
import { LIST_GROUPS, useListOptions } from "@/hooks/use-list-options";

export const Route = createFileRoute("/_authenticated/cadastros")({
  component: RegistriesPage,
  head: () => ({
    meta: [
      { title: "Cadastros | PSVNE Operações" },
      {
        name: "description",
        content:
          "Cadastros mestres do PSVNE: cidades, escolas, equipes, funcionários, veículos, laboratórios, parceiros e formas de pagamento.",
      },
      { property: "og:title", content: "Cadastros | PSVNE Operações" },
      {
        property: "og:description",
        content: "Gerencie as bases de cidades, escolas, equipes e fornecedores do PSVNE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type TableName =
  | "cities"
  | "schools"
  | "employees"
  | "vehicles"
  | "labs"
  | "partners"
  | "lens_types"
  | "payment_methods";

function RegistriesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Cadastros</h1>
        <p className="text-sm text-muted-foreground">Bases mestras utilizadas nas atividades</p>
      </div>

      <Tabs defaultValue="cities">
        <TabsList className="flex-wrap">
          <TabsTrigger value="cities">Cidades</TabsTrigger>
          <TabsTrigger value="schools">Escolas</TabsTrigger>
          
          <TabsTrigger value="employees">Funcionários</TabsTrigger>
          <TabsTrigger value="vehicles">Veículos</TabsTrigger>
          <TabsTrigger value="labs">Laboratórios</TabsTrigger>
          <TabsTrigger value="partners">Parceiros</TabsTrigger>
          <TabsTrigger value="lens_types">Lentes</TabsTrigger>
          <TabsTrigger value="payment_methods">Pagamentos</TabsTrigger>
          <TabsTrigger value="lists">Listas</TabsTrigger>
        </TabsList>

        <TabsContent value="cities"><CitiesTab /></TabsContent>
        <TabsContent value="schools"><SchoolsTab /></TabsContent>
        
        <TabsContent value="employees"><EmployeesTab /></TabsContent>
        <TabsContent value="vehicles"><SimpleTab table="vehicles" extra="plate" extraLabel="Placa" /></TabsContent>
        <TabsContent value="labs"><SimpleTab table="labs" extra="phone" extraLabel="Telefone" /></TabsContent>
        <TabsContent value="partners"><SimpleTab table="partners" extra="phone" extraLabel="Telefone" /></TabsContent>
        <TabsContent value="lens_types"><SimpleTab table="lens_types" /></TabsContent>
        <TabsContent value="payment_methods"><SimpleTab table="payment_methods" /></TabsContent>
        <TabsContent value="lists"><ListsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function useRows(table: TableName) {
  return useQuery({
    queryKey: ["registry", table],
    queryFn: async () => {
      const { data } = await supabase.from(table).select("*").order("name");
      return (data ?? []) as Record<string, any>[];
    },
  });
}

function useRegistryActions(table: TableName) {
  const queryClient = useQueryClient();
  return {
    async create(payload: Record<string, any>) {
      const { error } = await supabase.from(table).insert(payload as never);
      if (error) return toast.error("Erro ao salvar", { description: error.message });
      toast.success("Cadastro criado");
      queryClient.invalidateQueries({ queryKey: ["registry", table] });
    },
    async remove(id: string) {
      const { error } = await supabase.from(table).update({ active: false } as never).eq("id", id);
      if (error) return toast.error("Erro ao remover", { description: error.message });
      queryClient.invalidateQueries({ queryKey: ["registry", table] });
    },
  };
}

function RowList({
  rows,
  onRemove,
  render,
}: {
  rows: Record<string, any>[];
  onRemove: (id: string) => void;
  render: (row: Record<string, any>) => React.ReactNode;
}) {
  return (
    <div className="divide-y rounded-lg border">
      {rows.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum registro.</p>
      )}
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 px-3 py-3">
          <div className="min-w-0 flex-1">{render(r)}</div>
          {!r.active && <Badge variant="secondary">inativo</Badge>}
          <Button variant="ghost" size="icon" onClick={() => onRemove(r.id)} aria-label="Inativar">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function SimpleTab({
  table,
  extra,
  extraLabel,
}: {
  table: TableName;
  extra?: string;
  extraLabel?: string;
}) {
  const { data } = useRows(table);
  const { create, remove } = useRegistryActions(table);
  const [name, setName] = useState("");
  const [extraValue, setExtraValue] = useState("");

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <Input
            className="h-11 flex-1"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {extra && (
            <Input
              className="h-11 flex-1"
              placeholder={extraLabel}
              value={extraValue}
              onChange={(e) => setExtraValue(e.target.value)}
            />
          )}
          <Button
            className="h-11"
            onClick={async () => {
              if (!name.trim()) return;
              await create(extra ? { name, [extra]: extraValue || null } : { name });
              setName("");
              setExtraValue("");
            }}
          >
            <Plus className="mr-2 size-4" /> Adicionar
          </Button>
        </div>
        <RowList
          rows={data ?? []}
          onRemove={remove}
          render={(r) => (
            <>
              <p className="text-sm font-medium">{r.name}</p>
              {extra && r[extra] && (
                <p className="text-xs text-muted-foreground">{r[extra]}</p>
              )}
            </>
          )}
        />
      </CardContent>
    </Card>
  );
}

function CitiesTab() {
  const { data } = useRows("cities");
  const { create, remove } = useRegistryActions("cities");
  const [form, setForm] = useState({ name: "", state: "" });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <Input
            className="h-11 flex-1"
            placeholder="Cidade"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            className="h-11 w-24"
            maxLength={2}
            placeholder="UF"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
          />
          <Button
            className="h-11"
            onClick={async () => {
              if (!form.name.trim() || form.state.length !== 2) {
                return toast.error("Informe cidade e UF");
              }
              await create(form);
              setForm({ name: "", state: "" });
            }}
          >
            <Plus className="mr-2 size-4" /> Adicionar
          </Button>
        </div>
        <RowList
          rows={data ?? []}
          onRemove={remove}
          render={(r) => (
            <p className="text-sm font-medium">
              {r.name} <span className="text-muted-foreground">/ {r.state}</span>
            </p>
          )}
        />
      </CardContent>
    </Card>
  );
}

function SchoolsTab() {
  const { data } = useRows("schools");
  const { data: cities } = useRows("cities");
  const { create, remove } = useRegistryActions("schools");
  const [form, setForm] = useState({ name: "", city_id: "", address: "", principal: "", phone: "" });

  const cityName = (id: string | null) => (cities ?? []).find((c) => c.id === id)?.name ?? "—";

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            className="h-11"
            placeholder="Nome da escola"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Select value={form.city_id} onValueChange={(v) => setForm({ ...form, city_id: v })}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Cidade" /></SelectTrigger>
            <SelectContent>
              {(cities ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-11"
            placeholder="Endereço"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input
            className="h-11"
            placeholder="Diretor(a)"
            value={form.principal}
            onChange={(e) => setForm({ ...form, principal: e.target.value })}
          />
          <Input
            className="h-11"
            placeholder="Telefone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Button
            className="h-11"
            onClick={async () => {
              if (!form.name.trim()) return;
              await create({
                name: form.name,
                city_id: form.city_id || null,
                address: form.address || null,
                principal: form.principal || null,
                phone: form.phone || null,
              });
              setForm({ name: "", city_id: "", address: "", principal: "", phone: "" });
            }}
          >
            <Plus className="mr-2 size-4" /> Adicionar
          </Button>
        </div>
        <RowList
          rows={data ?? []}
          onRemove={remove}
          render={(r) => (
            <>
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground">
                {cityName(r.city_id)} · {r.address ?? "sem endereço"}
              </p>
            </>
          )}
        />
      </CardContent>
    </Card>
  );
}

function EmployeesTab() {
  const { data } = useRows("employees");
  const { create, remove } = useRegistryActions("employees");
  const { options: jobRoles } = useListOptions("job_role", JOB_ROLES);
  const [form, setForm] = useState({ name: "", job_role: "", phone: "" });
  const jobRole = form.job_role || jobRoles[0] || "";

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-xs text-muted-foreground">
          Cadastre os funcionários aqui e monte a equipe de cada atividade individualmente na aba
          Equipe da atividade.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            className="h-11"
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Select value={jobRole} onValueChange={(v) => setForm({ ...form, job_role: v })}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Função" /></SelectTrigger>
            <SelectContent>
              {jobRoles.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-11"
            placeholder="Telefone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Button
            className="h-11"
            onClick={async () => {
              if (!form.name.trim()) return;
              await create({
                name: form.name,
                job_role: jobRole,
                phone: form.phone || null,
              });
              setForm({ name: "", job_role: "", phone: "" });
            }}
          >
            <Plus className="mr-2 size-4" /> Adicionar
          </Button>
        </div>

        <RowList
          rows={data ?? []}
          onRemove={remove}
          render={(r) => (
            <>
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.job_role}</p>
            </>
          )}
        />
      </CardContent>
    </Card>
  );
}

function ListsTab() {
  const queryClient = useQueryClient();
  const [group, setGroup] = useState(LIST_GROUPS[0].key);
  const [name, setName] = useState("");

  const { data } = useQuery({
    queryKey: ["list-options-admin", group],
    queryFn: async () => {
      const { data } = await supabase
        .from("list_options")
        .select("*")
        .eq("group_key", group)
        .order("position")
        .order("name");
      return data ?? [];
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["list-options-admin", group] });
    queryClient.invalidateQueries({ queryKey: ["list-options", group] });
  }

  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("list_options").insert({
      group_key: group,
      name: name.trim(),
      position: data?.length ?? 0,
    });
    if (error) return toast.error("Erro ao adicionar", { description: error.message });
    setName("");
    toast.success("Opção adicionada");
    refresh();
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("list_options").update({ active }).eq("id", id);
    if (error) return toast.error("Erro ao atualizar", { description: error.message });
    refresh();
  }

  async function rename(id: string, current: string) {
    const value = window.prompt("Novo nome da opção", current);
    if (!value || value.trim() === current) return;
    const { error } = await supabase.from("list_options").update({ name: value.trim() }).eq("id", id);
    if (error) return toast.error("Erro ao renomear", { description: error.message });
    refresh();
  }

  const current = LIST_GROUPS.find((g) => g.key === group);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-xs text-muted-foreground">
          Personalize as opções que aparecem nas listas suspensas do sistema.
        </p>
        <Select value={group} onValueChange={(v) => setGroup(v)}>
          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LIST_GROUPS.map((g) => (
              <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{current?.description}</p>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            className="h-11"
            placeholder="Nova opção"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button className="h-11" onClick={add}>
            <Plus className="mr-2 size-4" /> Adicionar
          </Button>
        </div>

        <div className="divide-y rounded-lg border">
          {(data ?? []).length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma opção.</p>
          )}
          {(data ?? []).map((o) => (
            <div key={o.id} className="flex items-center gap-3 px-3 py-3">
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{o.name}</p>
              {!o.active && <Badge variant="secondary">inativo</Badge>}
              <Button variant="ghost" size="sm" onClick={() => rename(o.id, o.name)}>
                Renomear
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toggle(o.id, !o.active)}>
                {o.active ? "Inativar" : "Ativar"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
