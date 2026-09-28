import { notFound } from "next/navigation";

import { EvaluationReport } from "@/components/evaluation-report";
import { NO_GROUP, NO_GROUP_NAME } from "@/lib/groups";
import { sectionScore, sumScores } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";

const NO_MATCH = "00000000-0000-0000-0000-000000000000";

export default async function ReportPage({
  params,
  searchParams,
}: PageProps<"/evaluaciones/[id]/reporte">) {
  const { id } = await params;
  const { grupo } = await searchParams;
  const selected = typeof grupo === "string" ? grupo : null;
  const supabase = await createClient();

  const [{ data: evaluation }, { data: sections }, { data: sessions }] = await Promise.all([
    supabase.from("evaluations").select("id, title").eq("id", id).maybeSingle(),
    supabase
      .from("sections")
      .select("id, title, color, position, items (id)")
      .eq("evaluation_id", id)
      .order("position"),
    supabase
      .from("sessions")
      .select("id, status, applied_at, group_id, students (name), groups (name)")
      .eq("evaluation_id", id)
      .order("applied_at", { ascending: false }),
  ]);

  if (!evaluation) notFound();

  // Tabs come from the groups that have sessions in this evaluation.
  const groups = new Map<string, string>();
  for (const session of sessions ?? []) {
    groups.set(session.group_id ?? NO_GROUP, session.groups?.name ?? NO_GROUP_NAME);
  }
  const filtered = (sessions ?? []).filter(
    (session) => !selected || (session.group_id ?? NO_GROUP) === selected,
  );

  const sessionIds = filtered.map((session) => session.id);

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

  const rows = filtered
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
        groupName: session.groups?.name ?? NO_GROUP_NAME,
        status: session.status,
        perSection,
        total: sumScores(perSection),
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName, "es"));

  return (
    <EvaluationReport
      title={evaluation.title}
      groups={[...groups].map(([groupId, name]) => ({ id: groupId, name }))}
      selectedGroup={selected}
      sections={(sections ?? []).map(({ id: sectionId, title, color }) => ({
        id: sectionId,
        title,
        color,
      }))}
      rows={rows}
    />
  );
}
