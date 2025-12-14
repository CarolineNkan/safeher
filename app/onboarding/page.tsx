"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface Country {
  code: string;
  name: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number];
}

const countries: Country[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
];

export default function OnboardingPage() {
  const router = useRouter();

  const {
    user,
    session,
    loading: authLoading,
  } = useAuth();

  const [selectedCountry, setSelectedCountry] = useState("US");
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [selectedAddress, setSelectedAddress] =
    useState<MapboxFeature | null>(null);

  const [aiLocationConsent, setAiLocationConsent] = useState(false);
  const [userRiskProfile, setUserRiskProfile] = useState(5);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔐 Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // 🔎 Address search debounce
  useEffect(() => {
    if (addressQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(() => {
      searchAddresses(addressQuery);
    }, 300);

    return () => clearTimeout(timeout);
  }, [addressQuery, selectedCountry]);

  const searchAddresses = async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${
          process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        }&country=${selectedCountry.toLowerCase()}&limit=5`
      );

      const data = await res.json();
      setSuggestions(data.features || []);
    } catch {
      setError("Failed to search addresses.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = (feature: MapboxFeature) => {
    setSelectedAddress(feature);
    setAddressQuery(feature.place_name);
    setSuggestions([]);
  };

  const handleCompleteOnboarding = async () => {
    if (!session?.access_token) {
      setError("Not authenticated");
      return;
    }

    if (!selectedAddress) {
      setError("Please select a home address");
      return;
    }

    if (!aiLocationConsent) {
      setError("Please consent to AI location analysis");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const [lng, lat] = selectedAddress.center;

      const response = await fetch("/api/profile/save-home", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          home_lat: lat,
          home_lng: lng,
          home_address: selectedAddress.place_name,
          formatted_address: selectedAddress.place_name,
          ai_location_consent: aiLocationConsent,
          user_risk_profile: userRiskProfile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save home location");
      }

      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to complete onboarding"
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50 px-6">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-lg p-8">

        <h1 className="text-2xl font-semibold mb-6 text-center">
          Set up your home location
        </h1>

        {/* Country */}
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full mb-4 px-4 py-3 border rounded-xl"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Address */}
        <input
          value={addressQuery}
          onChange={(e) => setAddressQuery(e.target.value)}
          placeholder="Start typing your address..."
          className="w-full px-4 py-3 border rounded-xl"
        />

        {loading && <p className="text-sm mt-2">Searching…</p>}

        {suggestions.length > 0 && (
          <div className="mt-2 border rounded-xl overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={`${s.id}-${s.place_name}`}
                onClick={() => handleAddressSelect(s)}
                className="block w-full text-left px-4 py-3 hover:bg-purple-50"
              >
                {s.place_name}
              </button>
            ))}
          </div>
        )}

        {/* Consent */}
        <label className="flex items-start gap-2 mt-6 text-sm">
          <input
            type="checkbox"
            checked={aiLocationConsent}
            onChange={(e) => setAiLocationConsent(e.target.checked)}
          />
          Allow SafeHER AI to analyze local crime trends
        </label>

        {/* Risk slider */}
        <input
          type="range"
          min={0}
          max={10}
          value={userRiskProfile}
          onChange={(e) => setUserRiskProfile(Number(e.target.value))}
          className="w-full mt-4"
        />

        <p className="text-sm text-center mt-2">
          Comfort level: {userRiskProfile}/10
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        <button
          onClick={handleCompleteOnboarding}
          disabled={saving}
          className="w-full mt-6 bg-purple-600 text-white py-3 rounded-xl"
        >
          {saving ? "Saving…" : "Complete Setup"}
        </button>
      </div>
    </div>
  );
}
