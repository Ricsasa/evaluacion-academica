import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NO_GROUP, NO_GROUP_NAME } from "@/lib/groups";
import { createClient } from "@/lib/supabase/server";

export default async function GroupReportPage({ params }: PageProps<"/reportes/[grupo]">) {
  const { grupo } = await params;
  const supabase = await createClient();

  const sessionsQuery = supabase.from("sessions").select("student_id, students (name)");
  const [{ data: group }, { data: sessions }] = await Promise.all([
    grupo === NO_GROUP
      ? Promise.resolve({ data: { name: NO_GROUP_NAME } })
      : supabase.from("groups").select("name").eq("id", grupo).maybeSingle(),
    grupo === NO_GROUP ? sessionsQuery.is("group_id", null) : sessionsQuery.eq("group_id", grupo),
  ]);

  if (!group) notFound();

  const students = new Map<string, { name: string; count: number }>();
  for (const session of sessions ?? []) {
    const student = students.get(session.student_id) ?? {
      name: session.students?.name ?? "",
      count: 0,
    };
    student.count += 1;
    students.set(session.student_id, student);
  }
  const list = [...students].sort(([, a], [, b]) => a.name.localeCompare(b.name, "es"));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <Button asChild variant="outline" size="lg">
          <Link href="/reportes">Volver</Link>
        </Button>
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">
          Este grupo todavía no tiene alumnos evaluados.
        </p>
      ) : null}

      <div className="space-y-2">
        {list.map(([id, student]) => (
          <Card key={id}>
            <CardContent>
              <Link href={`/alumnos/${id}`} className="flex items-center justify-between">
                <span className="text-lg font-medium">{student.name}</span>
                <span className="text-muted-foreground">{student.count} evaluaciones</span>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
