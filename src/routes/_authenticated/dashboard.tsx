import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  PackageCheck,
  Plus,
  Receipt,
  School,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { isManagerRole, useSessionProfile } from "@/hooks/use-session-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const iso = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function monthRange(base = new Date()) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { start: iso(start), end: iso(end) };
}

type PeriodKey = "hoje" | "semana" | "mes";

/** Intervalo (inclusivo) correspondente ao período selecionado. */
function periodRange(period: PeriodKey, base = new Date()) {
  if (period === "hoje") return { start: iso(base), end: iso(base) };
  if (period === "semana") {
    // Semana de segunda a domingo.
    const weekday = (base.getDay() + 6) % 7;
    const first = new Date(base.getFullYear(), base.getMonth(), base.getDate() - weekday);
    const last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 6);
    return { start: iso(first), end: iso(last) };
  }
  return monthRange(base);
}

const num = (v: number | null | undefined) => Number(v ?? 0);

type SaleRow = {
  total_amount: number | null;
  cash_amount: number | null;
  pix_amount: number | null;
  card_amount: number | null;
  credit_amount: number | null;
  is_courtesy: boolean | null;
  activity_id: string;
  activities: {
    activity_date: string;
    cities: { name: string } | null;
  } | null;
};

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function DashboardPage() {
  const now = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  /** Base do período: mês/ano escolhidos quando o modo é "Mês". */
  const { start, end } = useMemo(() => {
    if (period === "mes") return monthRange(new Date(year, month, 1));
    return periodRange(period);
  }, [period, month, year]);

  const { start: monthStart, end: monthEnd } = useMemo(
    () => monthRange(new Date(year, month, 1)),
    [year, month],
  );
  const { start: prevStart, end: prevEnd } = useMemo(
    () => monthRange(new Date(year, month - 1, 1)),
    [year, month],
  );
  const today = iso(new Date());
  const { data: profile } = useSessionProfile();
  const isManager = isManagerRole(profile);


  /* Atividades do período selecionado (KPIs operacionais). */
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", start, end],
    queryFn: async () => {
      const { data: activities } = await supabase
        .from("activities")
        .select("*, cities(name), schools(name, neighborhood)")
        .gte("activity_date", start)
        .lte("activity_date", end)
        .order("activity_date");
      return activities ?? [];
    },
  });

  /* Atividades do mês corrente — seções "Hoje", "Alertas" e "Próximas". */
  const { data: monthData, isLoading: monthLoading } = useQuery({
    queryKey: ["dashboard", monthStart, monthEnd],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("activities")
        .select("*, cities(name), schools(name, neighborhood)")
        .gte("activity_date", monthStart)
        .lte("activity_date", monthEnd)
        .order("activity_date");
      return rows ?? [];
    },
  });

  const activities = data ?? [];
  const monthActivities = monthData ?? [];

  const todays = monthActivities.filter((a) => a.activity_date === today);
  const upcoming = monthActivities
    .filter((a) => a.activity_date > today && a.status !== "cancelada")
    .slice(0, 6);
  const late = monthActivities.filter((a) => a.status === "atrasada");
  const done = activities.filter((a) => a.status === "concluida");
  const pending = activities.filter(
    (a) => a.status === "agendada" || a.status === "em_andamento",
  );

  /* ---- Vendas do período selecionado ---- */
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["dashboard-sales", start, end],
    enabled: isManager,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("sales")
        .select(
          "total_amount, cash_amount, pix_amount, card_amount, credit_amount, is_courtesy, activity_id, activities!inner(activity_date, cities(name))",
        )
        .gte("activities.activity_date", start)
        .lte("activities.activity_date", end);
      if (error) throw error;
      return (rows ?? []) as unknown as SaleRow[];
    },
  });

  const sales = salesData ?? [];

  const kpis = useMemo(() => {
    let total = 0;
    let entradas = 0;
    let credito = 0;
    let pagos = 0;
    let pagosCount = 0;
    for (const s of sales) {
      total += num(s.total_amount);
      entradas += num(s.cash_amount) + num(s.pix_amount) + num(s.card_amount);
      credito += num(s.credit_amount);
      if (!s.is_courtesy) {
        pagos += num(s.total_amount);
        pagosCount += 1;
      }
    }
    return {
      total,
      entradas,
      credito,
      ticket: pagosCount > 0 ? pagos / pagosCount : undefined,
    };
  }, [sales]);

  const payments = useMemo(() => {
    const cash = sales.reduce((s, r) => s + num(r.cash_amount), 0);
    const pix = sales.reduce((s, r) => s + num(r.pix_amount), 0);
    const card = sales.reduce((s, r) => s + num(r.card_amount), 0);
    const list = [
      { name: "Dinheiro", value: cash, color: "var(--color-chart-1)" },
      { name: "Pix", value: pix, color: "var(--color-chart-2)" },
      { name: "Cartão", value: card, color: "var(--color-chart-3)" },
    ];
    const totalPay = cash + pix + card;
    return { list, total: totalPay };
  }, [sales]);

  const topCities = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sales) {
      const name = s.activities?.cities?.name ?? "Sem cidade";
      map.set(name, (map.get(name) ?? 0) + num(s.total_amount));
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [sales]);

  /* ---- Tendência diária (sempre mês corrente) ---- */
  const { data: monthSales } = useQuery({
    queryKey: ["dashboard-sales-trend", monthStart, monthEnd],
    enabled: isManager,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("sales")
        .select("total_amount, activities!inner(activity_date)")
        .gte("activities.activity_date", monthStart)
        .lte("activities.activity_date", monthEnd);
      if (error) throw error;
      return (rows ?? []) as unknown as {
        total_amount: number | null;
        activities: { activity_date: string } | null;
      }[];
    },
  });

  const trend = useMemo(() => {
    const days = new Date(year, month + 1, 0).getDate();
    const totals = new Map<string, number>();
    for (const s of monthSales ?? []) {
      const d = s.activities?.activity_date;
      if (!d) continue;
      totals.set(d, (totals.get(d) ?? 0) + num(s.total_amount));
    }
    return Array.from({ length: days }, (_, i) => {
      const date = iso(new Date(year, month, i + 1));
      return { date, day: String(i + 1), value: totals.get(date) ?? 0 };
    });
  }, [monthSales, year, month]);


  const trendHasData = trend.some((d) => d.value > 0);

  /* ---- Indicadores operacionais do período ---- */
  const ops = useMemo(() => {
    const acuidadeDone = activities.filter(
      (a) => a.type === "acuidade" && a.status === "concluida",
    );
    const schoolsAcuidade = new Set(
      acuidadeDone.map((a) => a.school_id ?? a.id).filter(Boolean) as string[],
    );
    const atendimentos = activities.filter((a) => a.type === "atendimento");
    const entregas = activities.filter((a) => a.type === "entrega");
    const students = activities.reduce((s, a) => s + Number(a.students_count ?? 0), 0);
    return {
      schoolsAcuidade: schoolsAcuidade.size,
      acuidadeTotal: activities.filter((a) => a.type === "acuidade").length,
      atendimentos: atendimentos.length,
      atendimentosDone: atendimentos.filter((a) => a.status === "concluida").length,
      entregas: entregas.length,
      entregasDone: entregas.filter((a) => a.status === "concluida").length,
      students,
    };
  }, [activities]);

  /* ---- Próxima entrega de óculos (independe do filtro) ---- */
  const { data: nextDelivery } = useQuery({
    queryKey: ["dashboard-next-delivery", today],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("activities")
        .select("id, number, title, activity_date, start_time, cities(name), schools(name, neighborhood)")
        .eq("type", "entrega")
        .neq("status", "cancelada")
        .gte("activity_date", today)
        .order("activity_date")
        .limit(1);
      return (rows?.[0] ?? null) as null | {
        id: string;
        number: number;
        title: string | null;
        activity_date: string;
        start_time: string | null;
        cities: { name: string } | null;
        schools: { name: string; neighborhood: string | null } | null;
      };
    },
  });


  /* ---- Mês anterior (comparativo dos cards operacionais) ---- */
  const { data: prevData } = useQuery({
    queryKey: ["dashboard", prevStart, prevEnd],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("activities")
        .select("*, cities(name), schools(name, neighborhood)")
        .gte("activity_date", prevStart)
        .lte("activity_date", prevEnd)
        .order("activity_date");
      return rows ?? [];
    },
  });

  const prevActivities = prevData ?? [];
  const prevLoaded = prevData !== undefined;
  const prevDone = prevActivities.filter((a) => a.status === "concluida").length;
  const prevPending = prevActivities.filter(
    (a) => a.status === "agendada" || a.status === "em_andamento",
  ).length;

  /** Retorna a variação ou undefined quando não há base de comparação. */
  const delta = (current: number, previous: number | undefined) =>
    prevLoaded && previous !== undefined && period === "mes" ? current - previous : undefined;

  const rate = activities.length ? (done.length / activities.length) * 100 : undefined;
  const prevRate = prevActivities.length ? (prevDone / prevActivities.length) * 100 : undefined;
  const rateDelta =
    prevLoaded && period === "mes" && rate !== undefined && prevRate !== undefined
      ? Math.round(rate - prevRate)
      : undefined;

  const periodLabel =
    period === "hoje"
      ? "hoje"
      : period === "semana"
        ? "nesta semana"
        : `em ${MONTH_NAMES[month]} de ${year}`;

  const years = useMemo(() => {
    const base = now.getFullYear();
    return [base - 2, base - 1, base, base + 1];
  }, [now]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="mr-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão operacional {periodLabel}</p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="h-11 w-32" aria-label="Período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Semana</SelectItem>
              <SelectItem value="mes">Mês</SelectItem>
            </SelectContent>
          </Select>
          {period === "mes" && (
            <>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="h-11 w-36" aria-label="Mês">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="h-11 w-28" aria-label="Ano">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        <ActivityFormDialog
          trigger={
            <Button className="h-11">
              <Plus className="mr-2 size-4" /> Nova atividade
            </Button>
          }
        />
      </div>

      {/* Operacional: acuidade, atendimentos, entregas e próxima entrega */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Escolas com acuidade"
          value={String(ops.schoolsAcuidade)}
          icon={School}
          hint={`${ops.acuidadeTotal} atividade(s) de acuidade`}
          loading={isLoading}
        />
        <Stat
          label="Atendimentos"
          value={String(ops.atendimentos)}
          icon={Stethoscope}
          hint={`${ops.atendimentosDone} concluídos`}
          loading={isLoading}
        />
        <Stat
          label="Entregas"
          value={String(ops.entregas)}
          icon={PackageCheck}
          hint={`${ops.entregasDone} concluídas`}
          loading={isLoading}
        />
        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-ev-entrega-soft text-ev-entrega">
              <Truck className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Próxima entrega de óculos
              </p>
              {nextDelivery ? (
                <Link
                  to="/atividades/$activityId"
                  params={{ activityId: nextDelivery.id }}
                  className="block"
                >
                  <p className="font-display text-lg font-semibold">
                    {formatDateBR(nextDelivery.activity_date)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {nextDelivery.schools?.name ?? nextDelivery.cities?.name ?? "Sem local"}
                    {nextDelivery.schools?.neighborhood
                      ? ` · ${nextDelivery.schools.neighborhood}`
                      : ""}
                  </p>
                </Link>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Nenhuma entrega agendada.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>


      {isManager ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat
            label="Faturamento total"
            value={formatMoney(kpis.total)}
            icon={Receipt}
            hint={`${sales.length} venda(s)`}
            loading={salesLoading}
          />
          <Stat
            label="Entradas recebidas"
            value={formatMoney(kpis.entradas)}
            icon={Wallet}
            hint="Dinheiro + Pix + Cartão"
            loading={salesLoading}
          />
          <Stat
            label="Crediário a receber"
            value={formatMoney(kpis.credito)}
            icon={CreditCard}
            hint="Parcelado no crediário"
            loading={salesLoading}
          />
          <Stat
            label="Ticket médio"
            value={kpis.ticket !== undefined ? formatMoney(kpis.ticket) : "—"}
            icon={TrendingUp}
            hint="Sem cortesias"
            loading={salesLoading}
          />
          <Stat
            label="Taxa de conclusão"
            value={rate !== undefined ? `${Math.round(rate)}%` : "—"}
            icon={CheckCircle2}
            hint="Atividades finalizadas"
            delta={rateDelta}
            deltaGood="up"
            deltaFormat={(v) => `${v}%`}
            loading={isLoading}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Stat
            label="Atividades no período"
            value={String(activities.length)}
            icon={CalendarClock}
            hint={`${done.length} concluídas`}
            loading={isLoading}
            delta={delta(activities.length, prevActivities.length)}
          />
          <Stat
            label="Em aberto"
            value={String(pending.length)}
            icon={CalendarClock}
            hint="Agendadas ou em andamento"
            loading={isLoading}
            delta={delta(pending.length, prevPending)}
          />
          <Stat
            label="Taxa de conclusão"
            value={rate !== undefined ? `${Math.round(rate)}%` : "—"}
            icon={CheckCircle2}
            hint="Atividades finalizadas"
            delta={rateDelta}
            deltaGood="up"
            deltaFormat={(v) => `${v}%`}
            loading={isLoading}
          />
        </div>
      )}

      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Faturamento por dia · {MONTH_NAMES[month]} de {year}
            </CardTitle>

          </CardHeader>
          <CardContent className="h-72">
            {!trendHasData ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Nenhuma venda registrada neste mês.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={70}
                    tickFormatter={(v: number) => formatMoney(v)}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatMoney(v), "Faturamento"]}
                    labelFormatter={(_l, payload) => {
                      const date = payload?.[0]?.payload?.date as string | undefined;
                      return date ? formatDateBR(date) : "";
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#trendFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {isManager && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formas de pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.total === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum recebimento no período.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-6">
                  <div className="h-40 w-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={payments.list}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={38}
                          outerRadius={65}
                          paddingAngle={2}
                        >
                          {payments.list.map((p) => (
                            <Cell key={p.name} fill={p.color} stroke="var(--color-card)" />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatMoney(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-2">
                    {payments.list.map((p) => (
                      <li key={p.name} className="flex items-center gap-2 text-sm">
                        <span
                          className="size-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: p.color }}
                          aria-hidden
                        />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="font-medium">{formatMoney(p.value)}</span>
                        <span className="w-12 text-right text-xs text-muted-foreground">
                          {Math.round((p.value / payments.total) * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Top cidades</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/vendas">
                  <BarChart3 className="mr-2 size-4" /> Ver relatório completo
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {topCities.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma venda registrada no período.
                </p>
              )}
              {topCities.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="font-medium">{formatMoney(c.value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Hoje · {formatDateBR(today)}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/calendario">Ver calendário</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {monthLoading && <Skeleton className="h-20 w-full" />}
            {!monthLoading && todays.length === 0 && (
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
          {!monthLoading && upcoming.length === 0 && (
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
  delta,
  deltaGood,
  deltaFormat,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  tone?: string;
  loading?: boolean;
  /** Variação absoluta vs. mês anterior. undefined = sem base de comparação. */
  delta?: number;
  /** Indica se um aumento é favorável ("up") ou desfavorável ("down"). */
  deltaGood?: "up" | "down";
  deltaFormat?: (value: number) => string;
}) {
  const showDelta = !loading && delta !== undefined && Number.isFinite(delta);
  const positive = (delta ?? 0) > 0;
  const favorable = deltaGood ? (positive ? deltaGood === "up" : deltaGood === "down") : null;
  const deltaColor =
    delta === 0 || favorable === null
      ? "text-muted-foreground"
      : favorable
        ? "text-success"
        : "text-destructive";
  const DeltaIcon = positive ? TrendingUp : TrendingDown;
  const format = deltaFormat ?? ((v: number) => String(v));
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
          {showDelta && (
            <p className={`mt-0.5 flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
              {delta !== 0 && <DeltaIcon className="size-3.5" aria-hidden />}
              <span>
                {delta === 0
                  ? "Sem variação vs. mês anterior"
                  : `${positive ? "+" : "-"}${format(Math.abs(delta!))} vs. mês anterior`}
              </span>
            </p>
          )}
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
  schools?: { name: string; neighborhood?: string | null } | null;
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
          {activity.schools?.neighborhood ? ` · ${activity.schools.neighborhood}` : ""}
        </p>
      </div>
      <Badge variant="outline" className={tone.chip}>
        {labelOf(ACTIVITY_TYPES, activity.type)}
      </Badge>
    </Link>
  );
}
