"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SECTION_COLORS, SECTION_COLOR_KEYS, sectionColor, type SectionColor } from "@/lib/colors";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Item = { id: string; content: string; position: number };
type SectionColumns = { title?: string; color?: string; notes?: string | null };
type Section = {
  id: string;
  title: string;
  color: string;
  notes: string | null;
  position: number;
  items: Item[];
};

const supabase = createClient();

function reportError() {
  toast.error("No se pudo guardar el cambio.");
}

export function EvaluationEditor({
  evaluation,
  initialSections,
  hasSessions,
}: {
  evaluation: { id: string; title: string };
  initialSections: Section[];
  hasSessions: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(evaluation.title);
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [busy, setBusy] = useState(false);

  async function saveEvaluation() {
    const { error } = await supabase
      .from("evaluations")
      .update({ title: title.trim() })
      .eq("id", evaluation.id);
    if (error) reportError();
  }

  async function addSection() {
    const color = SECTION_COLOR_KEYS[sections.length % SECTION_COLOR_KEYS.length];
    const { data, error } = await supabase
      .from("sections")
      .insert({
        evaluation_id: evaluation.id,
        title: "Nueva sección",
        color,
        position: sections.length,
      })
      .select("id, title, color, notes, position")
      .single();
    if (error || !data) return reportError();
    setSections([...sections, { ...data, items: [] }]);
  }

  /** Updates the screen only. The save button and the blur handler persist it. */
  function patchSection(id: string, patch: SectionColumns) {
    setSections((current) =>
      current.map((section) => (section.id === id ? { ...section, ...patch } : section)),
    );
  }

  async function saveSection(id: string, patch: SectionColumns) {
    patchSection(id, patch);
    const { error } = await supabase.from("sections").update(patch).eq("id", id);
    if (error) reportError();
  }

  async function removeSection(id: string) {
    setSections((current) => current.filter((section) => section.id !== id));
    const { error } = await supabase.from("sections").delete().eq("id", id);
    if (error) reportError();
  }

  async function addItem(sectionId: string, content: string) {
    const section = sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const { data, error } = await supabase
      .from("items")
      .insert({ section_id: sectionId, content, position: section.items.length })
      .select("id, content, position")
      .single();
    if (error || !data) return reportError();
    setSections((current) =>
      current.map((candidate) =>
        candidate.id === sectionId ? { ...candidate, items: [...candidate.items, data] } : candidate,
      ),
    );
  }

  function patchItem(sectionId: string, itemId: string, content: string) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) => (item.id === itemId ? { ...item, content } : item)),
            }
          : section,
      ),
    );
  }

  async function saveItem(sectionId: string, itemId: string, content: string) {
    patchItem(sectionId, itemId, content);
    const { error } = await supabase.from("items").update({ content }).eq("id", itemId);
    if (error) reportError();
  }

  async function removeItem(sectionId: string, itemId: string) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
          : section,
      ),
    );
    const { error } = await supabase.from("items").delete().eq("id", itemId);
    if (error) reportError();
  }

  /** Writes the whole evaluation again, so the teacher gets one clear save. */
  async function saveAll() {
    setBusy(true);
    const results = await Promise.all([
      supabase
        .from("evaluations")
        .update({ title: title.trim() })
        .eq("id", evaluation.id),
      ...sections.map((section) =>
        supabase
          .from("sections")
          .update({
            title: section.title.trim(),
            color: section.color,
            notes: section.notes?.trim() || null,
            position: section.position,
          })
          .eq("id", section.id),
      ),
      ...sections.flatMap((section) =>
        section.items.map((item) =>
          supabase.from("items").update({ content: item.content.trim() }).eq("id", item.id),
        ),
      ),
    ]);
    setBusy(false);

    if (results.some((result) => result.error)) {
      toast.error("No se pudo guardar todo. Revisa la conexión.");
      return false;
    }
    return true;
  }

  async function save() {
    if (await saveAll()) toast.success("Cambios guardados.");
  }

  async function finish() {
    if (!(await saveAll())) return;
    toast.success("Evaluación guardada.");
    router.push("/");
  }

  return (
    <div className="space-y-4 pb-24">
      <h1 className="text-2xl font-semibold">Editar evaluación</h1>

      {hasSessions ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
          Esta evaluación ya tiene sesiones aplicadas. Los cambios no modifican las respuestas ya
          guardadas, pero pueden dejar diferencias entre las sesiones viejas y las nuevas.
        </p>
      ) : null}

      <Card>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="evaluation-title">Título</Label>
            <Input
              id="evaluation-title"
              className="h-12 text-base"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={saveEvaluation}
            />
          </div>
        </CardContent>
      </Card>

      {sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          onPatch={(patch) => patchSection(section.id, patch)}
          onSave={(patch) => saveSection(section.id, patch)}
          onRemove={() => removeSection(section.id)}
          onAddItem={(content) => addItem(section.id, content)}
          onPatchItem={(itemId, content) => patchItem(section.id, itemId, content)}
          onSaveItem={(itemId, content) => saveItem(section.id, itemId, content)}
          onRemoveItem={(itemId) => removeItem(section.id, itemId)}
        />
      ))}

      <Button variant="outline" size="lg" className="h-14 w-full text-base" onClick={addSection}>
        Agregar sección
      </Button>

      <div className="bg-background sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t p-3">
        <span className="text-muted-foreground">
          {sections.length} secciones ·{" "}
          {sections.reduce((count, section) => count + section.items.length, 0)} preguntas
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="h-14 px-6 text-base" disabled={busy} onClick={save}>
            Guardar
          </Button>
          <Button size="lg" className="h-14 px-8 text-base" disabled={busy} onClick={finish}>
            Finalizar
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  section,
  onPatch,
  onSave,
  onRemove,
  onAddItem,
  onPatchItem,
  onSaveItem,
  onRemoveItem,
}: {
  section: Section;
  onPatch: (patch: SectionColumns) => void;
  onSave: (patch: SectionColumns) => void;
  onRemove: () => void;
  onAddItem: (content: string) => void;
  onPatchItem: (itemId: string, content: string) => void;
  onSaveItem: (itemId: string, content: string) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const colors = sectionColor(section.color);

  return (
    <Card className={cn("gap-0 border-2 pt-0", colors.border)}>
      <CardHeader className={cn("gap-3 py-4", colors.header)}>
        <Input
          className="h-12 border-transparent bg-white/70 text-lg font-semibold"
          value={section.title}
          onChange={(event) => onPatch({ title: event.target.value })}
          onBlur={() => onSave({ title: section.title.trim() })}
        />
        <div className="flex flex-wrap items-center gap-2">
          {SECTION_COLOR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={SECTION_COLORS[key].label}
              onClick={() => onSave({ color: key as SectionColor })}
              className={cn(
                "size-9 rounded-full border-2 border-white",
                SECTION_COLORS[key].dot,
                section.color === key && "ring-foreground ring-2 ring-offset-2",
              )}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        <div className="space-y-2">
          <Label htmlFor={`notes-${section.id}`}>Notas de la sección (opcional)</Label>
          <Textarea
            id={`notes-${section.id}`}
            className="min-h-24 text-base"
            placeholder="Por ejemplo, el texto de la lectura."
            value={section.notes ?? ""}
            onChange={(event) => onPatch({ notes: event.target.value })}
            onBlur={() => onSave({ notes: section.notes?.trim() || null })}
          />
        </div>

        <ul className="space-y-2">
          {section.items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-2">
              <span className="text-muted-foreground w-6 text-right">{index + 1}.</span>
              <Input
                className="h-12 flex-1 text-base"
                value={item.content}
                onChange={(event) => onPatchItem(item.id, event.target.value)}
                onBlur={() => onSaveItem(item.id, item.content.trim())}
              />
              <Button
                variant="ghost"
                size="lg"
                aria-label="Quitar pregunta"
                onClick={() => onRemoveItem(item.id)}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = draft.trim();
            if (!value) return;
            onAddItem(value);
            setDraft("");
          }}
        >
          <Input
            className="h-12 flex-1 text-base"
            placeholder="Escribe una pregunta y presiona Enter"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" size="lg">
            Agregar
          </Button>
        </form>

        <Button variant="ghost" className="text-destructive" onClick={onRemove}>
          Eliminar sección
        </Button>
      </CardContent>
    </Card>
  );
}
