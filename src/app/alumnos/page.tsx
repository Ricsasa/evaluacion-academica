import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function StudentsPage() {
  const supabase = await createClient();
  const [{ data: students }, { data: sessions }] = await Promise.all([
    supabase.from("students").select("id, name").order("name"),
    supabase.from("sessions").select("id, student_id"),
  ]);

  const counts = new Map<string, number>();
  for (const session of sessions ?? []) {
    counts.set(session.student_id, (counts.get(session.student_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Alumnos</h1>

      {(students ?? []).length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">
          Los alumnos aparecen aquí cuando aplicas una evaluación.
        </p>
      ) : null}

      <div className="space-y-2">
        {(students ?? []).map((student) => (
          <Card key={student.id}>
            <CardContent>
              <Link href={`/alumnos/${student.id}`} className="flex items-center justify-between">
                <span className="text-lg font-medium">{student.name}</span>
                <span className="text-muted-foreground">
                  {counts.get(student.id) ?? 0} evaluaciones
                </span>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
