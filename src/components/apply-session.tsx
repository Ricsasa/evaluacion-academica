"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ScoreOverrideDialog } from "@/components/score-override-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sectionColor } from "@/lib/colors";
import { sectionScore, sumScores, type Score } from "@/lib/scores";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Item = { id: string; content: string };
type Section = { id: string; title: string; color: string; notes: string | null; items: Item[] };
type Override = { correct_count: number; total_count: number };

const supabase = createClient();

export function ApplySession({
  sessionId,
  status: initialStatus,
  studentId,
  studentName,
  evaluationTitle,
  sections,
  responses,
  overrides: initialOverrides,
}: {
  sessionId: string;
  status: string;
  studentId: string;
  studentName: string;
  evaluationTitle: string;
  sections: Section[];
  responses: { item_id: string; is_correct: boolean; student_answer_text: string | null }[];
  overrides: { section_id: string; correct_count: number; total_count: number }[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, boolean>>(
    Object.fromEntries(responses.map((response) => [response.item_id, response.is_correct])),
  );
  const [texts, setTexts] = useState<Record<string, string>>(
    Object.fromEntries(
      responses.map((response) => [response.item_id, response.student_answer_text ?? ""]),
    ),
  );
  const [overrides, setOverrides] = useState<Record<string, Override>>(
    Object.fromEntries(
      initialOverrides.map((override) => [
        override.section_id,
        { correct_count: override.correct_count, total_count: override.total_count },
      ]),
    ),
  );

  const answerMap = new Map(Object.entries(answers));

  async function run(action: () => PromiseLike<{ error: unknown }>) {
    setSaving(true);
    const { error } = await action();
    setSaving(false);
    if (error) toast.error("No se pudo guardar. Revisa la conexión.");
    return !error;
  }

  async function mark(itemId: string, value: boolean) {
    const current = answers[itemId];

    if (current === value) {
      const next = { ...answers };
      delete next[itemId];
      setAnswers(next);
      await run(() =>
        supabase.from("item_responses").delete().eq("session_id", sessionId).eq("item_id", itemId),
      );
      return;
    }

    setAnswers({ ...answers, [itemId]: value });
    await run(() =>
      supabase.from("item_responses").upsert(
        {
          session_id: sessionId,
          item_id: itemId,
          is_correct: value,
          student_answer_text: texts[itemId] || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id,item_id" },
      ),
    );
  }

  async function saveText(itemId: string, text: string) {
    // The answer text only exists alongside a correct/incorrect mark.
    if (answers[itemId] === undefined) return;
    await run(() =>
      supabase.from("item_responses").upsert(
        {
          session_id: sessionId,
          item_id: itemId,
          is_correct: answers[itemId],
          student_answer_text: text || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id,item_id" },
      ),
    );
  }

  async function saveOverride(sectionId: string, correct: number, total: number) {
    setOverrides({ ...overrides, [sectionId]: { correct_count: correct, total_count: total } });
    await run(() =>
      supabase.from("section_scores").upsert(
        {
          session_id: sessionId,
          section_id: sectionId,
          correct_count: correct,
          total_count: total,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id,section_id" },
      ),
    );
  }

  async function clearOverride(sectionId: string) {
    const next = { ...overrides };
    delete next[sectionId];
    setOverrides(next);
    await run(() =>
      supabase
        .from("section_scores")
        .delete()
        .eq("session_id", sessionId)
        .eq("section_id", sectionId),
    );
  }

  /** Writes every marked answer again, so the teacher gets one clear save. */
  async function saveAll() {
    const marked = Object.entries(answers);
    if (marked.length === 0) return true;

    setSaving(true);
    const { error } = await supabase.from("item_responses").upsert(
      marked.map(([itemId, isCorrect]) => ({
        session_id: sessionId,
        item_id: itemId,
        is_correct: isCorrect,
        student_answer_text: texts[itemId] || null,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "session_id,item_id" },
    );
    setSaving(false);

    if (error) {
      toast.error("No se pudo guardar. Revisa la conexión.");
      return false;
    }
    return true;
  }

  async function save() {
    if (await saveAll()) toast.success("Respuestas guardadas.");
  }

  async function finish() {
    if (!(await saveAll())) return;
    const saved = await run(() =>
      supabase
        .from("sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", sessionId),
    );
    if (!saved) return;
    setStatus("completed");
    toast.success("Evaluación terminada y guardada.");
    router.push(`/alumnos/${studentId}`);
  }

  const scores: Score[] = sections.map((section) =>
    sectionScore(
      section.items.map((item) => item.id),
      answerMap,
      overrides[section.id],
    ),
  );
  const total = sumScores(scores);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{studentName}</h1>
          <p className="text-muted-foreground">{evaluationTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {saving ? "Guardando…" : "Guardado"}
          </span>
          <Badge variant={status === "completed" ? "default" : "secondary"} className="text-sm">
            {status === "completed" ? "Terminada" : "En progreso"}
          </Badge>
        </div>
      </div>

      {sections.map((section, index) => {
        const colors = sectionColor(section.color);
        const score = scores[index];
        return (
          <Card key={section.id} className={cn("gap-0 border-2 pt-0", colors.border)}>
            <CardHeader className={cn("flex flex-wrap items-center justify-between gap-2 py-4", colors.header)}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="flex items-center gap-2">
                <ScoreOverrideDialog
                  score={score}
                  onSave={(correct, totalCount) => saveOverride(section.id, correct, totalCount)}
                  onClear={() => clearOverride(section.id)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {section.notes ? (
                <p className="bg-muted whitespace-pre-wrap rounded-md p-3 text-base">
                  {section.notes}
                </p>
              ) : null}

              {section.items.map((item, itemIndex) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-muted-foreground w-6 text-right">{itemIndex + 1}.</span>
                    <span className="flex-1 text-lg">{item.content}</span>
                    <div className="flex gap-2">
                      <Button
                        size="lg"
                        aria-label="Correcto"
                        aria-pressed={answers[item.id] === true}
                        variant={answers[item.id] === true ? "default" : "outline"}
                        className={cn(
                          "h-14 w-20 text-2xl",
                          answers[item.id] === true && "bg-green-600 hover:bg-green-700",
                        )}
                        onClick={() => mark(item.id, true)}
                      >
                        ✓
                      </Button>
                      <Button
                        size="lg"
                        aria-label="Incorrecto"
                        aria-pressed={answers[item.id] === false}
                        variant={answers[item.id] === false ? "default" : "outline"}
                        className={cn(
                          "h-14 w-20 text-2xl",
                          answers[item.id] === false && "bg-red-600 hover:bg-red-700",
                        )}
                        onClick={() => mark(item.id, false)}
                      >
                        ✗
                      </Button>
                    </div>
                  </div>
                  <Input
                    className="mt-2 h-12 text-base"
                    placeholder="Respuesta del alumno (opcional)"
                    value={texts[item.id] ?? ""}
                    onChange={(event) => setTexts({ ...texts, [item.id]: event.target.value })}
                    onBlur={(event) => saveText(item.id, event.target.value)}
                  />
                </div>
              ))}

              {section.items.length === 0 ? (
                <p className="text-muted-foreground">Esta sección no tiene preguntas.</p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}

      <div className="bg-background sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t p-3">
        <span className="text-lg font-semibold">
          Total: {total.correct} de {total.total}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            className="h-14 px-6 text-base"
            disabled={saving}
            onClick={save}
          >
            Guardar
          </Button>
          {status === "completed" ? (
            <Badge className="self-center text-base">Terminada</Badge>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" className="h-14 px-8 text-base">
                  Terminar
                </Button>
              </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Terminar la evaluación?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se marca como terminada. Puedes volver a verla desde el alumno.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={finish}>Terminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}
