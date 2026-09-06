"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { findOrCreateStudent, startSession } from "@/lib/start-session";
import { toast } from "sonner";

const DEBOUNCE_MS = 250;
const MAX_RESULTS = 8;

/** Matches how the database stores search_name: no accents, lower case. */
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

type Student = { id: string; name: string };

export function StartSessionDialog({
  teacherId,
  evaluationId,
}: {
  teacherId: string;
  evaluationId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [found, setFound] = useState<{ query: string; students: Student[] }>({
    query: "",
    students: [],
  });
  const [busy, setBusy] = useState(false);

  const query = normalize(name);

  useEffect(() => {
    if (!open || query.length === 0) return;

    let current = true;
    const timer = setTimeout(async () => {
      const { data } = await createClient()
        .from("students")
        .select("id, name")
        .ilike("search_name", `%${query}%`)
        .order("name")
        .limit(MAX_RESULTS);

      if (current) setFound({ query, students: data ?? [] });
    }, DEBOUNCE_MS);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  const searching = query.length > 0 && found.query !== query;
  const results = searching || query.length === 0 ? [] : found.students;
  const exact = results.some((student) => normalize(student.name) === query);
  const isNew = query.length > 0 && !searching && results.length === 0;
  // With matches on screen, the teacher picks one instead of creating a name
  // that only differs by a word.
  const canSubmit = query.length > 0 && !searching && (exact || results.length === 0);

  async function start(studentName: string) {
    setBusy(true);
    try {
      const supabase = createClient();
      const studentId = await findOrCreateStudent(supabase, teacherId, studentName);
      const sessionId = await startSession(supabase, teacherId, evaluationId, studentId);
      router.push(`/sesiones/${sessionId}`);
    } catch {
      toast.error("No se pudo iniciar la evaluación.");
      setBusy(false);
    }
  }

  function reset(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setName("");
      setFound({ query: "", students: [] });
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button size="lg">Aplicar</Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            start(name);
          }}
        >
          <DialogHeader>
            <DialogTitle>Aplicar evaluación</DialogTitle>
            <DialogDescription>
              Escribe el nombre del alumno. Si ya existe, aparece abajo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Label htmlFor="student">Alumno</Label>
            <Input
              id="student"
              required
              autoFocus
              autoComplete="off"
              className="h-12 text-base"
              placeholder="Buscar o escribir un nombre"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <div className="max-h-[40vh] space-y-2 overflow-y-auto">
              {results.map((student) => (
                <Button
                  key={student.id}
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={busy}
                  className="h-12 w-full justify-start text-base"
                  onClick={() => start(student.name)}
                >
                  {student.name}
                </Button>
              ))}

              {searching ? <p className="text-muted-foreground text-sm">Buscando…</p> : null}

              {isNew ? (
                <p className="text-muted-foreground text-sm">
                  Ningún alumno con ese nombre. Se va a crear uno nuevo.
                </p>
              ) : null}

              {results.length > 0 && !exact ? (
                <p className="text-muted-foreground text-sm">
                  Toca el nombre del alumno, o sigue escribiendo si es otro.
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" size="lg" disabled={busy || !canSubmit}>
              {isNew ? "Crear y empezar" : "Empezar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
