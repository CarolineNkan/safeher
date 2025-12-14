"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type Story = {
  id: string;
  message: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

interface MapProps {
  className?: string;
}

export default function Map({ className = "w-full h-96" }: MapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storiesWithLocation = useMemo(
    () => stories.filter((s) => typeof s.lat === "number" && typeof s.lng === "number"),
    [stories]
  );

  async function fetchStories() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stories/list", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch stories");
      const data = await res.json();
      setStories(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load community data");
    } finally {
      setLoading(false);
    }
  }

  function toGeoJSON(list: Story[]) {
    return {
      type: "FeatureCollection" as const,
      features: list
        .filter((s) => s.lat != null && s.lng != null)
        .map((s) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [s.lng as number, s.lat as number],
          },
          properties: {
            id: s.id,
            message: s.message,
          },
        })),
    };
  }

  function ensureSourceAndLayer() {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = "stories";
    const layerId = "community-heatmap";

    const data = toGeoJSON(storiesWithLocation);

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(data as any);
    } else {
      map.addSource(sourceId, { type: "geojson", data: data as any });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: "heatmap",
        source: sourceId,
        maxzoom: 18,
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 0.6,
            9, 1.2,
            15, 2.0
          ],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(106, 13, 173, 0)",
            0.2, "rgba(106, 13, 173, 0.35)",
            0.5, "rgba(161, 66, 245, 0.65)",
            1, "rgba(255, 78, 224, 0.95)"
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 6,
            9, 18,
            15, 28
          ],
          "heatmap-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5, 0.55,
            9, 0.85,
            15, 1
          ],
        },
      });
    }
  }

  function removeLayerAndSource() {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = "stories";
    const layerId = "community-heatmap";

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  }

  // Init map once
  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-79.3832, 43.6532], // Toronto default for demo
      zoom: 10,
    });

    mapRef.current = map;

    map.on("load", async () => {
      await fetchStories();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update heatmap on data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) return;

    if (!heatmapEnabled) return;

    // If no stories, still keep map alive—just no layer
    if (storiesWithLocation.length === 0) {
      removeLayerAndSource();
      return;
    }

    ensureSourceAndLayer();
  }, [storiesWithLocation, heatmapEnabled]);

  function toggleHeatmap() {
    setHeatmapEnabled((v) => {
      const next = !v;
      if (!next) removeLayerAndSource();
      else ensureSourceAndLayer();
      return next;
    });
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-2xl border border-purple-100" />

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={toggleHeatmap}
          className={`px-4 py-2 rounded-xl font-semibold text-sm shadow-lg transition ${
            heatmapEnabled ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-white text-gray-800 border border-purple-100 hover:bg-purple-50"
          }`}
        >
          Heatmap: {heatmapEnabled ? "ON" : "OFF"}
        </button>

        <button
          onClick={fetchStories}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-purple-100 hover:bg-purple-50 transition shadow"
        >
          {loading ? "Refreshing…" : "Refresh stories"}
        </button>

        <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl text-xs text-gray-700 border border-purple-100 shadow">
          {storiesWithLocation.length} reports on map
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 px-3 py-2 rounded-xl text-xs text-red-700 shadow max-w-56">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
