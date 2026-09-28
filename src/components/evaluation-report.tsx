"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sectionColor } from "@/lib/colors";
import { downloadCsv } from "@/lib/csv";
import { percent, type Score } from "@/lib/scores";
import { cn } from "@/lib/utils";

type Row = {
  sessionId: string;
  studentName: string;
  groupName: string;
  status: string;
  perSection: Score[];
  total: Score;
};

export function EvaluationReport({
  title,
  groups,
  selectedGroup,
  sections,
  rows,
}: {
  title: string;
  groups: { id: string; name: string }[];
  selectedGroup: string | null;
  sections: { id: string; title: string; color: string }[];
  rows: Row[];
}) {
  const pathname = usePathname();
  const completed = rows.filter((row) => row.status === "completed").length;
  const groupName = groups.find((group) => group.id === selectedGroup)?.name;

  function exportCsv() {
    const header = ["Alumno", "Grupo", "Estado", ...sections.map((section) => section.title), "Total"];
    const body = rows.map((row) => [
      row.studentName,
      row.groupName,
      row.status === "completed" ? "Terminada" : "En progreso",
      ...row.perSection.map((score) => `${score.correct}/${score.total}`),
      `${row.total.correct}/${row.total.total}`,
    ]);
    const name = groupName ? `${title} ${groupName}` : title;
    downloadCsv(`${name.replaceAll(" ", "_")}.csv`, [header, ...body]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-muted-foreground">{groupName ?? "Todos los grupos"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={exportCsv}>
            Exportar CSV
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Volver</Link>
          </Button>
        </div>
      </div>

      {groups.length > 1 ? (
        <nav className="flex flex-wrap gap-2" aria-label="Filtrar por grupo">
          {[{ id: null, name: "Todos" }, ...groups].map((group) => (
            <Button
              key={group.id ?? "todos"}
              asChild
              size="lg"
              variant={group.id === selectedGroup ? "default" : "outline"}
              className="text-base"
            >
              <Link href={group.id ? `${pathname}?grupo=${group.id}` : pathname}>{group.name}</Link>
            </Button>
          ))}
        </nav>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-3 gap-4 text-center">
          <Stat label="Alumnos" value={rows.length} />
          <Stat label="Terminadas" value={completed} />
          <Stat label="En progreso" value={rows.length - completed} />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">
          Esta evaluación todavía no se ha aplicado.
        </p>
      ) : (
        <Tabs defaultValue="alumnos">
          <TabsList className="h-12">
            <TabsTrigger value="alumnos" className="text-base">
              Por alumno
            </TabsTrigger>
            <TabsTrigger value="secciones" className="text-base">
              Por sección
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alumnos">
            <Card>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alumno</TableHead>
                      {sections.map((section) => (
                        <TableHead key={section.id}>{section.title}</TableHead>
                      ))}
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.sessionId}>
                        <TableCell>
                          <Link
                            href={`/sesiones/${row.sessionId}`}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {row.studentName}
                          </Link>
                          {row.status === "completed" ? null : (
                            <span className="text-muted-foreground block text-xs">En progreso</span>
                          )}
                        </TableCell>
                        {row.perSection.map((score, index) => (
                          <TableCell key={sections[index].id}>
                            {score.correct}/{score.total}
                          </TableCell>
                        ))}
                        <TableCell className="font-semibold">
                          {row.total.correct}/{row.total.total} ({percent(row.total)}%)
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="secciones" className="space-y-3">
            {sections.map((section, index) => {
              const colors = sectionColor(section.color);
              const scores = rows.map((row) => row.perSection[index]);
              const correct = scores.reduce((sum, score) => sum + score.correct, 0);
              const total = scores.reduce((sum, score) => sum + score.total, 0);

              return (
                <Card key={section.id} className={cn("border-2", colors.border)}>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-xl font-semibold">{section.title}</h2>
                      <span className="text-lg">
                        Total: {correct} de {total} ({percent({ correct, total, manual: false })}%)
                      </span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Alumno</TableHead>
                          <TableHead>Puntaje</TableHead>
                          <TableHead>%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.sessionId}>
                            <TableCell>{row.studentName}</TableCell>
                            <TableCell>
                              {row.perSection[index].correct}/{row.perSection[index].total}
                            </TableCell>
                            <TableCell>{percent(row.perSection[index])}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}
