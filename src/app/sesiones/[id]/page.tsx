import { notFound } from "next/navigation";

import { ApplySession } from "@/components/apply-session";
import { createClient } from "@/lib/supabase/server";

export default async function SessionPage({ params }: PageProps<"/sesiones/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, evaluation_id, student_id, evaluations (title), students (name)")
    .eq("id", id)
    .maybeSingle();

  if (!session) notFound();

  const [{ data: sections }, { data: responses }, { data: overrides }] = await Promise.all([
    supabase
      .from("sections")
      .select("id, title, color, notes, position, items (id, content, position)")
      .eq("evaluation_id", session.evaluation_id)
      .order("position"),
    supabase
      .from("item_responses")
      .select("item_id, is_correct, student_answer_text")
      .eq("session_id", id),
    supabase
      .from("section_scores")
      .select("section_id, correct_count, total_count")
      .eq("session_id", id),
  ]);

  const ordered = (sections ?? []).map((section) => ({
    ...section,
    items: [...section.items].sort((a, b) => a.position - b.position),
  }));

  return (
    <ApplySession
      sessionId={session.id}
      status={session.status}
      studentId={session.student_id}
      studentName={session.students?.name ?? ""}
      evaluationTitle={session.evaluations?.title ?? ""}
      sections={ordered}
      responses={responses ?? []}
      overrides={overrides ?? []}
    />
  );
}
