import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ActivityFormDialog } from "@/components/activity-form-dialog";
import { ACTIVITY_TYPES, eventTone, labelOf, toneClasses } from "@/lib/psvne";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Calendário operacional | PSVNE" },
      {
        name: "description",
        content:
          "Calendário mensal das atividades do PSVNE: acuidades, atendimentos, entregas, viagens e reuniões com cores por tipo.",
      },
      { property: "og:title", content: "Calendário operacional | PSVNE" },
      {
        property: "og:description",
        content: "Agenda mensal completa das operações do Projeto Saúde Visual na Escola.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [typeFilter, setTypeFilter] = useState<string>("todos");

  const { first, days, monthLabel, start, end } = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const cells: Date[] = [];
    const lead = first.getDay();
    for (let i = 0; i < lead; i++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), i - lead + 1));
    }
    for (let d = 1; d <= last.getDate(); d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (cells.length % 7 !== 0) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), last.getDate() + (cells.length % 7)));
    }
    return {
      first,
      days: cells,
      monthLabel: first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      start: iso(cells[0]),
      end: iso(cells[cells.length - 1]),
    };
  }, [cursor]);

  const { data } = useQuery({
    queryKey: ["calendar", start, end],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, number, title, type, status, priority, activity_date, start_time, cities(name), schools(name)")
        .gte("activity_date", start)
        .lte("activity_date", end)
        .order("start_time");
      return data ?? [];
    },
  });

  const events = (data ?? []).filter((e) => typeFilter === "todos" || e.type === typeFilter);
  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const list = byDay.get(e.activity_date) ?? [];
    list.push(e);
    byDay.set(e.activity_date, list);
  }

  const todayIso = iso(new Date());

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mês anterior"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h1 className="font-display text-xl font-semibold capitalize">{monthLabel}</h1>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo mês"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Hoje
          </Button>
        </div>

        <ActivityFormDialog
          trigger={
            <Button className="h-11">
              <Plus className="mr-2 size-4" /> Nova atividade
            </Button>
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={typeFilter === "todos"} onClick={() => setTypeFilter("todos")}>
          Todos
        </FilterChip>
        {ACTIVITY_TYPES.map((t) => (
          <FilterChip
            key={t.value}
            active={typeFilter === t.value}
            onClick={() => setTypeFilter(t.value)}
          >
            <span className={cn("size-2 rounded-full", toneClasses(t.tone).dot)} />
            {t.label}
          </FilterChip>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const key = iso(d);
              const outside = d.getMonth() !== first.getMonth();
              const list = byDay.get(key) ?? [];
              return (
                <div
                  key={`${key}-${i}`}
                  className={cn(
                    "min-h-28 border-b border-r p-1.5",
                    outside && "bg-muted/30 text-muted-foreground",
                    key === todayIso && "bg-primary/5",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        key === todayIso &&
                          "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    <ActivityFormDialog
                      defaultDate={key}
                      trigger={
                        <button
                          className="text-muted-foreground opacity-0 transition-opacity hover:text-primary focus:opacity-100 group-hover:opacity-100 md:opacity-60"
                          aria-label="Adicionar atividade"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    {list.slice(0, 3).map((e) => {
                      const tone = toneClasses(eventTone(e.type, e.status, e.priority));
                      return (
                        <Link
                          key={e.id}
                          to="/atividades/$activityId"
                          params={{ activityId: e.id }}
                          className={cn(
                            "block truncate rounded border px-1.5 py-1 text-[11px] font-medium",
                            tone.chip,
                            e.status === "cancelada" && "line-through",
                          )}
                        >
                          {e.start_time?.slice(0, 5)} {e.title || labelOf(ACTIVITY_TYPES, e.type)}
                        </Link>
                      );
                    })}
                    {list.length > 3 && (
                      <p className="px-1 text-[11px] text-muted-foreground">+{list.length - 3} mais</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
