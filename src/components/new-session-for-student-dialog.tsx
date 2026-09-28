"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { GroupPicker } from "@/components/group-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { findOrCreateGroup, startSession } from "@/lib/start-session";
import { toast } from "sonner";

export function NewSessionForStudentDialog({
  teacherId,
  studentId,
  evaluations,
}: {
  teacherId: string;
  studentId: string;
  evaluations: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(evaluationId: string) {
    setBusy(true);
    try {
      const supabase = createClient();
      const groupId = await findOrCreateGroup(supabase, teacherId, group);
      const sessionId = await startSession(supabase, teacherId, evaluationId, studentId, groupId);
      router.push(`/sesiones/${sessionId}`);
    } catch {
      toast.error("No se pudo iniciar la evaluación.");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">Nueva evaluación</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elige la evaluación</DialogTitle>
          <DialogDescription>Elige el grupo y la evaluación para este alumno.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <GroupPicker studentId={studentId} value={group} onChange={setGroup} />
          {evaluations.length === 0 ? (
            <p className="text-muted-foreground">Todavía no tienes evaluaciones.</p>
          ) : null}
          {evaluations.map((evaluation) => (
            <Button
              key={evaluation.id}
              variant="outline"
              size="lg"
              disabled={busy || !group.trim()}
              className="h-14 w-full justify-start text-base"
              onClick={() => start(evaluation.id)}
            >
              {evaluation.title}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
