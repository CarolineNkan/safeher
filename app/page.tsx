"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function HomePage() {
  const [query, setQuery] = useState("");

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    // For now we just log it. Later: navigate to /map with query as param.
    console.log("Searching for:", query);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        {/* Top header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-purple-600 font-semibold">
              SafeHER
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">
              Where are you going?
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Plan safer walks with routes, alerts, and stories from women nearby.
            </p>
          </div>

          <div className="hidden sm:flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
              <span className="text-xl" aria-hidden="true">
                💜
              </span>
              <span className="sr-only">SafeHER</span>
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-xl border border-purple-100 px-4 sm:px-6 md:px-8 py-6 md:py-8">
          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch mb-6 md:mb-7"
          >
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-purple-500">
                📍
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a street, area, or destination…"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-purple-100 bg-purple-50/60 text-sm sm:text-base
                           focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              className="whitespace-nowrap px-5 py-3 rounded-2xl bg-purple-600 text-white text-sm sm:text-base font-medium
                         hover:bg-purple-700 shadow-sm transition"
            >
              Search
            </button>
          </form>

          {/* Map preview */}
          <div className="rounded-3xl bg-gradient-to-tr from-purple-200 via-purple-100 to-pink-100 h-56 md:h-64 mb-6 md:mb-8 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -left-10 bottom-0 w-32 h-32 bg-white/40 rounded-full" />
            <div className="absolute right-0 -top-10 w-40 h-40 bg-white/40 rounded-full" />
            {/* Fake route line */}
            <div className="absolute inset-x-10 inset-y-10 border-2 border-dashed border-purple-400/70 rounded-3xl" />
            <div className="absolute left-1/4 top-1/3 w-3 h-3 bg-purple-700 rounded-full shadow" />
            <div className="absolute right-1/5 bottom-1/4 w-3 h-3 bg-pink-500 rounded-full shadow" />

            <div className="relative h-full flex flex-col justify-between p-5">
              <div className="flex items-center justify-between text-xs text-purple-900/80">
                <span className="inline-flex items-center gap-1 bg-white/70 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Live safety map (coming soon)
                </span>
                <span className="hidden sm:inline-flex bg-white/70 px-2 py-1 rounded-full">
                  Static preview
                </span>
              </div>

              <div>
                <p className="text-sm font-semibold text-purple-900">
                  Map preview
                </p>
                <p className="text-xs text-purple-900/80 mt-1 max-w-xs">
                  Soon you&apos;ll be able to see safer paths, recent alerts, and
                  places women avoid — all in one glance.
                </p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Link
              href="/sos"
              className="rounded-2xl bg-purple-600 text-white px-4 py-3 flex flex-col gap-1 shadow-sm hover:bg-purple-700 transition"
            >
              <span className="text-xs uppercase tracking-wide opacity-90">
                SOS
              </span>
              <span className="font-semibold">Quick alert</span>
              <span className="text-[11px] opacity-90">
                Share location with trusted contacts.
              </span>
            </Link>

            <Link
              href="/stories"
              className="rounded-2xl bg-purple-50 px-4 py-3 flex flex-col gap-1 hover:bg-purple-100 transition"
            >
              <span className="text-xs uppercase tracking-wide text-purple-700">
                Stories
              </span>
              <span className="font-semibold text-gray-900">Read & share</span>
              <span className="text-[11px] text-gray-600">
                See what other women have experienced.
              </span>
            </Link>

            <Link
              href="/map"
              className="rounded-2xl bg-purple-50 px-4 py-3 flex flex-col gap-1 hover:bg-purple-100 transition"
            >
              <span className="text-xs uppercase tracking-wide text-purple-700">
                Safety map
              </span>
              <span className="font-semibold text-gray-900">Explore areas</span>
              <span className="text-[11px] text-gray-600">
                Check how safe a neighborhood feels.
              </span>
            </Link>

            <Link
              href="/assistant"
              className="rounded-2xl bg-purple-50 px-4 py-3 flex flex-col gap-1 hover:bg-purple-100 transition"
            >
              <span className="text-xs uppercase tracking-wide text-purple-700">
                Assistant
              </span>
              <span className="font-semibold text-gray-900">Talk it out</span>
              <span className="text-[11px] text-gray-600">
                Ask SafeHER for guidance in the moment.
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
