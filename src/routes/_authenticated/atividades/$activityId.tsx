import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Paperclip, Pencil, Plus, Send, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useListOptions } from "@/hooks/use-list-options";
import { isAdminRole, isManagerRole, useSessionProfile } from "@/hooks/use-session-profile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActivityFormDialog } from "@/components/activity-form-dialog";
import {
  ACTIVITY_PRIORITY,
  ACTIVITY_STATUS,
  ACTIVITY_TYPES,
  DOCUMENT_CATEGORIES,
  eventTone,
  formatDateBR,
  formatMoney,
  labelOf,
  slugSegment,
  toneClasses,
  type ActivityStatus,
} from "@/lib/psvne";

export const Route = createFileRoute("/_authenticated/atividades/$activityId")({
  component: ActivityDetailPage,
  head: () => ({
    meta: [
      { title: "Detalhe da atividade | PSVNE Operações" },
      {
        name: "description",
        content:
          "Checklist, equipe, itens de entrega, financeiro, comentários e anexos da atividade operacional do PSVNE.",
      },
      { property: "og:title", content: "Detalhe da atividade | PSVNE Operações" },
      {
        property: "og:description",
        content: "Acompanhe a execução completa de uma atividade do PSVNE.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const FINANCE_FIELDS = [
  { key: "amount_sold", label: "Valor vendido", money: true, source: "finance" },
  { key: "amount_received", label: "Valor recebido", money: true, source: "finance" },
  { key: "amount_cash", label: "Dinheiro", money: true, source: "finance" },
  { key: "amount_pix", label: "PIX", money: true, source: "finance" },
  { key: "amount_card", label: "Cartão", money: true, source: "finance" },
  { key: "service_count", label: "Atendimentos", money: false, source: "finance" },
  { key: "students_count", label: "Alunos atendidos", money: false, source: "activity" },
  { key: "sales_count", label: "Vendas", money: false, source: "finance" },
  { key: "collaborators_count", label: "Colaboradores", money: false, source: "activity" },
] as const;

type FinanceKey = (typeof FINANCE_FIELDS)[number]["key"];

const EMPTY_FINANCE = Object.fromEntries(
  FINANCE_FIELDS.map((f) => [f.key, ""]),
) as Record<FinanceKey, string>;


function ActivityDetailPage() {
  const { activityId } = useParams({ from: "/_authenticated/atividades/$activityId" });
  const queryClient = useQueryClient();
  const { data: profile } = useSessionProfile();
  const isManager = isManagerRole(profile);


  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*, cities(name, state), schools(name, address, neighborhood)")
        .eq("id", activityId)
        .maybeSingle();
      return data;
    },
  });

  const { data: checklist } = useQuery({
    queryKey: ["checklist", activityId],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_checklists")
        .select("*")
        .eq("activity_id", activityId)
        .order("position");
      return data ?? [];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", activityId],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_comments")
        .select("*")
        .eq("activity_id", activityId)
        .order("created_at");
      return data ?? [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["delivery-items", activityId],
    enabled: isManager,
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_items")
        .select("*")
        .eq("activity_id", activityId)
        .order("created_at");
      return data ?? [];
    },
  });

  const { data: financeData } = useQuery({
    queryKey: ["activity-finance", activityId],
    enabled: isManager,
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_finance")
        .select("*")
        .eq("activity_id", activityId)
        .maybeSingle();
      return data;
    },
  });


  const { data: documents } = useQuery({
    queryKey: ["documents", activityId],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_documents")
        .select("*")
        .eq("activity_id", activityId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: team } = useQuery({
    queryKey: ["activity-team", activityId],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_team")
        .select("*")
        .eq("activity_id", activityId)
        .order("created_at");
      return data ?? [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, name, job_role, user_id")
        .eq("active", true)
        .order("name");
      return data ?? [];
    },
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_methods")
        .select("id, name")
        .eq("active", true)
        .order("name");
      return data ?? [];
    },
  });

  const { data: authors } = useQuery({
    queryKey: ["comment-authors", activityId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name])) as Record<string, string>;
    },
  });

  const [comment, setComment] = useState("");
  const [newItem, setNewItem] = useState({
    os_number: "",
    student_name: "",
    amount_sold: "",
    amount_received: "",
    payment_method_id: "",
  });
  const [finance, setFinance] = useState<Record<FinanceKey, string>>(EMPTY_FINANCE);
  const [financeDirty, setFinanceDirty] = useState(false);
  const [savingFinance, setSavingFinance] = useState(false);

  useEffect(() => {
    if (!activity) return;
    const activityRow = activity as Record<string, unknown>;
    const financeRow = (financeData ?? {}) as Record<string, unknown>;
    setFinance(
      Object.fromEntries(
        FINANCE_FIELDS.map((f) => {
          const value = f.source === "finance" ? financeRow[f.key] : activityRow[f.key];
          return [f.key, value == null ? "" : String(value)];
        }),
      ) as Record<FinanceKey, string>,
    );
    setFinanceDirty(false);
  }, [activity, financeData]);

  const { options: docCategories } = useListOptions("document_category", DOCUMENT_CATEGORIES);
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [memberId, setMemberId] = useState("");

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;
  if (!activity)
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-sm text-muted-foreground">Atividade não encontrada ou sem permissão.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/atividades">Voltar</Link>
        </Button>
      </div>
    );

  const tone = toneClasses(eventTone(activity.type, activity.status, activity.priority));
  const doneCount = (checklist ?? []).filter((c) => c.done).length;
  const itemsTotals = (items ?? []).reduce(
    (acc, it) => ({
      sold: acc.sold + Number(it.amount_sold ?? 0),
      received: acc.received + Number(it.amount_received ?? 0),
      count: acc.count + 1,
    }),
    { sold: 0, received: 0, count: 0 },
  );
  const splitTotal =
    Number(finance.amount_cash || 0) + Number(finance.amount_pix || 0) + Number(finance.amount_card || 0);
  const splitMismatch = Math.abs(splitTotal - Number(finance.amount_received || 0)) > 0.009;

  async function refresh() {
    await queryClient.invalidateQueries();
  }

  async function addMember() {
    const emp = (employees ?? []).find((e) => e.id === memberId);
    if (!emp) return;
    const { error } = await supabase.from("activity_team").insert({
      activity_id: activityId,
      employee_id: emp.id,
      user_id: emp.user_id ?? null,
      name: emp.name,
      job_role: emp.job_role,
    });
    if (error) return toast.error("Erro ao adicionar", { description: error.message });
    setMemberId("");
    toast.success("Funcionário adicionado à equipe");
    refresh();
  }

  async function removeMember(id: string) {
    await supabase.from("activity_team").delete().eq("id", id);
    refresh();
  }



  async function toggleCheck(id: string, done: boolean) {
    await supabase.from("activity_checklists").update({ done }).eq("id", id);
    refresh();
  }

  async function changeStatus(status: ActivityStatus) {
    const { error } = await supabase.from("activities").update({ status }).eq("id", activityId);
    if (error) return toast.error("Erro ao atualizar status");
    toast.success("Status atualizado");
    refresh();
  }

  async function addComment() {
    if (!comment.trim() || !profile) return;
    const { error } = await supabase
      .from("activity_comments")
      .insert({ activity_id: activityId, user_id: profile.userId, body: comment.trim() });
    if (error) return toast.error("Erro ao comentar", { description: error.message });
    setComment("");
    refresh();
  }

  async function addItem() {
    const { error } = await supabase.from("delivery_items").insert({
      activity_id: activityId,
      os_number: newItem.os_number || null,
      student_name: newItem.student_name || null,
      amount_sold: Number(newItem.amount_sold || 0),
      amount_received: Number(newItem.amount_received || 0),
      payment_method_id: newItem.payment_method_id || null,
    });
    if (error) return toast.error("Erro ao adicionar item", { description: error.message });
    setNewItem({
      os_number: "",
      student_name: "",
      amount_sold: "",
      amount_received: "",
      payment_method_id: "",
    });
    refresh();
  }

  async function saveFinance() {
    setSavingFinance(true);
    const num = (k: FinanceKey) => (finance[k] === "" ? 0 : Number(finance[k]));
    const { error } = await supabase.from("activity_finance").upsert(
      {
        activity_id: activityId,
        amount_sold: num("amount_sold"),
        amount_received: num("amount_received"),
        amount_cash: num("amount_cash"),
        amount_pix: num("amount_pix"),
        amount_card: num("amount_card"),
        service_count: num("service_count"),
        sales_count: num("sales_count"),
      },
      { onConflict: "activity_id" },
    );
    const { error: activityError } = await supabase
      .from("activities")
      .update({
        students_count: finance.students_count === "" ? null : Number(finance.students_count),
        collaborators_count:
          finance.collaborators_count === "" ? null : Number(finance.collaborators_count),
      })
      .eq("id", activityId);
    setSavingFinance(false);
    const failure = error ?? activityError;
    if (failure) return toast.error("Erro ao salvar financeiro", { description: failure.message });
    setFinanceDirty(false);
    toast.success("Financeiro salvo");
    refresh();
  }


  function fillFromItems() {
    setFinance((prev) => ({
      ...prev,
      amount_sold: String(itemsTotals.sold),
      amount_received: String(itemsTotals.received),
      sales_count: String(itemsTotals.count),
    }));
    setFinanceDirty(true);
  }

  async function removeItem(id: string) {
    await supabase.from("delivery_items").delete().eq("id", id);
    refresh();
  }

  async function upload(file: File) {
    if (!profile || !activity) return;
    setUploading(true);
    const path = [
      slugSegment(activity.cities?.name),
      slugSegment(activity.schools?.name),
      activity.activity_date,
      `${Date.now()}-${slugSegment(file.name.replace(/\.[^.]+$/, ""))}.${file.name.split(".").pop()}`,
    ].join("/");

    const { error: upErr } = await supabase.storage.from("activity-documents").upload(path, file);
    if (upErr) {
      setUploading(false);
      return toast.error("Falha no upload", { description: upErr.message });
    }
    const { error } = await supabase.from("activity_documents").insert({
      activity_id: activityId,
      user_id: profile.userId,
      name: file.name,
      storage_path: path,
      size_bytes: file.size,
      mime_type: file.type,
      category: uploadCategory || docCategories[0],
    });
    setUploading(false);
    if (error) return toast.error("Erro ao registrar anexo", { description: error.message });
    toast.success("Anexo enviado");
    refresh();
  }

  async function openDocument(path: string) {
    const { data, error } = await supabase.storage
      .from("activity-documents")
      .createSignedUrl(path, 60);
    if (error || !data) return toast.error("Não foi possível abrir o arquivo");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/atividades">
          <ArrowLeft className="mr-2 size-4" /> Atividades
        </Link>
      </Button>

      <Card className={`border-l-4 ${tone.bar}`}>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={tone.chip}>
                {labelOf(ACTIVITY_TYPES, activity.type)}
              </Badge>
              <Badge variant="secondary">{labelOf(ACTIVITY_PRIORITY, activity.priority)}</Badge>
              <span className="text-xs text-muted-foreground">#{activity.number}</span>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {activity.title || labelOf(ACTIVITY_TYPES, activity.type)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatDateBR(activity.activity_date)} ·{" "}
              {activity.start_time?.slice(0, 5) ?? "--:--"} às{" "}
              {activity.end_time?.slice(0, 5) ?? "--:--"}
            </p>
            <p className="text-sm text-muted-foreground">
              {activity.schools?.name ?? "Sem escola"} ·{" "}
              {activity.schools?.neighborhood ? `${activity.schools.neighborhood} · ` : ""}
              {activity.cities?.name ?? "Sem cidade"} · {team?.length ?? 0} na equipe
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Select value={activity.status} onValueChange={(v) => changeStatus(v as ActivityStatus)}>
              <SelectTrigger className="h-11 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ActivityFormDialog
              activityId={activityId}
              trigger={
                <Button variant="outline" className="h-11">
                  <Pencil className="mr-2 size-4" /> Editar
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="checklist">
        <TabsList className="flex-wrap">
          <TabsTrigger value="checklist">Checklist ({doneCount}/{checklist?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="equipe">Equipe ({team?.length ?? 0})</TabsTrigger>
          {isManager && <TabsTrigger value="itens">Itens / OS</TabsTrigger>}
          {isManager && <TabsTrigger value="financeiro">Financeiro</TabsTrigger>}
          <TabsTrigger value="comentarios">Comentários</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
        </TabsList>

        <TabsContent value="equipe">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equipe da atividade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione um funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {(employees ?? [])
                      .filter((e) => !(team ?? []).some((m) => m.employee_id === e.id))
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} · {e.job_role}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button className="h-11" onClick={addMember} disabled={!memberId}>
                  <Plus className="mr-2 size-4" /> Adicionar
                </Button>
              </div>

              {(team ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum funcionário alocado nesta atividade.
                </p>
              )}

              <div className="space-y-2">
                {(team ?? []).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.name ?? "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{m.job_role ?? "—"}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="checklist">
          <Card>
            <CardContent className="space-y-1 p-4">
              {(checklist ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sem checklist para esta atividade.
                </p>
              )}
              {(checklist ?? []).map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60"
                >
                  <Checkbox
                    checked={c.done}
                    onCheckedChange={(v) => toggleCheck(c.id, Boolean(v))}
                  />
                  <span className={c.done ? "text-sm text-muted-foreground line-through" : "text-sm"}>
                    {c.label}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
        <TabsContent value="itens">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Itens de entrega / OS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-5">
                <Input
                  className="h-11"
                  placeholder="Nº OS"
                  value={newItem.os_number}
                  onChange={(e) => setNewItem({ ...newItem, os_number: e.target.value })}
                />
                <Input
                  className="h-11 sm:col-span-2"
                  placeholder="Aluno"
                  value={newItem.student_name}
                  onChange={(e) => setNewItem({ ...newItem, student_name: e.target.value })}
                />
                <Select
                  value={newItem.payment_method_id}
                  onValueChange={(v) => setNewItem({ ...newItem, payment_method_id: v })}
                >
                  <SelectTrigger className="h-11 sm:col-span-2">
                    <SelectValue placeholder="Forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {(paymentMethods ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="h-11"
                  type="number"
                  placeholder="Vendido"
                  value={newItem.amount_sold}
                  onChange={(e) => setNewItem({ ...newItem, amount_sold: e.target.value })}
                />
                <Input
                  className="h-11"
                  type="number"
                  placeholder="Recebido"
                  value={newItem.amount_received}
                  onChange={(e) => setNewItem({ ...newItem, amount_received: e.target.value })}
                />
              </div>
              <Button onClick={addItem} className="h-11">
                <Plus className="mr-2 size-4" /> Adicionar item
              </Button>

              <div className="divide-y rounded-lg border">
                {(items ?? []).length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item lançado.</p>
                )}
                {(items ?? []).map((it) => (
                  <div key={it.id} className="flex items-center gap-3 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        OS {it.os_number ?? "—"} · {it.student_name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vendido {formatMoney(Number(it.amount_sold))} · Recebido{" "}
                        {formatMoney(Number(it.amount_received))}
                        {it.payment_method_id
                          ? ` · ${(paymentMethods ?? []).find((p) => p.id === it.payment_method_id)?.name ?? "—"}`
                          : ""}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)} aria-label="Remover">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {isManager && (
        <TabsContent value="financeiro">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados financeiros da venda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-0">
              <div className="grid gap-3 sm:grid-cols-3">
                {FINANCE_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor={f.key}>
                      {f.label}
                    </label>
                    <Input
                      id={f.key}
                      className="h-11"
                      type="number"
                      inputMode="decimal"
                      step={f.money ? "0.01" : "1"}
                      placeholder={f.money ? "0,00" : "0"}
                      value={finance[f.key]}
                      onChange={(e) => {
                        setFinance({ ...finance, [f.key]: e.target.value });
                        setFinanceDirty(true);
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <p className={splitMismatch ? "font-medium text-destructive" : "text-muted-foreground"}>
                  Dinheiro + PIX + Cartão: {formatMoney(splitTotal)}
                  {splitMismatch
                    ? ` · diferente do valor recebido (${formatMoney(Number(finance.amount_received || 0))})`
                    : " · confere com o valor recebido"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Itens / OS lançados: {itemsTotals.count} · Vendido {formatMoney(itemsTotals.sold)} ·
                  Recebido {formatMoney(itemsTotals.received)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button className="h-11" onClick={saveFinance} disabled={savingFinance || !financeDirty}>
                  {savingFinance ? "Salvando…" : "Salvar financeiro"}
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={fillFromItems}
                  disabled={itemsTotals.count === 0}
                >
                  Usar totais dos itens
                </Button>
                {financeDirty && (
                  <span className="text-xs text-muted-foreground">Alterações não salvas</span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        <TabsContent value="comentarios">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-3">
                {(comments ?? []).length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum comentário ainda.
                  </p>
                )}
                {(comments ?? []).map((c) => (
                  <div key={c.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{authors?.[c.user_id ?? ""] ?? "Usuário"}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{c.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  placeholder="Escreva um comentário para a equipe…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button onClick={addComment} className="h-auto" aria-label="Enviar comentário">
                  <Send className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anexos">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={uploadCategory || docCategories[0]} onValueChange={setUploadCategory}>
                  <SelectTrigger className="h-11 w-52"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    {docCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium hover:bg-muted">
                  <Paperclip className="size-4" />
                  {uploading ? "Enviando…" : "Selecionar arquivo"}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="divide-y rounded-lg border">
                {(documents ?? []).length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum anexo.</p>
                )}
                {(documents ?? []).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => openDocument(d.storage_path)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/60"
                  >
                    <Paperclip className="size-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">{d.name}</span>
                    <Badge variant="secondary">{d.category ?? "Outros"}</Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

