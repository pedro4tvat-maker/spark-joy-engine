import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CreditCard,
  Gift,
  Glasses,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/psvne";

export const Route = createFileRoute("/_authenticated/vendas")({
  component: SalesReportPage,
  head: () => ({
    meta: [
      { title: "Relatório de vendas | PSVNE Operações" },
      {
        name: "description",
        content:
          "Relatório de vendas do PSVNE: faturamento por cidade e escola, formas de pagamento e indicadores por período.",
      },
      { property: "og:title", content: "Relatório de vendas | PSVNE Operações" },
      {
        property: "og:description",
        content: "Faturamento, cortesias, ticket médio e formas de pagamento por período.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

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
    city_id: string | null;
    school_id: string | null;
    cities: { name: string } | null;
    schools: { name: string; neighborhood: string | null } | null;
  } | null;
};

const MONTHS = [
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

const num = (v: number | null | undefined) => Number(v ?? 0);
const pad = (n: number) => String(n).padStart(2, "0");

function SalesReportPage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [day, setDay] = useState<string>("all");

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const { start, end } = useMemo(() => {
    if (day !== "all") {
      const iso = `${year}-${pad(month + 1)}-${pad(Number(day))}`;
      return { start: iso, end: iso };
    }
    return {
      start: `${year}-${pad(month + 1)}-01`,
      end: `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`,
    };
  }, [year, month, day]);

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales-report", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(
          "total_amount, cash_amount, pix_amount, card_amount, credit_amount, is_courtesy, activity_id, activities!inner(activity_date, city_id, school_id, cities(name), schools(name, neighborhood))",
        )
        .gte("activities.activity_date", start)
        .lte("activities.activity_date", end);
      if (error) throw error;
      return (data ?? []) as unknown as SaleRow[];
    },
  });

  const rows = sales ?? [];

  const kpis = useMemo(() => {
    const revenue = rows.reduce((s, r) => s + num(r.total_amount), 0);
    const received = rows.reduce(
      (s, r) => s + num(r.cash_amount) + num(r.pix_amount) + num(r.card_amount),
      0,
    );
    const credit = rows.reduce((s, r) => s + num(r.credit_amount), 0);
    const paid = rows.filter((r) => !r.is_courtesy);
    const courtesies = rows.length - paid.length;
    const paidRevenue = paid.reduce((s, r) => s + num(r.total_amount), 0);
    const attendances = new Set(rows.map((r) => r.activity_id)).size;
    return {
      revenue,
      received,
      credit,
      sold: paid.length,
      courtesies,
      ticket: paid.length > 0 ? paidRevenue / paid.length : null,
      attendances,
      cash: rows.reduce((s, r) => s + num(r.cash_amount), 0),
      pix: rows.reduce((s, r) => s + num(r.pix_amount), 0),
      card: rows.reduce((s, r) => s + num(r.card_amount), 0),
    };
  }, [rows]);

  const byCity = useMemo(() => groupBy(rows, "city"), [rows]);
  const bySchool = useMemo(() => groupBy(rows, "school"), [rows]);
  const [showAllSchools, setShowAllSchools] = useState(false);

  const payments = [
    { name: "Dinheiro", value: kpis.cash, color: "var(--color-chart-1)" },
    { name: "Pix", value: kpis.pix, color: "var(--color-chart-2)" },
    { name: "Cartão", value: kpis.card, color: "var(--color-chart-3)" },
  ].filter((p) => p.value > 0);

  const years = Array.from({ length: 6 }, (_, i) => today.getFullYear() - 4 + i);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Relatório de vendas</h1>
          <p className="text-sm text-muted-foreground">
            Resultados por período, cidade, escola e forma de pagamento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={String(month)}
            onValueChange={(v) => {
              setMonth(Number(v));
              setDay("all");
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(year)}
            onValueChange={(v) => {
              setYear(Number(v));
              setDay("all");
            }}
          >
            <SelectTrigger className="w-28">
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
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mês inteiro</SelectItem>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <SelectItem key={d} value={String(d)}>
                  Dia {pad(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <BarChart3 className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma venda registrada neste período
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Faturamento total" value={formatMoney(kpis.revenue)} icon={Receipt} />
            <Stat label="Entradas recebidas" value={formatMoney(kpis.received)} icon={Wallet} />
            <Stat label="Crediário a receber" value={formatMoney(kpis.credit)} icon={CreditCard} />
            <Stat label="Óculos vendidos" value={String(kpis.sold)} icon={Glasses} />
            <Stat label="Cortesias concedidas" value={String(kpis.courtesies)} icon={Gift} />
            <Stat
              label="Ticket médio"
              value={kpis.ticket === null ? "—" : formatMoney(kpis.ticket)}
              icon={BarChart3}
            />
            <Stat label="Atendimentos" value={String(kpis.attendances)} icon={Users} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Faturamento por cidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {byCity.map((g) => (
                  <GroupRow key={g.key} group={g} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Formas de pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                {kpis.received <= 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum valor recebido neste período.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={payments} dataKey="value" nameKey="name" outerRadius={90}>
                            {payments.map((p) => (
                              <Cell key={p.name} fill={p.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatMoney(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="space-y-1 text-sm">
                      {payments.map((p) => (
                        <li key={p.name} className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-sm"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="flex-1">{p.name}</span>
                          <span className="font-medium">{formatMoney(p.value)}</span>
                          <span className="w-14 text-right text-muted-foreground">
                            {((p.value / kpis.received) * 100).toFixed(1)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Faturamento por escola</CardTitle>
              {bySchool.length > 10 && (
                <Button variant="ghost" size="sm" onClick={() => setShowAllSchools((v) => !v)}>
                  {showAllSchools ? "Ver menos" : "Ver todas"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {(showAllSchools ? bySchool : bySchool.slice(0, 10)).map((g) => (
                <GroupRow key={g.key} group={g} />
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

type Group = {
  key: string;
  name: string;
  revenue: number;
  sold: number;
  attendances: number;
};

function groupBy(rows: SaleRow[], mode: "city" | "school"): Group[] {
  const map = new Map<string, Group & { acts: Set<string> }>();
  rows.forEach((r) => {
    const a = r.activities;
    const key = (mode === "city" ? a?.city_id : a?.school_id) ?? "sem";
    const school = a?.schools;
    const name =
      mode === "city"
        ? (a?.cities?.name ?? "Sem cidade")
        : school
          ? `${school.name}${school.neighborhood ? ` (${school.neighborhood})` : ""}`
          : "Sem escola";
    let g = map.get(key);
    if (!g) {
      g = { key, name, revenue: 0, sold: 0, attendances: 0, acts: new Set() };
      map.set(key, g);
    }
    g.revenue += num(r.total_amount);
    if (!r.is_courtesy) g.sold += 1;
    g.acts.add(r.activity_id);
  });
  return Array.from(map.values())
    .map(({ acts, ...g }) => ({ ...g, attendances: acts.size }))
    .sort((a, b) => b.revenue - a.revenue);
}

function GroupRow({ group }: { group: Group }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
      <span className="min-w-0 flex-1 truncate">{group.name}</span>
      <span className="text-muted-foreground">{group.sold} óculos</span>
      <span className="text-muted-foreground">{group.attendances} atend.</span>
      <span className="w-28 text-right font-medium">{formatMoney(group.revenue)}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
