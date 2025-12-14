"use client";

import Link from "next/link";
import Map from "@/components/Map";

export default function HeatmapPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-purple-600 font-semibold">
              Safety Map
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-gray-900">
              Community heatmap
            </h1>
            <p className="text-gray-600 mt-2">
              Built from community stories (location-attached reports).
            </p>
          </div>
          <Link href="/" className="text-sm text-purple-600 hover:text-purple-800 underline">
            Back home
          </Link>
        </div>

        <div className="mt-6 bg-white rounded-3xl shadow-xl border border-purple-100 p-4">
          <Map className="w-full h-[520px]" />
        </div>
      </div>
    </div>
  );
}
