"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QuickSOSButton from "../components/QuickSOSButton";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const last = localStorage.getItem("saferher_last_query");
    if (last) setQuery(last);
  }, []);

  const canSearch = useMemo(() => query.trim().length > 0, [query]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      alert("Please enter a destination.");
      return;
    }

    localStorage.setItem("saferher_last_query", q);
    setLoading(true);

    try {
      router.push(`/routescore?query=${encodeURIComponent(q)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-purple-600 font-semibold">
              SafeHER
            </p>
            <h1 className="mt-1 text-3xl sm:text-4xl font-semibold text-gray-900">
              Where are you going?
            </h1>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Plan safer walks with routes, alerts, and stories from women nearby.
            </p>
          </div>

          <div className="hidden sm:flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
              <span className="text-xl">💜</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-purple-100 px-6 sm:px-8 py-7 sm:py-9">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-purple-500">
                📍
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a street, area, or destination..."
                className="w-full pl-11 pr-4 py-4 rounded-2xl border border-purple-100 bg-purple-50/60 text-sm sm:text-base
                           focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !canSearch}
              className="sm:w-[140px] px-6 py-4 rounded-2xl bg-purple-600 text-white font-medium
                         hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? "Analyzing…" : "Search"}
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-7">
            <Link href="/sos" className="rounded-2xl bg-purple-600 text-white p-5">
              <p className="text-xs uppercase tracking-wide opacity-90">SOS</p>
              <p className="text-lg font-semibold mt-1">Quick alert</p>
            </Link>

            <Link href="/stories" className="rounded-2xl bg-purple-50 p-5">
              <p className="text-xs uppercase tracking-wide text-purple-700">Stories</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">Read & share</p>
            </Link>

            <Link href="/heatmap" className="rounded-2xl bg-purple-50 p-5">
              <p className="text-xs uppercase tracking-wide text-purple-700">Safety Map</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">Explore areas</p>
            </Link>

            <Link href="/assistant" className="rounded-2xl bg-purple-50 p-5">
              <p className="text-xs uppercase tracking-wide text-purple-700">Assistant</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">Talk it out</p>
            </Link>
          </div>
        </div>

        <QuickSOSButton variant="floating" />
      </div>
    </div>
  );
}
