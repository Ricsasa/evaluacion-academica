"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/**
 * Picks a group by name. A new name creates the group when the session starts.
 * The first choice is the group of the last session: the one of this student
 * when studentId is given, otherwise the last one the teacher applied.
 */
export function GroupPicker({
  studentId,
  value,
  onChange,
}: {
  studentId?: string;
  value: string;
  onChange: (name: string) => void;
}) {
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let current = true;
    (async () => {
      const supabase = createClient();
      let last = supabase
        .from("sessions")
        .select("groups (name)")
        .not("group_id", "is", null)
        .order("applied_at", { ascending: false })
        .limit(1);
      if (studentId) last = last.eq("student_id", studentId);

      const [{ data: list }, { data: lastSession }] = await Promise.all([
        supabase.from("groups").select("id, name").order("name"),
        last.maybeSingle(),
      ]);
      if (!current) return;

      setGroups(list ?? []);
      const lastName = lastSession?.groups?.name;
      if (lastName) onChange(lastName);
      else if (!list?.length) setAdding(true);
    })();
    return () => {
      current = false;
    };
    // onChange only sets the first choice; the load runs once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  return (
    <div className="space-y-2">
      <Label>Grupo</Label>
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <Button
            key={group.id}
            type="button"
            size="lg"
            variant={!adding && value === group.name ? "default" : "outline"}
            className="h-12 min-w-20 text-base"
            onClick={() => {
              setAdding(false);
              onChange(group.name);
            }}
          >
            {group.name}
          </Button>
        ))}
        <Button
          type="button"
          size="lg"
          variant={adding ? "default" : "outline"}
          className="h-12 text-base"
          onClick={() => {
            setAdding(true);
            onChange("");
          }}
        >
          + Nuevo grupo
        </Button>
      </div>
      {adding ? (
        <Input
          aria-label="Nombre del grupo nuevo"
          autoComplete="off"
          className="h-12 text-base"
          placeholder="3° A"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}
    </div>
  );
}
