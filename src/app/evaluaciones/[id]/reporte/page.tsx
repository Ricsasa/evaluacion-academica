import { notFound } from "next/navigation";

import { EvaluationReport } from "@/components/evaluation-report";
import { sectionScore, sumScores } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";

const NO_MATCH = "00000000-0000-0000-0000-000000000000";

export default async function ReportPage({ params }: PageProps<"/evaluaciones/[id]/reporte">) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: evaluation }, { data: sections }, { data: sessions }] = await Promise.all([
    supabase.from("evaluations").select("id, title, group_label").eq("id", id).maybeSingle(),
    supabase
      .from("sections")
      .select("id, title, color, position, items (id)")
      .eq("evaluation_id", id)
      .order("position"),
    supabase
      .from("sessions")
      .select("id, status, applied_at, students (name)")
      .eq("evaluation_id", id)
      .order("applied_at", { ascending: false }),
  ]);

  if (!evaluation) notFound();

  const sessionIds = (sessions ?? []).map((session) => session.id);

  const [{ data: responses }, { data: overrides }] = await Promise.all([
    supabase
      .from("item_responses")
      .select("session_id, item_id, is_correct")
      .in("session_id", sessionIds.length ? sessionIds : [NO_MATCH]),
    supabase
      .from("section_scores")
      .select("session_id, section_id, correct_count, total_count")
      .in("session_id", sessionIds.length ? sessionIds : [NO_MATCH]),
  ]);

  const rows = (sessions ?? [])
    .map((session) => {
    const answers = new Map(
      (responses ?? [])
        .filter((response) => response.session_id === session.id)
        .map((response) => [response.item_id, response.is_correct] as const),
    );
    const perSection = (sections ?? []).map((section) =>
      sectionScore(
        section.items.map((item) => item.id),
        answers,
        (overrides ?? []).find(
          (override) => override.session_id === session.id && override.section_id === section.id,
        ),
      ),
    );

      return {
        sessionId: session.id,
        studentName: session.students?.name ?? "",
        status: session.status,
        perSection,
        total: sumScores(perSection),
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName, "es"));

  return (
    <EvaluationReport
      title={evaluation.title}
      groupLabel={evaluation.group_label}
      sections={(sections ?? []).map(({ id: sectionId, title, color }) => ({
        id: sectionId,
        title,
        color,
      }))}
      rows={rows}
    />
  );
}
