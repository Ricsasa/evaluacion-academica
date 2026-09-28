"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function NewEvaluationDialog({ teacherId }: { teacherId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { data, error } = await createClient()
      .from("evaluations")
      .insert({ teacher_id: teacherId, title: title.trim() })
      .select("id")
      .single();
    setBusy(false);

    if (error || !data) {
      toast.error("No se pudo crear la evaluación.");
      return;
    }
    setOpen(false);
    router.push(`/evaluaciones/${data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">Nueva evaluación</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={create}>
          <DialogHeader>
            <DialogTitle>Nueva evaluación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                required
                autoFocus
                className="h-12 text-base"
                placeholder="Primer trimestre"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" size="lg" disabled={busy}>
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
