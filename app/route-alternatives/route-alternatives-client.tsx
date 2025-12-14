"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RouteAlternativesMap from "../../components/RouteAlternativesMap";
import RouteComparison from "../../components/RouteComparison";

export default function RouteAlternativesClient() {
  const searchParams = useSearchParams();
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dataParam = searchParams.get("data");

    if (dataParam) {
      try {
        setRouteData(JSON.parse(decodeURIComponent(dataParam)));
      } catch {
        setError("Invalid route data");
      }
      setLoading(false);
      return;
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      setError("Missing route parameters");
      setLoading(false);
      return;
    }

    fetch("/api/route-alternatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start: parseCoords(from),
        end: parseCoords(to),
      }),
    })
      .then((res) => res.json())
      .then(setRouteData)
      .catch(() => setError("Failed to load routes"))
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <p>Analyzing safer routes…</p>
      </div>
    );
  }

  if (error || !routeData) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50 p-6">
      <RouteAlternativesMap
        safestRoute={routeData.safestRoute}
        alternativeRoutes={routeData.alternativeRoutes}
        start={routeData.start}
        end={routeData.end}
      />

      <RouteComparison
        safestRoute={routeData.safestRoute}
        alternativeRoutes={routeData.alternativeRoutes}
        explanation={routeData.explanation}
      />
    </div>
  );
}

function parseCoords(value: string) {
  const [lat, lng] = value.split(",").map(Number);
  return { lat, lng };
}
