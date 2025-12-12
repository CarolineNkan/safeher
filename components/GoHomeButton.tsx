"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GoHomeButtonProps {
  className?: string;
  variant?: "primary" | "secondary" | "floating";
}

export default function GoHomeButton({ 
  className = "", 
  variant = "primary" 
}: GoHomeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoHome = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch user's home location
      const response = await fetch('/api/profile/save-home');
      if (!response.ok) {
        throw new Error('Failed to fetch home location');
      }

      const profile = await response.json();
      
      if (!profile.home_lat || !profile.home_lng) {
        // Redirect to onboarding if no home location set
        router.push('/onboarding');
        return;
      }

      // Get current location
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;
          
          // Navigate to route alternatives for safer route home
          const routeUrl = `/route-alternatives?from=${currentLat},${currentLng}&to=${profile.home_lat},${profile.home_lng}`;
          router.push(routeUrl);
        },
        (error) => {
          console.error('Geolocation error:', error);
          // If we can't get current location, use home as both start and end (will show area map)
          const routeUrl = `/route-alternatives?to=${profile.home_lat},${profile.home_lng}`;
          router.push(routeUrl);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );

    } catch (error) {
      console.error('Go home error:', error);
      setError(error instanceof Error ? error.message : 'Failed to navigate home');
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyles = () => {
    const baseStyles = "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    
    switch (variant) {
      case "primary":
        return `${baseStyles} bg-purple-600 text-white hover:bg-purple-700 px-6 py-3 rounded-xl shadow-sm`;
      case "secondary":
        return `${baseStyles} bg-white text-purple-600 border-2 border-purple-600 hover:bg-purple-50 px-6 py-3 rounded-xl`;
      case "floating":
        return `${baseStyles} bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl px-4 py-3 rounded-full fixed bottom-6 right-6 z-50`;
      default:
        return `${baseStyles} bg-purple-600 text-white hover:bg-purple-700 px-6 py-3 rounded-xl shadow-sm`;
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleGoHome}
        disabled={loading}
        className={getButtonStyles()}
        aria-label="Navigate safely home"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
            <span>Getting directions...</span>
          </>
        ) : (
          <>
            <span className="text-lg" aria-hidden="true">🏠</span>
            <span>GO HOME SAFE</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-600 hover:text-red-800 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}