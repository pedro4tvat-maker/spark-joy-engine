import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTIVITY_PRIORITY,
  ACTIVITY_STATUS,
  ACTIVITY_TYPES,
  CHECKLIST_TEMPLATES,
  type ActivityPriority,
  type ActivityStatus,
  type ActivityType,
} from "@/lib/psvne";

type Props = {
  trigger: React.ReactNode;
  defaultDate?: string;
  activityId?: string;
};

export function ActivityFormDialog({ trigger, defaultDate, activityId }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    type: "acuidade" as ActivityType,
    status: "agendada" as ActivityStatus,
    priority: "media" as ActivityPriority,
    title: "",
    activity_date: defaultDate ?? new Date().toISOString().slice(0, 10),
    start_time: "08:00",
    end_time: "12:00",
    city_id: "",
    school_id: "",
    team_id: "",
    owner_id: "",
    address: "",
    description: "",
  });

  const { data: master } = useQuery({
    queryKey: ["activity-form-master"],
    enabled: open,
    queryFn: async () => {
      const [cities, schools, teams, profiles] = await Promise.all([
        supabase.from("cities").select("id, name").eq("active", true).order("name"),
        supabase.from("schools").select("id, name, city_id, address").eq("active", true).order("name"),
        supabase.from("teams").select("id, name").eq("active", true).order("name"),
        supabase.from("profiles").select("id, full_name").order("full_name"),
      ]);
      return {
        cities: cities.data ?? [],
        schools: schools.data ?? [],
        teams: teams.data ?? [],
        profiles: profiles.data ?? [],
      };
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["activity-edit", activityId],
    enabled: open && !!activityId,
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("*").eq("id", activityId!).maybeSingle();
      if (data) {
        setForm({
          type: data.type,
          status: data.status,
          priority: data.priority,
          title: data.title ?? "",
          activity_date: data.activity_date,
          start_time: data.start_time?.slice(0, 5) ?? "",
          end_time: data.end_time?.slice(0, 5) ?? "",
          city_id: data.city_id ?? "",
          school_id: data.school_id ?? "",
          team_id: data.team_id ?? "",
          owner_id: data.owner_id ?? "",
          address: data.address ?? "",
          description: data.description ?? "",
        });
      }
      return data;
    },
  });

  const schools = useMemo(
    () => (master?.schools ?? []).filter((s) => !form.city_id || s.city_id === form.city_id),
    [master, form.city_id],
  );

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setSaving(false);
      return toast.error("Sessão expirada");
    }

    const payload = {
      type: form.type,
      status: form.status,
      priority: form.priority,
      title: form.title || null,
      activity_date: form.activity_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      city_id: form.city_id || null,
      school_id: form.school_id || null,
      team_id: form.team_id || null,
      owner_id: form.owner_id || uid,
      address: form.address || null,
      description: form.description || null,
    };

    if (activityId) {
      const { error } = await supabase.from("activities").update(payload).eq("id", activityId);
      setSaving(false);
      if (error) return toast.error("Erro ao salvar", { description: error.message });
      toast.success("Atividade atualizada");
    } else {
      const { data, error } = await supabase
        .from("activities")
        .insert({ ...payload, created_by: uid })
        .select("id")
        .single();
      if (!error && data) {
        const items = CHECKLIST_TEMPLATES[form.type];
        if (items?.length) {
          await supabase.from("activity_checklists").insert(
            items.map((label, i) => ({ activity_id: data.id, label, position: i })),
          );
        }
        await supabase.from("notifications").insert({
          user_id: uid,
          activity_id: data.id,
          title: "Nova atividade criada",
          body: `${form.title || "Atividade"} em ${form.activity_date}`,
          kind: "atividade",
        });
      }
      setSaving(false);
      if (error) return toast.error("Erro ao criar", { description: error.message });
      toast.success("Atividade criada");
    }

    queryClient.invalidateQueries();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activityId ? "Editar atividade" : "Nova atividade"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            <Select value={form.type} onValueChange={(v) => set("type", v as ActivityType)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Título">
            <Input className="h-11" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Acuidade 5º ano" />
          </Field>

          <Field label="Data">
            <Input className="h-11" type="date" value={form.activity_date} onChange={(e) => set("activity_date", e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Início">
              <Input className="h-11" type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
            </Field>
            <Field label="Fim">
              <Input className="h-11" type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
            </Field>
          </div>

          <Field label="Cidade">
            <Select value={form.city_id} onValueChange={(v) => { set("city_id", v); set("school_id", ""); }}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(master?.cities ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Escola">
            <Select
              value={form.school_id}
              onValueChange={(v) => {
                set("school_id", v);
                const s = schools.find((x) => x.id === v);
                if (s?.address) set("address", s.address);
              }}
            >
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>


          <Field label="Responsável">
            <Select value={form.owner_id} onValueChange={(v) => set("owner_id", v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(master?.profiles ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => set("status", v as ActivityStatus)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Prioridade">
            <Select value={form.priority} onValueChange={(v) => set("priority", v as ActivityPriority)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_PRIORITY.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Endereço">
              <Input className="h-11" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Descrição">
              <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || (!activityId && !existing && false)}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
