import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { NO_GROUP, NO_GROUP_NAME } from "@/lib/groups";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("student_id, group_id, groups (name)");

  // A student belongs to every group where they have a session.
  const groups = new Map<string, { name: string; students: Set<string> }>();
  for (const session of sessions ?? []) {
    const key = session.group_id ?? NO_GROUP;
    const group = groups.get(key) ?? {
      name: session.groups?.name ?? NO_GROUP_NAME,
      students: new Set<string>(),
    };
    group.students.add(session.student_id);
    groups.set(key, group);
  }
  const list = [...groups].sort(([a, x], [b, y]) =>
    a === NO_GROUP ? 1 : b === NO_GROUP ? -1 : x.name.localeCompare(y.name, "es"),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reportes</h1>

      {list.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">
          Los grupos aparecen aquí cuando aplicas una evaluación.
        </p>
      ) : null}

      <div className="space-y-2">
        {list.map(([id, group]) => (
          <Card key={id}>
            <CardContent>
              <Link href={`/reportes/${id}`} className="flex items-center justify-between">
                <span className="text-lg font-medium">{group.name}</span>
                <span className="text-muted-foreground">{group.students.size} alumnos</span>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
