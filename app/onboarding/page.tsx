"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Country {
  code: string;
  name: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  context?: Array<{ id: string; text: string }>;
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
  const [selectedCountry, setSelectedCountry] = useState<string>("US");
  const [addressQuery, setAddressQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state for AI enhancements
  const [aiLocationConsent, setAiLocationConsent] = useState<boolean>(false);
  const [userRiskProfile, setUserRiskProfile] = useState<number>(5);
  const [selectedAddress, setSelectedAddress] = useState<MapboxFeature | null>(null);

  // Debounced search for address suggestions
  useEffect(() => {
    if (addressQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await searchAddresses(addressQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [addressQuery, selectedCountry]);

  const searchAddresses = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&` +
        `country=${selectedCountry.toLowerCase()}&` +
        `types=address,poi&` +
        `limit=5`
      );

      if (!response.ok) {
        throw new Error('Failed to search addresses');
      }

      const data = await response.json();
      setSuggestions(data.features || []);
    } catch (error) {
      console.error('Address search error:', error);
      setError('Failed to search addresses. Please try again.');
      setSuggestions([]);
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
    if (!selectedAddress) {
      setError('Please select a home address');
      return;
    }

    if (!aiLocationConsent) {
      setError('Please consent to AI location analysis to continue');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const [lng, lat] = selectedAddress.center;
      
      const response = await fetch('/api/profile/save-home', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save home location');
      }

      // Trigger SmartMemory sync after successful save
      await fetch('/api/user-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: {
            id: 'placeholder-user-id', // In real app, get from auth session
            email: 'user@example.com', // In real app, get from auth session
          },
        }),
      });

      // Redirect to home page after successful save
      router.push('/');
    } catch (error) {
      console.error('Save home location error:', error);
      setError(error instanceof Error ? error.message : 'Failed to save home location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl">
        {/* Top Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
            <span className="text-2xl" aria-hidden="true">
              🏠
            </span>
            <span className="sr-only">SafeHER Home Setup</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-purple-100 px-6 py-7 sm:px-8 sm:py-9">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-snug mb-3">
              Set up your home location
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              We'll use this to help you navigate safely home and provide personalized safety insights for your area.
            </p>
          </div>

          {/* Country Selection */}
          <div className="mb-6">
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              id="country"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          {/* Address Search */}
          <div className="mb-6">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Home Address
            </label>
            <div className="relative">
              <input
                id="address"
                type="text"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                placeholder="Start typing your address..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={saving}
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                </div>
              )}
            </div>

            {/* Address Suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleAddressSelect(suggestion)}
                    disabled={saving}
                    className="w-full text-left px-4 py-3 hover:bg-purple-50 focus:bg-purple-50 focus:outline-none border-b border-gray-100 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {suggestion.place_name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Location Consent Toggle */}
          <div className="mb-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center h-5">
                <input
                  id="ai-consent"
                  type="checkbox"
                  checked={aiLocationConsent}
                  onChange={(e) => setAiLocationConsent(e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                  disabled={saving}
                />
              </div>
              <div className="text-sm">
                <label htmlFor="ai-consent" className="font-medium text-gray-900 cursor-pointer">
                  Allow SafeHER AI to analyze local crime trends near my home to improve safety insights
                </label>
                <p className="text-gray-600 mt-1">
                  This enables personalized risk scoring, safety heatmaps, and smarter route recommendations based on your area.
                </p>
              </div>
            </div>
          </div>

          {/* Risk Profile Slider */}
          <div className="mb-6">
            <label htmlFor="risk-profile" className="block text-sm font-medium text-gray-700 mb-2">
              How comfortable are you walking alone at night?
            </label>
            <div className="px-3">
              <input
                id="risk-profile"
                type="range"
                min="0"
                max="10"
                value={userRiskProfile}
                onChange={(e) => setUserRiskProfile(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                disabled={saving}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Very uncomfortable</span>
                <span className="font-medium text-purple-600">{userRiskProfile}/10</span>
                <span>Very comfortable</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              This helps us personalize safety recommendations and adjust risk thresholds for your comfort level.
            </p>
          </div>

          {/* Complete Setup Button */}
          <div className="mb-6">
            <button
              onClick={handleCompleteOnboarding}
              disabled={saving || !selectedAddress || !aiLocationConsent}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Setting up your profile...</span>
                </div>
              ) : (
                'Complete Setup'
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-purple-50 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-purple-600 text-lg" aria-hidden="true">💡</span>
              <div>
                <h3 className="text-sm font-medium text-purple-900 mb-1">
                  Why do we need this?
                </h3>
                <p className="text-xs text-purple-700">
                  Your home location helps us provide personalized safety routes and enables the "Go Home Safe" feature. We never share your exact address with other users.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <p className="mt-6 text-center text-xs text-gray-500 max-w-md mx-auto">
          Your location data is encrypted and only used to enhance your safety experience. You can update or remove it anytime in your profile settings.
        </p>
      </div>
    </div>
  );
}
