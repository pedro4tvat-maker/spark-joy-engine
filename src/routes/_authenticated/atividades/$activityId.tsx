import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Paperclip, Pencil, Plus, Send, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSessionProfile } from "@/hooks/use-session-profile";
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

function ActivityDetailPage() {
  const { activityId } = useParams({ from: "/_authenticated/atividades/$activityId" });
  const queryClient = useQueryClient();
  const { data: profile } = useSessionProfile();

  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*, cities(name, state), schools(name, address), teams(name)")
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
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_items")
        .select("*")
        .eq("activity_id", activityId)
        .order("created_at");
      return data ?? [];
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

  const { data: authors } = useQuery({
    queryKey: ["comment-authors", activityId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name])) as Record<string, string>;
    },
  });

  const [comment, setComment] = useState("");
  const [newItem, setNewItem] = useState({ os_number: "", student_name: "", amount_sold: "", amount_received: "" });
  const [uploadCategory, setUploadCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [uploading, setUploading] = useState(false);

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

  async function refresh() {
    await queryClient.invalidateQueries();
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
    });
    if (error) return toast.error("Erro ao adicionar item", { description: error.message });
    setNewItem({ os_number: "", student_name: "", amount_sold: "", amount_received: "" });
    refresh();
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
      category: uploadCategory,
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
              {activity.cities?.name ?? "Sem cidade"} · Equipe {activity.teams?.name ?? "—"}
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
          <TabsTrigger value="itens">Itens / OS</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="comentarios">Comentários</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
        </TabsList>

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

        <TabsContent value="financeiro">
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
              <Metric label="Vendido" value={formatMoney(Number(activity.amount_sold ?? 0))} />
              <Metric label="Recebido" value={formatMoney(Number(activity.amount_received ?? 0))} />
              <Metric label="Dinheiro" value={formatMoney(Number(activity.amount_cash ?? 0))} />
              <Metric label="PIX" value={formatMoney(Number(activity.amount_pix ?? 0))} />
              <Metric label="Cartão" value={formatMoney(Number(activity.amount_card ?? 0))} />
              <Metric label="Atendimentos" value={String(activity.service_count ?? 0)} />
              <Metric label="Alunos" value={String(activity.students_count ?? 0)} />
              <Metric label="Vendas" value={String(activity.sales_count ?? 0)} />
              <Metric label="Colaboradores" value={String(activity.collaborators_count ?? 0)} />
            </CardContent>
          </Card>
        </TabsContent>

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
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger className="h-11 w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((c) => (
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold">{value}</p>
    </div>
  );
}
