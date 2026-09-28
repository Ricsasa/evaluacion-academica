import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * A student has one session per evaluation. Applying the same evaluation again
 * reopens the session that already exists and keeps its group, unless the
 * session has no group yet.
 */
export async function startSession(
  supabase: SupabaseClient<Database>,
  teacherId: string,
  evaluationId: string,
  studentId: string,
  groupId: string,
) {
  const { data: existing } = await supabase
    .from("sessions")
    .select("id, group_id")
    .eq("evaluation_id", evaluationId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) {
    if (!existing.group_id) {
      await supabase.from("sessions").update({ group_id: groupId }).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      teacher_id: teacherId,
      evaluation_id: evaluationId,
      student_id: studentId,
      group_id: groupId,
    })
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

/** Finds the group by name for this teacher, or creates it. */
export async function findOrCreateGroup(
  supabase: SupabaseClient<Database>,
  teacherId: string,
  name: string,
) {
  const { data, error } = await supabase
    .from("groups")
    .upsert({ teacher_id: teacherId, name: name.trim() }, { onConflict: "teacher_id,name" })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("group not created");
  return data.id;
}
