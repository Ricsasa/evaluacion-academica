"use client";

import { useState } from "react";

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
import type { Score } from "@/lib/scores";

export function ScoreOverrideDialog({
  score,
  onSave,
  onClear,
}: {
  score: Score;
  onSave: (correct: number, total: number) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [correct, setCorrect] = useState(String(score.correct));
  const [total, setTotal] = useState(String(score.total));

  function openChange(next: boolean) {
    if (next) {
      setCorrect(String(score.correct));
      setTotal(String(score.total));
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="bg-white/70 text-lg">
          {score.correct} de {score.total}
          {score.manual ? " ·  manual" : ""}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Puntaje de la sección</DialogTitle>
          <DialogDescription>
            El puntaje se calcula solo. Cámbialo aquí si quieres otro valor.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-end gap-3 py-4">
          <div className="space-y-2">
            <Label htmlFor="correct">Aciertos</Label>
            <Input
              id="correct"
              type="number"
              min={0}
              inputMode="numeric"
              className="h-12 w-24 text-base"
              value={correct}
              onChange={(event) => setCorrect(event.target.value)}
            />
          </div>
          <span className="pb-3 text-lg">de</span>
          <div className="space-y-2">
            <Label htmlFor="total">Total</Label>
            <Input
              id="total"
              type="number"
              min={0}
              inputMode="numeric"
              className="h-12 w-24 text-base"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {score.manual ? (
            <Button
              variant="ghost"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              Usar el automático
            </Button>
          ) : (
            <span />
          )}
          <Button
            size="lg"
            onClick={() => {
              const correctValue = Math.max(0, Number(correct) || 0);
              const totalValue = Math.max(correctValue, Number(total) || 0);
              onSave(correctValue, totalValue);
              setOpen(false);
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
