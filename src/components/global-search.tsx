import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, ListChecks, MapPin, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ACTIVITY_TYPES, formatDateBR, labelOf } from "@/lib/psvne";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  const q = term.trim();

  const { data } = useQuery({
    queryKey: ["global-search", q],
    enabled: open && q.length >= 2,
    queryFn: async () => {
      const like = `%${q}%`;
      const [cities, schools, employees, activities, deliveries] = await Promise.all([
        supabase.from("cities").select("id, name, state").ilike("name", like).limit(5),
        supabase.from("schools").select("id, name").ilike("name", like).limit(5),
        supabase.from("employees").select("id, name, job_role").ilike("name", like).limit(5),
        supabase
          .from("activities")
          .select("id, number, type, title, activity_date")
          .or(`title.ilike.${like},description.ilike.${like}`)
          .limit(6),
        supabase
          .from("delivery_items")
          .select("id, activity_id, os_number, student_name")
          .or(`os_number.ilike.${like},student_name.ilike.${like}`)
          .limit(6),
      ]);
      return {
        cities: cities.data ?? [],
        schools: schools.data ?? [],
        employees: employees.data ?? [],
        activities: activities.data ?? [],
        deliveries: deliveries.data ?? [],
      };
    },
  });

  function go(to: string) {
    onOpenChange(false);
    setTerm("");
    navigate({ to });
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Pesquisar cidade, escola, aluno, OS, funcionário…"
        value={term}
        onValueChange={setTerm}
      />
      <CommandList>
        {q.length < 2 ? (
          <CommandEmpty>Digite ao menos 2 caracteres.</CommandEmpty>
        ) : (
          <CommandEmpty>Nenhum resultado.</CommandEmpty>
        )}

        {!!data?.activities.length && (
          <CommandGroup heading="Atividades">
            {data.activities.map((a) => (
              <CommandItem key={a.id} value={`ativ-${a.id}`} onSelect={() => go(`/atividades/${a.id}`)}>
                <ListChecks className="mr-2 size-4" />
                <span className="truncate">
                  #{a.number} · {labelOf(ACTIVITY_TYPES, a.type)} · {a.title || "Sem título"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateBR(a.activity_date)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!data?.deliveries.length && (
          <CommandGroup heading="OS / Alunos">
            {data.deliveries.map((d) => (
              <CommandItem
                key={d.id}
                value={`os-${d.id}`}
                onSelect={() => go(`/atividades/${d.activity_id}`)}
              >
                <ListChecks className="mr-2 size-4" />
                OS {d.os_number ?? "—"} · {d.student_name ?? "—"}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!data?.cities.length && (
          <CommandGroup heading="Cidades">
            {data.cities.map((c) => (
              <CommandItem key={c.id} value={`cid-${c.id}`} onSelect={() => go("/cadastros")}>
                <MapPin className="mr-2 size-4" />
                {c.name} / {c.state}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!data?.schools.length && (
          <CommandGroup heading="Escolas">
            {data.schools.map((s) => (
              <CommandItem key={s.id} value={`esc-${s.id}`} onSelect={() => go("/cadastros")}>
                <Building2 className="mr-2 size-4" />
                {s.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!data?.employees.length && (
          <CommandGroup heading="Funcionários">
            {data.employees.map((e) => (
              <CommandItem key={e.id} value={`fun-${e.id}`} onSelect={() => go("/cadastros")}>
                <Users className="mr-2 size-4" />
                {e.name}
                <span className="ml-auto text-xs text-muted-foreground">{e.job_role}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
