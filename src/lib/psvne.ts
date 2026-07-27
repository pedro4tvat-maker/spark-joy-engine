import type { Database } from "@/integrations/supabase/types";

export type ActivityType = Database["public"]["Enums"]["activity_type"];
export type ActivityStatus = Database["public"]["Enums"]["activity_status"];
export type ActivityPriority = Database["public"]["Enums"]["activity_priority"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const ACTIVITY_TYPES: { value: ActivityType; label: string; tone: string }[] = [
  { value: "acuidade", label: "Acuidade", tone: "acuidade" },
  { value: "atendimento", label: "Atendimento", tone: "atendimento" },
  { value: "entrega", label: "Entrega", tone: "entrega" },
  { value: "reuniao", label: "Reunião", tone: "neutro" },
  { value: "viagem", label: "Viagem", tone: "neutro" },
  { value: "treinamento", label: "Treinamento", tone: "neutro" },
  { value: "administrativo", label: "Administrativo", tone: "neutro" },
];

export const ACTIVITY_STATUS: { value: ActivityStatus; label: string }[] = [
  { value: "agendada", label: "Agendada" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "atrasada", label: "Atrasada" },
  { value: "cancelada", label: "Cancelada" },
];

export const ACTIVITY_PRIORITY: { value: ActivityPriority; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export const APP_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "administrador", label: "Administrador", description: "Acesso total" },
  { value: "coordenador", label: "Coordenador", description: "Gerencia atividades" },
  { value: "financeiro", label: "Financeiro", description: "Prestação de contas" },
  { value: "vendedor", label: "Vendedor", description: "Vê apenas seus atendimentos" },
  { value: "optometrista", label: "Optometrista", description: "Vê apenas seus atendimentos" },
  { value: "entregador", label: "Entregador", description: "Vê apenas suas entregas" },
  { value: "motorista", label: "Motorista", description: "Vê apenas viagens" },
];

export const JOB_ROLES = [
  "Optometrista",
  "Vendedor",
  "Motorista",
  "Prestador",
  "Coordenador",
  "Auxiliar",
  "Administrativo",
];

/** Cor operacional do evento: cancelado e urgente sobrepõem o tipo. */
export function eventTone(type: ActivityType, status: ActivityStatus, priority: ActivityPriority) {
  if (status === "cancelada") return "cancelado";
  if (priority === "urgente" || status === "atrasada") return "urgente";
  return ACTIVITY_TYPES.find((t) => t.value === type)?.tone ?? "neutro";
}

const TONE_CLASSES: Record<string, { dot: string; chip: string; bar: string }> = {
  acuidade: {
    dot: "bg-ev-acuidade",
    chip: "bg-ev-acuidade-soft text-ev-acuidade border-ev-acuidade/25",
    bar: "border-l-ev-acuidade",
  },
  atendimento: {
    dot: "bg-ev-atendimento",
    chip: "bg-ev-atendimento-soft text-ev-atendimento border-ev-atendimento/25",
    bar: "border-l-ev-atendimento",
  },
  entrega: {
    dot: "bg-ev-entrega",
    chip: "bg-ev-entrega-soft text-ev-entrega border-ev-entrega/25",
    bar: "border-l-ev-entrega",
  },
  cancelado: {
    dot: "bg-ev-cancelado",
    chip: "bg-ev-cancelado-soft text-ev-cancelado border-ev-cancelado/25",
    bar: "border-l-ev-cancelado",
  },
  urgente: {
    dot: "bg-ev-urgente",
    chip: "bg-ev-urgente-soft text-ev-urgente border-ev-urgente/25",
    bar: "border-l-ev-urgente",
  },
  neutro: {
    dot: "bg-ev-neutro",
    chip: "bg-ev-neutro-soft text-ev-neutro border-ev-neutro/25",
    bar: "border-l-ev-neutro",
  },
};

export function toneClasses(tone: string) {
  return TONE_CLASSES[tone] ?? TONE_CLASSES.neutro;
}

export const CHECKLIST_TEMPLATES: Partial<Record<ActivityType, string[]>> = {
  acuidade: [
    "Banner",
    "Mesa",
    "Cadeiras",
    "Notebook",
    "Impressora",
    "Cabos",
    "Extensões",
    "Formulários",
    "Equipe completa",
  ],
  entrega: [
    "Óculos separados",
    "Conferência",
    "Relatório",
    "Máquina de cartão",
    "PIX",
    "Envelope",
    "OS",
  ],
  atendimento: [
    "Equipamentos conferidos",
    "Formulários",
    "Máquina de cartão",
    "Equipe completa",
    "Material de apoio",
  ],
};

export const DOCUMENT_CATEGORIES = [
  "Fotos",
  "Relatórios",
  "Prestação de contas",
  "Cards",
  "Comprovantes",
  "Outros",
];

export function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

export function formatDateBR(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function slugSegment(value?: string | null) {
  return (value ?? "sem-identificacao")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function labelOf<T extends string>(list: { value: T; label: string }[], value?: T | null) {
  return list.find((i) => i.value === value)?.label ?? "—";
}
