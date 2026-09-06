"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Evaluaciones" },
  { href: "/alumnos", label: "Alumnos" },
];

export function SiteHeader({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-background sticky top-0 z-10 border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 p-3">
        <nav className="flex flex-1 gap-1">
          {LINKS.map((link) => (
            <Button
              key={link.href}
              asChild
              variant="ghost"
              size="lg"
              className={cn(
                "text-base",
                pathname === link.href && "bg-accent text-accent-foreground",
              )}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>
        <span className="text-muted-foreground hidden text-sm sm:inline">{email}</span>
        <Button variant="outline" size="lg" onClick={signOut}>
          Salir
        </Button>
      </div>
    </header>
  );
}
