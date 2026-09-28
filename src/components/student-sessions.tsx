"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Row = {
  id: string;
  title: string;
  groupName: string;
  status: string;
  appliedAt: string;
  correct: number;
  total: number;
};

export function StudentSessions({ rows }: { rows: Row[] }) {
  const router = useRouter();

  async function remove(id: string) {
    const { error } = await createClient().from("sessions").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo borrar la sesión.");
      return;
    }
    toast.success("Sesión borrada.");
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center">
        Este alumno todavía no tiene evaluaciones aplicadas.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <Card key={row.id}>
          <CardContent className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <Link href={`/sesiones/${row.id}`} className="text-lg font-medium underline-offset-4 hover:underline">
                {row.title}
              </Link>
              <p className="text-muted-foreground text-sm">
                {row.groupName} ·{" "}
                {new Date(row.appliedAt).toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <span className="text-lg font-semibold">
              {row.correct} de {row.total}
            </span>
            <Badge variant={row.status === "completed" ? "default" : "secondary"}>
              {row.status === "completed" ? "Terminada" : "En progreso"}
            </Badge>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive">
                  Borrar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Borrar esta sesión?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se borran también las respuestas guardadas. No se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove(row.id)}>Borrar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
