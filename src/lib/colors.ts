// Ten fixed section colors. Class names are written in full so Tailwind keeps
// them in the build.
export const SECTION_COLORS = {
  red: { label: "Rojo", dot: "bg-red-500", header: "bg-red-100 text-red-950", border: "border-red-300" },
  orange: { label: "Naranja", dot: "bg-orange-500", header: "bg-orange-100 text-orange-950", border: "border-orange-300" },
  amber: { label: "Ámbar", dot: "bg-amber-500", header: "bg-amber-100 text-amber-950", border: "border-amber-300" },
  green: { label: "Verde", dot: "bg-green-500", header: "bg-green-100 text-green-950", border: "border-green-300" },
  teal: { label: "Turquesa", dot: "bg-teal-500", header: "bg-teal-100 text-teal-950", border: "border-teal-300" },
  sky: { label: "Cielo", dot: "bg-sky-500", header: "bg-sky-100 text-sky-950", border: "border-sky-300" },
  blue: { label: "Azul", dot: "bg-blue-500", header: "bg-blue-100 text-blue-950", border: "border-blue-300" },
  violet: { label: "Violeta", dot: "bg-violet-500", header: "bg-violet-100 text-violet-950", border: "border-violet-300" },
  pink: { label: "Rosa", dot: "bg-pink-500", header: "bg-pink-100 text-pink-950", border: "border-pink-300" },
  slate: { label: "Gris", dot: "bg-slate-500", header: "bg-slate-100 text-slate-950", border: "border-slate-300" },
} as const;

export type SectionColor = keyof typeof SECTION_COLORS;

export const SECTION_COLOR_KEYS = Object.keys(SECTION_COLORS) as SectionColor[];

export function sectionColor(color: string) {
  return SECTION_COLORS[color as SectionColor] ?? SECTION_COLORS.slate;
}
