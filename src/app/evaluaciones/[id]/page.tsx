import { notFound } from "next/navigation";

import { EvaluationEditor } from "@/components/evaluation-editor";
import { createClient } from "@/lib/supabase/server";

export default async function EvaluationEditorPage({ params }: PageProps<"/evaluaciones/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: evaluation }, { data: sections }, { count: sessionCount }] = await Promise.all([
    supabase.from("evaluations").select("id, title").eq("id", id).maybeSingle(),
    supabase
      .from("sections")
      .select("id, title, color, notes, position, items (id, content, position)")
      .eq("evaluation_id", id)
      .order("position"),
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("evaluation_id", id),
  ]);

  if (!evaluation) notFound();

  const ordered = (sections ?? []).map((section) => ({
    ...section,
    items: [...section.items].sort((a, b) => a.position - b.position),
  }));

  return (
    <EvaluationEditor
      evaluation={evaluation}
      initialSections={ordered}
      hasSessions={(sessionCount ?? 0) > 0}
    />
  );
}
