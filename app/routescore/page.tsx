"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import RouteMap from "@/components/RouteMap";

interface SafetyData {
  score?: number;
  level?: string;
  lighting?: string;
  incidents?: string;
  visibility?: string;
  explanation?: string;
  error?: string;
  geometry?: any;
  start?: { lat: number; lng: number };
  end?: { lat: number; lng: number };
}

function RouteScoreContent() {
  const params = useSearchParams();
  const [data, setData] = useState<SafetyData | null>(null);

  // Load JSON from URL
  useEffect(() => {
    const raw = params.get("data");
    if (!raw) return;

    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      console.log("📊 Route score data loaded:", parsed);
      
      // Ensure default values for missing fields
      const safeData = {
        score: parsed.score ?? 50,
        level: parsed.level ?? "medium risk",
        lighting: parsed.lighting ?? "medium",
        incidents: parsed.incidents ?? "medium", 
        visibility: parsed.visibility ?? "medium",
        explanation: parsed.explanation ?? "Route safety analysis completed",
        ...parsed
      };
      
      setData(safeData);
    } catch (e) {
      console.error("❌ Failed to parse route score:", e);
      setData({ error: "Invalid route score data." });
    }
  }, [params]);

  // Loading State
  if (!data) {
    return (
      <div className="min-h-screen bg-[#faf5ff] flex items-center justify-center">
        <p className="text-purple-600 animate-pulse text-lg">Analyzing route…</p>
      </div>
    );
  }

  // ❌ Error State
  if (data.error) {
    return (
      <div className="min-h-screen bg-[#faf5ff] flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md text-center">
          <p className="text-red-600 font-semibold text-lg">Route analysis failed</p>
          <p className="text-gray-600 mt-2">{data.error}</p>

          <button
            onClick={() => history.back()}
            className="mt-6 w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf5ff] flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-md p-8">

        {/* Safety Score */}
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex flex-col justify-center items-center text-white shadow-lg">
            <p className="text-4xl font-bold">{data.score ?? "--"}</p>
            <p className="text-sm opacity-80">/100</p>
          </div>

          <h2 className="mt-4 text-2xl font-semibold text-[#2b2b2b]">
            {data.level ?? "Unknown safety level"}
          </h2>
          <p className="text-gray-500 mt-2 text-[15px] max-w-md leading-relaxed">
            {data.explanation ?? "AI was unable to provide an explanation."}
          </p>
        </div>

        {/* Risk Breakdown */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold text-[#333] mb-4">Risk Breakdown</h3>

          <RiskRow label="Street Lighting" value={data.lighting} />
          <RiskRow label="Past Incidents" value={data.incidents} />
          <RiskRow label="Visibility" value={data.visibility} />
        </div>

        {/* Interactive Route Map */}
        {data?.geometry && data?.start && data?.end ? (
          <RouteMap
            route={{
              start: { lat: data.start.lat, lng: data.start.lng },
              end: { lat: data.end.lat, lng: data.end.lng },
              geometry: data.geometry,
            }}
          />
        ) : (
          <div className="mt-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl h-56 flex items-center justify-center relative border border-purple-200">
            <p className="text-purple-700 text-sm opacity-80">Map preview coming soon</p>
            <div className="absolute top-10 left-10 w-4 h-4 bg-purple-600 rounded-full"></div>
            <div className="absolute bottom-10 right-12 w-4 h-4 bg-pink-500 rounded-full"></div>
          </div>
        )}

        <button className="w-full mt-8 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-lg font-semibold transition">
          Try a safer route instead
        </button>
      </div>
    </div>
  );
}

/** Risk item component with safe colorize */
function RiskRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between bg-purple-50 p-4 rounded-xl">
      <span className="text-gray-700 font-medium">{label}</span>
      <span className="font-semibold capitalize">
        {safeColorize(value)}
      </span>
    </div>
  );
}

/** Prevent crashes if value is undefined */
function safeColorize(value?: string) {
  const safeValue = value?.toLowerCase() ?? "medium";
  
  if (safeValue === "low") return <span className="text-green-600">{value || "Low"}</span>;
  if (safeValue === "medium") return <span className="text-yellow-600">{value || "Medium"}</span>;
  if (safeValue === "high") return <span className="text-red-600">{value || "High"}</span>;

  return <span className="text-gray-600">{value || "Medium"}</span>;
}

export default function RouteScorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#faf5ff] flex items-center justify-center">
        <p className="text-purple-600 animate-pulse text-lg">Loading route analysis...</p>
      </div>
    }>
      <RouteScoreContent />
    </Suspense>
  );
}
