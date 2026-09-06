import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * A student has one session per evaluation. Applying the same evaluation again
 * reopens the session that already exists.
 */
export async function startSession(
  supabase: SupabaseClient<Database>,
  teacherId: string,
  evaluationId: string,
  studentId: string,
) {
  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("evaluation_id", evaluationId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("sessions")
    .insert({ teacher_id: teacherId, evaluation_id: evaluationId, student_id: studentId })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("session not created");
  return data.id;
}

/** Finds the student by name for this teacher, or creates it. */
export async function findOrCreateStudent(
  supabase: SupabaseClient<Database>,
  teacherId: string,
  name: string,
) {
  const { data, error } = await supabase
    .from("students")
    .upsert({ teacher_id: teacherId, name: name.trim() }, { onConflict: "teacher_id,name" })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("student not created");
  return data.id;
}
