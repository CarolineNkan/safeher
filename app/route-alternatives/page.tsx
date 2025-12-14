"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import RouteAlternativesMap from "../../components/RouteAlternativesMap";
import RouteComparison from "../../components/RouteComparison";

interface RouteCoordinates {
  lat: number;
  lng: number;
}

interface ScoredRoute {
  id: string;
  distance: number;
  duration: number;
  geometry: any;
  score: {
    score: number;
    level: string;
    lighting: string;
    incidents: string;
    visibility: string;
    explanation: string;
  };
  safetyFactors: {
    distanceScore: number;
    lightingScore: number;
    crimeScore: number;
    storyScore: number;
  };
}

interface RouteAlternativesData {
  safestRoute: ScoredRoute;
  alternativeRoutes: ScoredRoute[];
  explanation: string;
  start: RouteCoordinates;
  end: RouteCoordinates;
}

export default function RouteAlternativesPage() {
  const searchParams = useSearchParams();
  const [routeData, setRouteData] = useState<RouteAlternativesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(dataParam));
        setRouteData(parsedData);
      } catch (err) {
        console.error('Failed to parse route data:', err);
        setError('Invalid route data');
      }
    } else {
      // Fetch route alternatives if no data in URL
      fetchRouteAlternatives();
    }
    setLoading(false);
  }, [searchParams]);

  const fetchRouteAlternatives = async () => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      setError('Missing route parameters');
      return;
    }

    try {
      const [startLat, startLng] = from.split(',').map(Number);
      const [endLat, endLng] = to.split(',').map(Number);

      const response = await fetch('/api/route-alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: { lat: startLat, lng: startLng },
          end: { lat: endLat, lng: endLng }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch route alternatives');
      }

      const data = await response.json();
      setRouteData(data);
    } catch (err) {
      console.error('Route alternatives error:', err);
      setError('Failed to load route alternatives');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing safer route alternatives...</p>
        </div>
      </div>
    );
  }

  if (error || !routeData) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Load Routes
          </h1>
          <p className="text-gray-600 mb-4">{error || 'No route data available'}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Safer Route Alternatives
          </h1>
          <p className="text-gray-600">
            We've analyzed multiple routes and recommend the safest option for your journey
          </p>
        </div>

        {/* Map */}
        <div className="mb-8">
          <RouteAlternativesMap
            safestRoute={routeData.safestRoute}
            alternativeRoutes={routeData.alternativeRoutes}
            start={routeData.start}
            end={routeData.end}
            className="w-full h-[500px]"
          />
        </div>

        {/* Route Comparison */}
        <RouteComparison
          safestRoute={routeData.safestRoute}
          alternativeRoutes={routeData.alternativeRoutes}
          explanation={routeData.explanation}
        />

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            ← Back to Search
          </button>
        </div>
      </div>
    </div>
  );
}
