export const dynamic = "force-dynamic";

import { Suspense } from "react";
import RouteAlternativesClient from "./route-alternatives-client";

export default function RouteAlternativesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-purple-50 flex items-center justify-center">
          <p className="text-gray-600">Loading safer route analysis…</p>
        </div>
      }
    >
      <RouteAlternativesClient />
    </Suspense>
  );
}
