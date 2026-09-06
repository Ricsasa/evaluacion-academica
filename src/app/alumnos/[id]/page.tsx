import { notFound } from "next/navigation";

import { StudentSessions } from "@/components/student-sessions";
import { NewSessionForStudentDialog } from "@/components/new-session-for-student-dialog";
import { sectionScore, sumScores } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";

export default async function StudentPage({ params }: PageProps<"/alumnos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: student }, { data: sessions }, { data: evaluations }] = await Promise.all([
    supabase.from("students").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("sessions")
      .select("id, status, applied_at, evaluation_id, evaluations (title)")
      .eq("student_id", id)
      .order("applied_at", { ascending: false }),
    supabase.from("evaluations").select("id, title").order("created_at", { ascending: false }),
  ]);

  if (!student) notFound();

  const sessionIds = (sessions ?? []).map((session) => session.id);
  const evaluationIds = [...new Set((sessions ?? []).map((session) => session.evaluation_id))];

  const [{ data: sections }, { data: responses }, { data: overrides }] = await Promise.all([
    supabase
      .from("sections")
      .select("id, evaluation_id, items (id)")
      .in("evaluation_id", evaluationIds.length ? evaluationIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("item_responses")
      .select("session_id, item_id, is_correct")
      .in("session_id", sessionIds.length ? sessionIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("section_scores")
      .select("session_id, section_id, correct_count, total_count")
      .in("session_id", sessionIds.length ? sessionIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const rows = (sessions ?? []).map((session) => {
    const answers = new Map(
      (responses ?? [])
        .filter((response) => response.session_id === session.id)
        .map((response) => [response.item_id, response.is_correct] as const),
    );
    const score = sumScores(
      (sections ?? [])
        .filter((section) => section.evaluation_id === session.evaluation_id)
        .map((section) =>
          sectionScore(
            section.items.map((item) => item.id),
            answers,
            (overrides ?? []).find(
              (override) =>
                override.session_id === session.id && override.section_id === section.id,
            ),
          ),
        ),
    );

    return {
      id: session.id,
      title: session.evaluations?.title ?? "",
      status: session.status,
      appliedAt: session.applied_at,
      correct: score.correct,
      total: score.total,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{student.name}</h1>
        <NewSessionForStudentDialog
          teacherId={user.id}
          studentId={student.id}
          evaluations={evaluations ?? []}
        />
      </div>

      <StudentSessions rows={rows} />
    </div>
  );
}
