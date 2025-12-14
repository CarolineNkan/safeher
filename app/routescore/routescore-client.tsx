"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function RouteScoreClient() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [risk, setRisk] = useState<string>("");

  useEffect(() => {
    const scoreParam = searchParams.get("score");
    const riskParam = searchParams.get("risk");

    if (scoreParam) {
      setScore(Number(scoreParam));
      setRisk(riskParam || "Medium");
    }

    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <p>Loading route score…</p>
      </div>
    );
  }

  if (score === null) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <p className="text-red-600">No route score available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50 px-6 py-10">
      <Link href="/" className="text-purple-600 hover:underline">
        ← Back home
      </Link>

      <h1 className="text-3xl font-bold mt-6">How safe is this route?</h1>

      <div className="mt-6">
        <p className="text-5xl font-bold text-purple-600">{score}/100</p>
        <p className="text-gray-600 mt-1">{risk} risk</p>
      </div>

      <div className="mt-8 flex gap-4">
        <Link
          href="/assistant"
          className="px-5 py-3 bg-purple-600 text-white rounded-xl"
        >
          Ask Assistant
        </Link>

        <Link
          href="/sos"
          className="px-5 py-3 border border-gray-300 rounded-xl"
        >
          SOS Mode
        </Link>
      </div>
    </div>
  );
}
