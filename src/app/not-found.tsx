import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">No encontramos esta página</h1>
      <p className="text-muted-foreground">
        El enlace no existe o pertenece a otra maestra.
      </p>
      <Button asChild size="lg">
        <Link href="/">Ir a mis evaluaciones</Link>
      </Button>
    </div>
  );
}
