"use client";

import { useState } from "react";
import Link from "next/link";

export default function SOSPage() {
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    link: string;
  } | null>(null);

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [error, setError] = useState("");

  const baseMessage =
    "🚨 SafeHER SOS: I may be unsafe. Please check on me immediately.";

  const fullMessage = location
    ? `${baseMessage}\n📍 My location: ${location.link}`
    : baseMessage;

  /* ---------- LOCATION ---------- */
  function attachLocation() {
    if (!navigator.geolocation) {
      setError("Location services are not supported on this device.");
      return;
    }

    setLoadingLocation(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setLocation({
          lat,
          lng,
          link: `https://maps.google.com/?q=${lat},${lng}`,
        });

        setLoadingLocation(false);
      },
      () => {
        setError("Unable to retrieve your location.");
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  }

  /* ---------- ACTIONS ---------- */
  async function copyMessage() {
    await navigator.clipboard.writeText(fullMessage);
    alert("SOS message copied.");
  }

  function openSMS() {
    window.location.href = `sms:?body=${encodeURIComponent(fullMessage)}`;
  }

  function callEmergency() {
    window.location.href = "tel:911";
  }

  return (
    <div className="min-h-screen bg-purple-50 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-purple-600 font-semibold">
            SOS Mode
          </p>
          <Link href="/" className="text-purple-600 hover:underline">
            Exit
          </Link>
        </div>

        <h1 className="text-3xl font-semibold mt-2">
          Quick alert + calm steps
        </h1>
        <p className="text-gray-600 mt-1">
          Take a breath. Move toward light. Stay near people. Let someone know
          now.
        </p>

        {/* LOCATION */}
        <div className="bg-purple-100 rounded-2xl p-4 mt-6">
          <p className="font-medium">Attach my location (optional)</p>
          <p className="text-sm text-gray-600 mt-1">
            Location is only requested when you tap the button.
          </p>

          <button
            onClick={attachLocation}
            disabled={loadingLocation}
            className="mt-3 px-4 py-2 rounded-xl bg-white border hover:bg-purple-50 transition disabled:opacity-50"
          >
            {loadingLocation ? "Getting location…" : "Attach location"}
          </button>

          {location && (
            <p className="text-xs text-gray-600 mt-2">
              Location attached ✓
            </p>
          )}

          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>

        {/* ACTION BUTTONS */}
        <div className="mt-6 space-y-3">
          <button
            onClick={copyMessage}
            className="w-full py-3 rounded-2xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition"
          >
            Copy SOS message
          </button>

          <button
            onClick={openSMS}
            className="w-full py-3 rounded-2xl bg-white border font-medium hover:bg-purple-50 transition"
          >
            Open SMS with message
          </button>

          <button
            onClick={callEmergency}
            className="w-full py-3 rounded-2xl bg-white border font-medium hover:bg-red-50 transition"
          >
            Call emergency services
          </button>
        </div>

        {/* PREVIEW */}
        <div className="mt-6">
          <p className="text-sm font-medium mb-2">SOS message preview</p>
          <div className="bg-white border rounded-2xl p-4 text-sm whitespace-pre-wrap">
            {fullMessage}
          </div>
        </div>

        {/* FOOTNOTE */}
        <p className="text-xs text-gray-500 mt-4">
          SafeHER does not automatically contact emergency services. Use SOS to
          quickly alert someone you trust.
        </p>
      </div>
    </div>
  );
}
