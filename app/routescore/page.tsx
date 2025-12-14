"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type ContextSignal = {
  label: string;
  level: string;
  note: string;
};

export default function RouteScorePage() {
  const params = useSearchParams();
  const destinationQuery = params.get("query") || "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function run() {
      let gps_start = null;
      let home_start = null;

      // Try GPS
      if ("geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
          );
          gps_start = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
        } catch {}
      }

      // Fallback to saved home
      if (!gps_start) {
        const home = localStorage.getItem("safeher_home_location");
        if (home) home_start = JSON.parse(home);
      }

      const res = await fetch("/api/routescore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destinationQuery,
          gps_start,
          home_start,
        }),
      });

      const json = await res.json();
      setData(json);
      setLoading(false);
    }

    run();
  }, [destinationQuery]);

  if (loading) return <p className="p-10">Analyzing route safety…</p>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-sm text-purple-600 hover:underline">
          ← Back home
        </Link>

        <h1 className="text-3xl font-semibold mt-6">How safe is this route?</h1>
        <p className="mt-2 text-lg font-semibold">{data.destination}</p>

        <p className="mt-4 text-4xl font-bold text-purple-700">
          {data.safety_score}/100
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {data.risk_level} risk
        </p>

        <p className="text-sm text-gray-500 mt-2">
          Start location:{" "}
          <strong>
            {data.start_used.source === "gps"
              ? "Your current location (GPS)"
              : data.start_used.source === "home"
              ? "Your saved home reference"
              : "Default city reference"}
          </strong>
        </p>

        {/* Risk Breakdown (existing UI structure) */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Risk Breakdown</h3>

          <div className="space-y-2">
            {data.contextual_signals.map((s: ContextSignal, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center bg-purple-50 px-4 py-3 rounded-xl"
              >
                <span>{s.label}</span>
                <span className="font-medium">{s.level}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-500 mt-4">
          Analysis is based on public context signals, urban design heuristics, and AI reasoning.
          Community reports will enhance accuracy as usage grows.
        </p>

        <div className="mt-6 flex gap-3">
          <Link href="/assistant" className="px-4 py-2 bg-purple-600 text-white rounded-xl">
            Ask Assistant
          </Link>
          <Link href="/sos" className="px-4 py-2 border rounded-xl">
            SOS Mode
          </Link>
        </div>
      </div>
    </div>
  );
}
