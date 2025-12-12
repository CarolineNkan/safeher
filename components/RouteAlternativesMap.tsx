"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

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
    explanation: string;
  };
}

interface RouteAlternativesMapProps {
  safestRoute: ScoredRoute;
  alternativeRoutes: ScoredRoute[];
  start: RouteCoordinates;
  end: RouteCoordinates;
  className?: string;
}

export default function RouteAlternativesMap({
  safestRoute,
  alternativeRoutes,
  start,
  end,
  className = "w-full h-96"
}: RouteAlternativesMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(true);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [start.lng, start.lat],
      zoom: 13,
    });

    map.current.on("load", () => {
      addRoutes();
      addMarkers();
      fitBounds();
    });

    return () => map.current?.remove();
  }, []);

  const addRoutes = () => {
    if (!map.current) return;

    // Add safest route (highlighted)
    map.current.addSource("safest-route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: safestRoute.geometry,
      },
    });

    map.current.addLayer({
      id: "safest-route-line",
      type: "line",
      source: "safest-route",
      paint: {
        "line-color": "#10B981", // Green for safest
        "line-width": 6,
        "line-opacity": 1,
      },
    });

    // Add alternative routes (dimmed)
    alternativeRoutes.forEach((route, index) => {
      const sourceId = `alt-route-${index}`;
      const layerId = `alt-route-line-${index}`;

      map.current!.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: route.geometry,
        },
      });

      map.current!.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#9CA3AF", // Gray for alternatives
          "line-width": 4,
          "line-opacity": showAlternatives ? 0.6 : 0,
          "line-dasharray": [2, 2], // Dashed line
        },
      });
    });
  };

  const addMarkers = () => {
    if (!map.current) return;

    // Start marker
    new mapboxgl.Marker({ color: "#8B5CF6" })
      .setLngLat([start.lng, start.lat])
      .addTo(map.current);

    // End marker
    new mapboxgl.Marker({ color: "#EC4899" })
      .setLngLat([end.lng, end.lat])
      .addTo(map.current);
  };

  const fitBounds = () => {
    if (!map.current) return;

    const bounds = new mapboxgl.LngLatBounds();
    
    // Add all route coordinates to bounds
    [safestRoute, ...alternativeRoutes].forEach(route => {
      route.geometry.coordinates.forEach((coord: [number, number]) => {
        bounds.extend(coord);
      });
    });

    map.current.fitBounds(bounds, { padding: 50 });
  };

  const toggleAlternatives = () => {
    if (!map.current) return;

    const newShowState = !showAlternatives;
    setShowAlternatives(newShowState);

    alternativeRoutes.forEach((_, index) => {
      const layerId = `alt-route-line-${index}`;
      if (map.current!.getLayer(layerId)) {
        map.current!.setPaintProperty(layerId, "line-opacity", newShowState ? 0.6 : 0);
      }
    });
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapContainer}
        className="w-full h-full rounded-xl border border-gray-200"
      />
      
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={toggleAlternatives}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg ${
            showAlternatives
              ? 'bg-gray-600 text-white hover:bg-gray-700'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Show Alternatives: {showAlternatives ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Route Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-green-500 rounded"></div>
            <span className="text-gray-700">Safest Route ({safestRoute.score.score}/100)</span>
          </div>
          {showAlternatives && alternativeRoutes.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-gray-400 rounded border-dashed border border-gray-400"></div>
              <span className="text-gray-600">Alternative Routes</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}