import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";

import "./globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Evaluación Oral",
  description: "Evaluaciones orales para primaria",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="bg-muted/30 flex min-h-full flex-col text-base">
        {user ? <SiteHeader email={user.email ?? ""} /> : null}
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">{children}</main>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
