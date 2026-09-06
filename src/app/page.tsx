import Link from "next/link";

import { NewEvaluationDialog } from "@/components/new-evaluation-dialog";
import { StartSessionDialog } from "@/components/start-session-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function EvaluationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: evaluations }, { data: sessions }] = await Promise.all([
    supabase.from("evaluations").select("id, title, group_label").order("created_at", { ascending: false }),
    supabase.from("sessions").select("id, evaluation_id, status"),
  ]);

  const counts = new Map<string, { total: number; completed: number }>();
  for (const session of sessions ?? []) {
    const count = counts.get(session.evaluation_id) ?? { total: 0, completed: 0 };
    count.total += 1;
    if (session.status === "completed") count.completed += 1;
    counts.set(session.evaluation_id, count);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Evaluaciones</h1>
        <NewEvaluationDialog teacherId={user.id} />
      </div>

      {(evaluations ?? []).length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">
          Todavía no tienes evaluaciones. Crea la primera.
        </p>
      ) : null}

      <div className="space-y-3">
        {(evaluations ?? []).map((evaluation) => {
          const count = counts.get(evaluation.id) ?? { total: 0, completed: 0 };
          return (
            <Card key={evaluation.id}>
              <CardHeader>
                <CardTitle className="text-xl">{evaluation.title}</CardTitle>
                <p className="text-muted-foreground text-sm">
                  {evaluation.group_label ? `${evaluation.group_label} · ` : ""}
                  {count.total} aplicaciones · {count.completed} terminadas
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <StartSessionDialog teacherId={user.id} evaluationId={evaluation.id} />
                <Button asChild variant="outline" size="lg">
                  <Link href={`/evaluaciones/${evaluation.id}`}>Editar</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={`/evaluaciones/${evaluation.id}/reporte`}>Reporte</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
