"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GoHomeButton from "../components/GoHomeButton";
import QuickSOSButton from "../components/QuickSOSButton";

interface UserLocation {
  lat: number;
  lng: number;
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const router = useRouter();

  // Get user's current location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      const errorMsg = "Geolocation is not supported by this browser";
      setLocationError(errorMsg);
      console.error("🚫 Geolocation not supported:", errorMsg);
      return;
    }

    setLocationLoading(true);
    setLocationError(null);
    console.log("🔍 Requesting GPS location...");

    const successCallback = (position: GeolocationPosition) => {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setUserLocation(location);
      setLocationLoading(false);
      console.log("✅ GPS location obtained:", {
        ...location,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp).toISOString()
      });
    };

    const errorCallback = (error: GeolocationPositionError) => {
      setLocationLoading(false);
      
      let errorMessage = "Unable to get your location";
      let detailedError = "";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location access denied";
          detailedError = "User denied the request for geolocation";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location unavailable";
          detailedError = "Location information is unavailable";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out";
          detailedError = "The request to get user location timed out";
          break;
        default:
          errorMessage = "Unknown location error";
          detailedError = "An unknown error occurred while retrieving location";
          break;
      }

      setLocationError(errorMessage);
      console.error("❌ GPS error:", {
        code: error.code,
        message: error.message,
        detailedError,
        timestamp: new Date().toISOString()
      });
    };

    navigator.geolocation.getCurrentPosition(
      successCallback,
      errorCallback,
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 0
      }
    );
  };

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);

    try {
      console.log("🔍 Starting geocoding for query:", query);
      
      // 1. Geocode the searched destination using Mapbox
      const geoRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      );

      const geoData = await geoRes.json();
      console.log("📍 Geocoding response:", geoData);

      if (!geoData.features?.length) {
        alert("Couldn't find that location.");
        setLoading(false);
        return;
      }

      const endCoords = {
        lat: geoData.features[0].center[1],
        lng: geoData.features[0].center[0],
      };

      // STEP 3 — Smart Routing Priority Logic
      let startCoords: UserLocation;

      // 1️⃣ Use live GPS if available
      if (userLocation) {
        startCoords = userLocation;
        console.log("🎯 Using current GPS location as start:", startCoords);
      } else {
        // 2️⃣ Fallback to saved home location
        try {
          const profileRes = await fetch('/api/profile/save-home');
          if (profileRes.ok) {
            const profile = await profileRes.json();
            if (profile.home_lat && profile.home_lng) {
              startCoords = { lat: profile.home_lat, lng: profile.home_lng };
              console.log("🏠 Using saved home location as start:", startCoords);
            } else {
              // 3️⃣ Last fallback: use default location (could prompt user)
              startCoords = { lat: 43.6532, lng: -79.3832 }; // Toronto as placeholder
              console.log("⚠️ Using default location as start:", startCoords);
            }
          } else {
            startCoords = { lat: 43.6532, lng: -79.3832 }; // Toronto as placeholder
            console.log("⚠️ Profile fetch failed, using default location:", startCoords);
          }
        } catch (error) {
          startCoords = { lat: 43.6532, lng: -79.3832 }; // Toronto as placeholder
          console.log("⚠️ Error fetching profile, using default location:", startCoords);
        }
      }

      console.log("🗺️ Route coordinates:", { start: startCoords, end: endCoords });

      // 2. Call the route alternatives API for safer route analysis
      const alternativesRes = await fetch("/api/route-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: startCoords,
          end: endCoords,
        }),
      });

      const alternativesData = await alternativesRes.json();
      console.log("🛡️ Route alternatives response:", alternativesData);

      // 3. Redirect to route alternatives page
      router.push(
        `/route-alternatives?data=${encodeURIComponent(JSON.stringify(alternativesData))}`
      );
    } catch (err) {
      console.error("❌ Route analysis error:", err);
      alert("Failed to analyze route.");
    }

    setLoading(false);
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
              <span className="text-xl">💜</span>
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-xl border border-purple-100 px-4 sm:px-6 md:px-8 py-6 md:py-8">
          
          {/* Location Status */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {locationLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    <span className="text-gray-600">Getting your location...</span>
                  </>
                ) : userLocation ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-gray-600">GPS location ready</span>
                  </>
                ) : locationError ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span className="text-gray-600">Location unavailable</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    <span className="text-gray-600">Using saved home location</span>
                  </>
                )}
              </div>
              
              {locationError && (
                <button
                  onClick={getCurrentLocation}
                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  Retry GPS
                </button>
              )}
            </div>
            
            {/* Error Message */}
            {locationError && (
              <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs text-purple-700">{locationError}</p>
                <p className="text-xs text-purple-600 mt-1">
                  We'll use your saved home location or default location for routing.
                </p>
              </div>
            )}
          </div>

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
              disabled={loading}
              className="whitespace-nowrap px-5 py-3 rounded-2xl bg-purple-600 text-white text-sm sm:text-base font-medium
                         hover:bg-purple-700 shadow-sm transition disabled:opacity-40"
            >
              {loading ? "Analyzing…" : "Search"}
            </button>
          </form>

          {/* Map preview */}
          <div className="rounded-3xl bg-gradient-to-tr from-purple-200 via-purple-100 to-pink-100 h-56 md:h-64 mb-6 md:mb-8 relative overflow-hidden">
            <div className="absolute -left-10 bottom-0 w-32 h-32 bg-white/40 rounded-full" />
            <div className="absolute right-0 -top-10 w-40 h-40 bg-white/40 rounded-full" />

            {/* Fake dashed route */}
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
                <p className="text-sm font-semibold text-purple-900">Map preview</p>
                <p className="text-xs text-purple-900/80 mt-1 max-w-xs">
                  Soon you&apos;ll be able to see safer paths, recent alerts, and
                  places women avoid — all in one glance.
                </p>
              </div>
            </div>
          </div>

          {/* Go Home Safe Button */}
          <div className="mb-6">
            <GoHomeButton className="w-full" />
          </div>

          {/* Prominent SOS Quick Access */}
          <div className="mb-6">
            <QuickSOSButton variant="prominent" />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <QuickSOSButton variant="grid" />

            <Link
              href="/emergency-contacts"
              className="rounded-2xl bg-purple-50 px-4 py-3 flex flex-col gap-1 hover:bg-purple-100 transition"
            >
              <span className="text-xs uppercase tracking-wide text-purple-700">Contacts</span>
              <span className="font-semibold text-gray-900">Emergency</span>
              <span className="text-[11px] text-gray-600">
                Manage your trusted contacts for SOS.
              </span>
            </Link>

            <Link
              href="/stories"
              className="rounded-2xl bg-purple-50 px-4 py-3 flex flex-col gap-1 hover:bg-purple-100 transition"
            >
              <span className="text-xs uppercase tracking-wide text-purple-700">Stories</span>
              <span className="font-semibold text-gray-900">Read & share</span>
              <span className="text-[11px] text-gray-600">
                See what other women have experienced.
              </span>
            </Link>

            <Link
              href="/assistant"
              className="rounded-2xl bg-purple-50 px-4 py-3 flex flex-col gap-1 hover:bg-purple-100 transition"
            >
              <span className="text-xs uppercase tracking-wide text-purple-700">Assistant</span>
              <span className="font-semibold text-gray-900">Talk it out</span>
              <span className="text-[11px] text-gray-600">
                Ask SafeHER for guidance in the moment.
              </span>
            </Link>
          </div>

        </div>
      </div>

      {/* Floating SOS Button for maximum accessibility */}
      <QuickSOSButton variant="floating" />
    </div>
  );
}
