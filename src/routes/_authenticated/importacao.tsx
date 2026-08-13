import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { isManagerRole, useSessionProfile } from "@/hooks/use-session-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildPreview,
  parseSalesWorkbook,
  runImport,
  type ImportPreview,
  type ImportResult,
} from "@/lib/sales-import";

export const Route = createFileRoute("/_authenticated/importacao")({
  head: () => ({
    meta: [
      { title: "Importar vendas | PSVNE Operações" },
      {
        name: "description",
        content:
          "Importe a planilha de vendas do PSVNE, confira as diferenças e atualize o financeiro das atividades.",
      },
      { property: "og:title", content: "Importar vendas | PSVNE Operações" },
      {
        property: "og:description",
        content: "Importação de planilha de vendas com prévia de diferenças e revisão de conferência.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportacaoPage,
});

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const showValue = (v: number | boolean) => (typeof v === "boolean" ? (v ? "Sim" : "Não") : money(v));

function ImportacaoPage() {
  const { data: profile } = useSessionProfile();
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (profile && !isManagerRole(profile)) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Apenas usuários com acesso de gestão podem importar planilhas de vendas.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  async function handleFile(file: File) {
    setLoading(true);
    setResult(null);
    setPreview(null);
    setFileName(file.name);
    try {
      const rows = await parseSalesWorkbook(file);
      if (!rows.length) {
        toast.error("Nenhuma linha válida encontrada na aba \"Dados\".");
        return;
      }
      setPreview(await buildPreview(rows));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao ler a planilha.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    setSaving(true);
    try {
      const res = await runImport(preview.rows, profile?.userId ?? null);
      setResult(res);
      setPreview(null);
      queryClient.invalidateQueries();
      toast.success(`${res.savedCount} vendas importadas/atualizadas.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao importar as vendas.");
    } finally {
      setSaving(false);
    }
  }

  const detailed = (preview?.diffs ?? []).filter((d) => d.kind !== "sem-alteracao");

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Importar vendas</h1>
        <p className="text-sm text-muted-foreground">
          Envie a planilha .xlsx com a aba <strong>Dados</strong>. As vendas são vinculadas às
          atividades por escola, cidade e data.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Selecionar planilha</CardTitle>
          <CardDescription>Formato aceito: .xlsx</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-accent/40">
            <FileSpreadsheet className="size-5 shrink-0 text-primary" />
            <span>{fileName ?? "Clique para escolher o arquivo da planilha"}</span>
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = "";
              }}
            />
          </label>
          {loading && <Loader2 className="size-5 animate-spin text-primary" />}
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Prévia</CardTitle>
            <CardDescription>Confira antes de gravar no sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Linhas lidas" value={preview.rows.length} />
              <Stat label="Vendas novas" value={preview.newCount} />
              <Stat label="Vendas alteradas" value={preview.changedCount} />
              <Stat label="Sem alteração" value={preview.unchangedCount} />
              <Stat label="Atividades a criar" value={preview.newActivities.length} />
              <Stat label="Atividades existentes" value={preview.existingActivities} />
              <Stat label="Marcadas para revisão" value={preview.reviewCount} />
            </div>

            {detailed.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="detalhes">
                  <AccordionTrigger>
                    Ver {detailed.length} linha(s) nova(s) ou alterada(s)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>OS</TableHead>
                            <TableHead>Aluno(a)</TableHead>
                            <TableHead>Escola</TableHead>
                            <TableHead>Situação</TableHead>
                            <TableHead>Mudanças</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailed.map((diff) => (
                            <TableRow key={diff.row.osNumber}>
                              <TableCell className="font-medium">{diff.row.osNumber}</TableCell>
                              <TableCell>{diff.row.studentName ?? "—"}</TableCell>
                              <TableCell>{diff.row.schoolName}</TableCell>
                              <TableCell>
                                <Badge variant={diff.kind === "nova" ? "default" : "secondary"}>
                                  {diff.kind === "nova" ? "Nova" : "Alterada"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {diff.kind === "nova"
                                  ? money(diff.row.totalAmount)
                                  : diff.changes
                                      .map(
                                        (c) =>
                                          `${c.field}: ${showValue(c.from)} → ${showValue(c.to)}`,
                                      )
                                      .join(" · ")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <Separator />
            <Button onClick={() => void confirm()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
              Confirmar importação
            </Button>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-5 text-success" />
              Importação concluída
            </CardTitle>
            <CardDescription>
              {result.savedCount} venda(s) importada(s)/atualizada(s) ·{" "}
              {result.createdActivities.length} atividade(s) criada(s) automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {result.createdActivities.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold">Atividades criadas</h2>
                <ul className="space-y-1 text-sm">
                  {result.createdActivities.map((activity) => (
                    <li key={activity.id}>
                      <Link
                        to="/atividades/$activityId"
                        params={{ activityId: activity.id }}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {activity.title} — {activity.dateISO.split("-").reverse().join("/")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.review.length > 0 && (
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="size-4 text-destructive" />
                  Vendas para revisão ({result.review.length})
                </h2>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OS</TableHead>
                        <TableHead>Aluno(a)</TableHead>
                        <TableHead>Escola</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.review.map((item) => (
                        <TableRow key={item.osNumber}>
                          <TableCell className="font-medium">{item.osNumber}</TableCell>
                          <TableCell>{item.studentName ?? "—"}</TableCell>
                          <TableCell>{item.schoolName}</TableCell>
                          <TableCell className="text-muted-foreground">{item.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
