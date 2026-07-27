import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActivityFormDialog } from "@/components/activity-form-dialog";
import { ActivityRow } from "@/routes/_authenticated/dashboard";
import { ACTIVITY_STATUS, ACTIVITY_TYPES } from "@/lib/psvne";

export const Route = createFileRoute("/_authenticated/atividades/")({
  component: ActivitiesPage,
  head: () => ({
    meta: [
      { title: "Atividades | PSVNE Operações" },
      {
        name: "description",
        content:
          "Lista completa de atividades do PSVNE com filtros por tipo, status, cidade e período.",
      },
      { property: "og:title", content: "Atividades | PSVNE Operações" },
      {
        property: "og:description",
        content: "Gerencie acuidades, atendimentos, entregas e viagens do PSVNE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ActivitiesPage() {
  const [term, setTerm] = useState("");
  const [type, setType] = useState("todos");
  const [status, setStatus] = useState("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["activities", type, status],
    queryFn: async () => {
      let q = supabase
        .from("activities")
        .select("*, cities(name), schools(name)")
        .order("activity_date", { ascending: false })
        .limit(200);
      if (type !== "todos") q = q.eq("type", type as never);
      if (status !== "todos") q = q.eq("status", status as never);
      const { data } = await q;
      return data ?? [];
    },
  });

  const list = (data ?? []).filter((a) => {
    const t = term.trim().toLowerCase();
    if (!t) return true;
    return [a.title, a.cities?.name, a.schools?.name, String(a.number)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(t));
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Atividades</h1>
          <p className="text-sm text-muted-foreground">{list.length} registro(s)</p>
        </div>
        <ActivityFormDialog
          trigger={
            <Button className="h-11">
              <Plus className="mr-2 size-4" /> Nova atividade
            </Button>
          }
        />
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              placeholder="Buscar por título, escola, cidade ou número"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-11 sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-11 sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {ACTIVITY_STATUS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        {!isLoading && list.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma atividade encontrada com os filtros atuais.
            </CardContent>
          </Card>
        )}
        {list.map((a) => (
          <ActivityRow key={a.id} activity={a} showDate />
        ))}
      </div>
    </div>
  );
}
