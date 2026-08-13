import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

/** Uma linha de venda lida da aba "Dados" da planilha. */
export type SalesRow = {
  osNumber: string;
  dateISO: string;
  cityName: string;
  district: string | null;
  schoolName: string;
  studentName: string | null;
  totalAmount: number;
  cashAmount: number;
  pixAmount: number;
  cardAmount: number;
  entryAmount: number;
  creditAmount: number;
  installmentsLabel: string | null;
  isCourtesy: boolean;
  motherOs: string | null;
  notes: string | null;
  needsReview: boolean;
  reviewReason: string | null;
};

export type RowDiff = {
  row: SalesRow;
  kind: "nova" | "alterada" | "sem-alteracao";
  changes: { field: string; from: number | boolean; to: number | boolean }[];
};

export type ImportPreview = {
  rows: SalesRow[];
  diffs: RowDiff[];
  newCount: number;
  changedCount: number;
  unchangedCount: number;
  reviewCount: number;
  newActivities: { key: string; cityName: string; schoolName: string; dateISO: string }[];
  existingActivities: number;
};

export type ImportResult = {
  savedCount: number;
  createdActivities: { id: string; title: string; dateISO: string }[];
  review: { osNumber: string; studentName: string | null; schoolName: string; reason: string }[];
};

const norm = (v: unknown) => String(v ?? "").trim();
const key = (v: unknown) => norm(v).toLowerCase();

/** Converte números em formato brasileiro ("1.234,56", "R$ 150,00") para number. */
export function parseMoney(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = norm(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Converte "DD/MM/AA" (ou serial/Date do Excel) para data ISO "YYYY-MM-DD". */
export function parseSheetDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
  }
  const text = norm(value);
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  if (!day || !month || month > 12 || day > 31) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function activityKeyOf(row: SalesRow) {
  return `${key(row.schoolName)}|${key(row.cityName)}|${row.dateISO}`;
}

/** Lê a aba "Dados" e devolve as linhas válidas. */
export async function parseSalesWorkbook(file: File): Promise<SalesRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { cellDates: true });
  const sheet = wb.Sheets["Dados"];
  if (!sheet) throw new Error('A planilha não possui uma aba chamada "Dados".');

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  const rows: SalesRow[] = [];

  for (let i = 1; i < matrix.length; i += 1) {
    const cells = matrix[i] ?? [];
    const osNumber = norm(cells[0]);
    const dateISO = parseSheetDate(cells[1]);
    if (!osNumber && !norm(cells[1])) continue; // linha vazia
    if (!osNumber || !dateISO) continue; // sem OS ou sem data válida

    const totalAmount = parseMoney(cells[6]);
    const cashAmount = parseMoney(cells[7]);
    const pixAmount = parseMoney(cells[8]);
    const cardAmount = parseMoney(cells[9]);
    const entryAmount = parseMoney(cells[10]);
    const creditAmount = parseMoney(cells[11]);
    const isCourtesy = key(cells[13]).startsWith("s");

    let needsReview = false;
    let reviewReason: string | null = null;
    const sum = cashAmount + pixAmount + cardAmount + creditAmount;
    if (isCourtesy && Math.abs(totalAmount) > 0.01) {
      needsReview = true;
      reviewReason = "Cortesia com valor total diferente de zero";
    } else if (!isCourtesy && Math.abs(sum - totalAmount) > 0.01) {
      needsReview = true;
      reviewReason = "Soma das formas de pagamento não bate com o valor total";
    }

    rows.push({
      osNumber,
      dateISO,
      cityName: norm(cells[2]),
      district: norm(cells[3]) || null,
      schoolName: norm(cells[4]),
      studentName: norm(cells[5]) || null,
      totalAmount,
      cashAmount,
      pixAmount,
      cardAmount,
      entryAmount,
      creditAmount,
      installmentsLabel: norm(cells[12]) || null,
      isCourtesy,
      motherOs: norm(cells[14]) || null,
      notes: norm(cells[15]) || null,
      needsReview,
      reviewReason,
    });
  }

  return rows;
}

const DIFF_FIELDS: { field: keyof SalesRow; column: string; label: string }[] = [
  { field: "totalAmount", column: "total_amount", label: "Valor total" },
  { field: "cashAmount", column: "cash_amount", label: "Dinheiro" },
  { field: "pixAmount", column: "pix_amount", label: "Pix" },
  { field: "cardAmount", column: "card_amount", label: "Cartão" },
  { field: "creditAmount", column: "credit_amount", label: "Crediário" },
  { field: "isCourtesy", column: "is_courtesy", label: "Cortesia" },
];

/** Compara as linhas lidas com o que já existe no banco e resolve atividades. */
export async function buildPreview(rows: SalesRow[]): Promise<ImportPreview> {
  const osNumbers = Array.from(new Set(rows.map((r) => r.osNumber)));
  const existing = new Map<string, Record<string, unknown>>();

  for (let i = 0; i < osNumbers.length; i += 300) {
    const chunk = osNumbers.slice(i, i + 300);
    const { data, error } = await supabase
      .from("sales")
      .select("os_number, total_amount, cash_amount, pix_amount, card_amount, credit_amount, is_courtesy")
      .in("os_number", chunk);
    if (error) throw error;
    (data ?? []).forEach((sale) => existing.set(sale.os_number, sale as Record<string, unknown>));
  }

  const diffs: RowDiff[] = rows.map((row) => {
    const current = existing.get(row.osNumber);
    if (!current) return { row, kind: "nova", changes: [] };
    const changes = DIFF_FIELDS.flatMap(({ field, column, label }) => {
      const to = row[field] as number | boolean;
      const from = (typeof to === "boolean" ? Boolean(current[column]) : Number(current[column] ?? 0)) as
        | number
        | boolean;
      if (typeof to === "number" && typeof from === "number") {
        return Math.abs(from - to) > 0.005 ? [{ field: label, from, to }] : [];
      }
      return from !== to ? [{ field: label, from, to }] : [];
    });
    return { row, kind: changes.length ? "alterada" : "sem-alteracao", changes };
  });

  // Atividades: agrupa por escola + cidade + data
  const groups = new Map<string, SalesRow>();
  rows.forEach((row) => {
    const k = activityKeyOf(row);
    if (!groups.has(k)) groups.set(k, row);
  });

  const dates = Array.from(new Set(rows.map((r) => r.dateISO)));
  const [{ data: cities }, { data: schools }, { data: activities }] = await Promise.all([
    supabase.from("cities").select("id, name"),
    supabase.from("schools").select("id, name, city_id"),
    supabase.from("activities").select("id, school_id, activity_date").in("activity_date", dates),
  ]);

  const cityByName = new Map((cities ?? []).map((c) => [key(c.name), c.id]));
  const schoolByKey = new Map((schools ?? []).map((s) => [`${key(s.name)}|${s.city_id ?? ""}`, s.id]));
  const activityByKey = new Set((activities ?? []).map((a) => `${a.school_id ?? ""}|${a.activity_date}`));

  const newActivities: ImportPreview["newActivities"] = [];
  let existingActivities = 0;

  groups.forEach((row, k) => {
    const cityId = cityByName.get(key(row.cityName));
    const schoolId = cityId ? schoolByKey.get(`${key(row.schoolName)}|${cityId}`) : undefined;
    if (schoolId && activityByKey.has(`${schoolId}|${row.dateISO}`)) existingActivities += 1;
    else
      newActivities.push({
        key: k,
        cityName: row.cityName,
        schoolName: row.schoolName,
        dateISO: row.dateISO,
      });
  });

  return {
    rows,
    diffs,
    newCount: diffs.filter((d) => d.kind === "nova").length,
    changedCount: diffs.filter((d) => d.kind === "alterada").length,
    unchangedCount: diffs.filter((d) => d.kind === "sem-alteracao").length,
    reviewCount: rows.filter((r) => r.needsReview).length,
    newActivities,
    existingActivities,
  };
}

/** Executa a importação: resolve cidades/escolas/atividades, grava vendas e recalcula financeiro. */
export async function runImport(rows: SalesRow[], userId: string | null): Promise<ImportResult> {
  const cityCache = new Map<string, string>();
  const schoolCache = new Map<string, string>();
  const activityCache = new Map<string, string>();
  const createdActivities: ImportResult["createdActivities"] = [];

  const [{ data: cities }, { data: schools }] = await Promise.all([
    supabase.from("cities").select("id, name"),
    supabase.from("schools").select("id, name, city_id"),
  ]);
  (cities ?? []).forEach((c) => cityCache.set(key(c.name), c.id));
  (schools ?? []).forEach((s) => schoolCache.set(`${key(s.name)}|${s.city_id ?? ""}`, s.id));

  async function resolveCity(name: string) {
    const k = key(name);
    const cached = cityCache.get(k);
    if (cached) return cached;
    const { data, error } = await supabase
      .from("cities")
      .insert({ name: name || "Sem cidade", state: "PI" })
      .select("id")
      .single();
    if (error) throw error;
    cityCache.set(k, data.id);
    return data.id;
  }

  async function resolveSchool(name: string, cityId: string) {
    const k = `${key(name)}|${cityId}`;
    const cached = schoolCache.get(k);
    if (cached) return cached;
    const { data, error } = await supabase
      .from("schools")
      .insert({ name: name || "Sem escola", city_id: cityId })
      .select("id")
      .single();
    if (error) throw error;
    schoolCache.set(k, data.id);
    return data.id;
  }

  async function resolveActivity(row: SalesRow) {
    const k = activityKeyOf(row);
    const cached = activityCache.get(k);
    if (cached) return cached;

    const cityId = await resolveCity(row.cityName);
    const schoolId = await resolveSchool(row.schoolName, cityId);

    const { data: found, error: findError } = await supabase
      .from("activities")
      .select("id")
      .eq("school_id", schoolId)
      .eq("activity_date", row.dateISO)
      .limit(1)
      .maybeSingle();
    if (findError) throw findError;

    if (found?.id) {
      activityCache.set(k, found.id);
      return found.id;
    }

    const { data: created, error: createError } = await supabase
      .from("activities")
      .insert({
        type: "atendimento",
        status: "concluida",
        activity_date: row.dateISO,
        city_id: cityId,
        school_id: schoolId,
        title: row.schoolName || "Atendimento",
        created_by: userId,
      })
      .select("id")
      .single();
    if (createError) throw createError;

    activityCache.set(k, created.id);
    createdActivities.push({
      id: created.id,
      title: row.schoolName || "Atendimento",
      dateISO: row.dateISO,
    });
    return created.id;
  }

  const payload: Record<string, unknown>[] = [];
  for (const row of rows) {
    const activityId = await resolveActivity(row);
    payload.push({
      activity_id: activityId,
      os_number: row.osNumber,
      student_name: row.studentName,
      total_amount: row.totalAmount,
      cash_amount: row.cashAmount,
      pix_amount: row.pixAmount,
      card_amount: row.cardAmount,
      credit_amount: row.creditAmount,
      installments_label: row.installmentsLabel,
      is_courtesy: row.isCourtesy,
      mother_os: row.motherOs,
      notes: row.notes,
      needs_review: row.needsReview,
      review_reason: row.reviewReason,
      imported_at: new Date().toISOString(),
      imported_by: userId,
    });
  }

  for (let i = 0; i < payload.length; i += 200) {
    const { error } = await supabase
      .from("sales")
      .upsert(payload.slice(i, i + 200), { onConflict: "os_number" });
    if (error) throw error;
  }

  // Recalcula o financeiro de cada atividade afetada com base em TODAS as vendas
  const activityIds = Array.from(new Set(payload.map((p) => p.activity_id as string)));
  for (const activityId of activityIds) {
    const { data: sales, error } = await supabase
      .from("sales")
      .select("total_amount, cash_amount, pix_amount, card_amount, credit_amount, is_courtesy")
      .eq("activity_id", activityId);
    if (error) throw error;
    const list = sales ?? [];
    const sum = (pick: (s: (typeof list)[number]) => number) =>
      list.reduce((acc, s) => acc + Number(pick(s) ?? 0), 0);

    const amountPix = sum((s) => s.pix_amount);
    const amountCash = sum((s) => s.cash_amount);
    const amountCard = sum((s) => s.card_amount);

    const { error: financeError } = await supabase.from("activity_finance").upsert(
      {
        activity_id: activityId,
        amount_sold: sum((s) => s.total_amount),
        amount_received: amountCash + amountPix + amountCard,
        amount_pix: amountPix,
        amount_cash: amountCash,
        amount_card: amountCard,
        amount_credit: sum((s) => s.credit_amount),
        sales_count: list.length,
        courtesy_count: list.filter((s) => s.is_courtesy).length,
      },
      { onConflict: "activity_id" },
    );
    if (financeError) throw financeError;
  }

  return {
    savedCount: payload.length,
    createdActivities,
    review: rows
      .filter((r) => r.needsReview)
      .map((r) => ({
        osNumber: r.osNumber,
        studentName: r.studentName,
        schoolName: r.schoolName,
        reason: r.reviewReason ?? "Revisar",
      })),
  };
}
