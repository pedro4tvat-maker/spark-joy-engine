import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Plus,
  TrendingUp,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityFormDialog } from "@/components/activity-form-dialog";
import {
  ACTIVITY_TYPES,
  eventTone,
  formatDateBR,
  formatMoney,
  labelOf,
  toneClasses,
} from "@/lib/psvne";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard | PSVNE Operações" },
      {
        name: "description",
        content:
          "Painel operacional do Projeto Saúde Visual na Escola: agenda do mês, atividades em andamento, pendências e resultados financeiros.",
      },
      { property: "og:title", content: "Dashboard | PSVNE Operações" },
      {
        property: "og:description",
        content: "Acompanhe agenda, atividades e resultados do PSVNE em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function monthRange(base = new Date()) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

function DashboardPage() {
  const { start, end } = useMemo(() => monthRange(), []);
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", start, end],
    queryFn: async () => {
      const { data: activities } = await supabase
        .from("activities")
        .select("*, cities(name), schools(name)")
        .gte("activity_date", start)
        .lte("activity_date", end)
        .order("activity_date");
      return activities ?? [];
    },
  });

  const activities = data ?? [];
  const todays = activities.filter((a) => a.activity_date === today);
  const upcoming = activities
    .filter((a) => a.activity_date > today && a.status !== "cancelada")
    .slice(0, 6);
  const late = activities.filter((a) => a.status === "atrasada");
  const done = activities.filter((a) => a.status === "concluida");
  const sold = activities.reduce((s, a) => s + Number(a.amount_sold ?? 0), 0);
  const received = activities.reduce((s, a) => s + Number(a.amount_received ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão operacional do mês corrente
          </p>
        </div>
        <ActivityFormDialog
          trigger={
            <Button className="h-11">
              <Plus className="mr-2 size-4" /> Nova atividade
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Atividades no mês"
          value={String(activities.length)}
          icon={CalendarClock}
          hint={`${done.length} concluídas`}
          loading={isLoading}
        />
        <Stat
          label="Atrasadas"
          value={String(late.length)}
          icon={AlertTriangle}
          hint="Requer ação imediata"
          tone="urgente"
          loading={isLoading}
        />
        <Stat
          label="Vendido no mês"
          value={formatMoney(sold)}
          icon={TrendingUp}
          hint={`${formatMoney(received)} recebido`}
          loading={isLoading}
        />
        <Stat
          label="Taxa de conclusão"
          value={
            activities.length ? `${Math.round((done.length / activities.length) * 100)}%` : "—"
          }
          icon={CheckCircle2}
          hint="Atividades finalizadas"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Hoje · {formatDateBR(today)}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/calendario">Ver calendário</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <Skeleton className="h-20 w-full" />}
            {!isLoading && todays.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma atividade programada para hoje.
              </p>
            )}
            {todays.map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {late.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sem pendências críticas.
              </p>
            )}
            {late.map((a) => (
              <Link
                key={a.id}
                to="/atividades/$activityId"
                params={{ activityId: a.id }}
                className="block rounded-lg border border-ev-urgente/30 bg-ev-urgente-soft px-3 py-2"
              >
                <p className="text-sm font-medium text-ev-urgente">
                  #{a.number} · {a.title || labelOf(ACTIVITY_TYPES, a.type)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateBR(a.activity_date)} · {a.cities?.name ?? "sem cidade"}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Próximas atividades</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/atividades">Ver todas</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {!isLoading && upcoming.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nada agendado para os próximos dias deste mês.
            </p>
          )}
          {upcoming.map((a) => (
            <ActivityRow key={a.id} activity={a} showDate />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  tone?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <span
          className={
            tone === "urgente"
              ? "flex size-11 items-center justify-center rounded-xl bg-ev-urgente-soft text-ev-urgente"
              : "flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
          }
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : (
            <p className="font-display text-2xl font-semibold">{value}</p>
          )}
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

type ActivityRowData = {
  id: string;
  number: number;
  title: string | null;
  type: any;
  status: any;
  priority: any;
  activity_date: string;
  start_time: string | null;
  cities?: { name: string } | null;
  schools?: { name: string } | null;
};

export function ActivityRow({
  activity,
  showDate,
}: {
  activity: ActivityRowData;
  showDate?: boolean;
}) {
  const tone = toneClasses(eventTone(activity.type, activity.status, activity.priority));
  return (
    <Link
      to="/atividades/$activityId"
      params={{ activityId: activity.id }}
      className={`flex items-center gap-3 rounded-lg border border-l-4 bg-card px-3 py-3 transition-colors hover:bg-muted/60 ${tone.bar}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          #{activity.number} · {activity.title || labelOf(ACTIVITY_TYPES, activity.type)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {showDate && `${formatDateBR(activity.activity_date)} · `}
          {activity.start_time?.slice(0, 5) ?? "--:--"} ·{" "}
          {activity.schools?.name ?? activity.cities?.name ?? "Sem local"}
        </p>
      </div>
      <Badge variant="outline" className={tone.chip}>
        {labelOf(ACTIVITY_TYPES, activity.type)}
      </Badge>
    </Link>
  );
}
