export const dynamic = "force-dynamic";

import { Suspense } from "react";
import RouteScoreClient from "./routescore-client";

export default function RouteScorePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-purple-50 flex items-center justify-center">
          <p className="text-gray-600">Calculating route safety…</p>
        </div>
      }
    >
      <RouteScoreClient />
    </Suspense>
  );
}
