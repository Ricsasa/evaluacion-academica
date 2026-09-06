"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_DOMAIN = "@institutocolon.mx";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (mode === "signup" && !email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      setError(`Usa tu correo ${ALLOWED_DOMAIN}`);
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const credentials = { email: email.trim(), password };
    const { data, error: authError } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setBusy(false);

    if (authError) {
      setError(
        authError.code === "email_not_confirmed"
          ? "Tu cuenta todavía no está confirmada. Pide que la activen."
          : mode === "signin"
            ? "Correo o contraseña incorrectos."
            : `No se pudo crear la cuenta. Revisa que uses tu correo ${ALLOWED_DOMAIN}.`,
      );
      return;
    }

    // Signup answers without a session when the project asks for email
    // confirmation. Without this the screen would look like nothing happened.
    if (!data.session) {
      setError("Cuenta creada. Falta confirmarla antes de entrar.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Evaluación Oral</CardTitle>
          <CardDescription>
            {mode === "signin" ? "Entra con tu cuenta." : `Crea tu cuenta con tu correo ${ALLOWED_DOMAIN}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">
                Correo
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="h-12 text-base"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="h-12 text-base"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? <p className="text-destructive text-sm">{error}</p> : null}

            <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy}>
              {mode === "signin" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>

          <Button
            variant="link"
            className="mt-2 w-full"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
            }}
          >
            {mode === "signin" ? "No tengo cuenta" : "Ya tengo cuenta"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
