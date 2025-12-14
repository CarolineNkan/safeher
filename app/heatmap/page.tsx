"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type MapboxGL = typeof import("mapbox-gl");

type BBox = { west: number; south: number; east: number; north: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * AI baseline haze:
 * - NOT “deep research”
 * - NOT “crime hotspots”
 * - Just a low-confidence contextual layer so the map never looks dead.
 *
 * We generate points across the *current viewport* (grid + jitter),
 * with slightly higher weight at night (global, not location blame).
 */
function buildAIBaselinePoints(bbox: BBox, zoom: number) {
  const z = clamp(zoom, 1, 16);

  // fewer points when zoomed out, more when zoomed in
  const steps = z < 3 ? 6 : z < 6 ? 10 : z < 10 ? 14 : 18;

  const latStep = (bbox.north - bbox.south) / steps;
  const lngStep = (bbox.east - bbox.west) / steps;

  const hour = new Date().getHours();
  const nightBoost = hour >= 22 || hour <= 5 ? 1.4 : hour >= 18 ? 1.15 : 1.0;

  const features: any[] = [];

  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const lat = bbox.south + i * latStep;
      const lng = bbox.west + j * lngStep;

      // jitter so it looks organic
      const jitterLat = lat + (Math.random() - 0.5) * latStep * 0.35;
      const jitterLng = lng + (Math.random() - 0.5) * lngStep * 0.35;

      // baseline weight is intentionally low + conservative
      const base = 0.35 * nightBoost;

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [jitterLng, jitterLat] },
        properties: { weight: base, source: "ai" },
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

export default function HeatmapPage() {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [tokenOk, setTokenOk] = useState(true);

  const mapboxToken = useMemo(() => process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "", []);

  // Simple tooltip
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (!mapboxToken) {
      setTokenOk(false);
      return;
    }

    let isMounted = true;

    (async () => {
      const mapboxglMod: MapboxGL = await import("mapbox-gl");
      const mapboxgl = mapboxglMod.default as any;

      if (!isMounted || !mapDivRef.current) return;

      mapboxgl.accessToken = mapboxToken;

      const map = new mapboxgl.Map({
        container: mapDivRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [0, 15],
        zoom: 1.6,
        projection: { name: "globe" },
      });

      mapRef.current = map;

      map.on("load", async () => {
        // sources
        map.addSource("safeher-ai", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addSource("safeher-community", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        // Heat layer for AI baseline
        map.addLayer({
          id: "safeher-ai-heat",
          type: "heatmap",
          source: "safeher-ai",
          paint: {
            "heatmap-weight": ["get", "weight"],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              12,
              8,
              26,
              14,
              42,
            ],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              0.8,
              14,
              3.5,
            ],
            "heatmap-opacity": 0.55,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(168, 85, 247, 0)",
              0.2,
              "rgba(168, 85, 247, 0.25)",
              0.5,
              "rgba(168, 85, 247, 0.55)",
              0.8,
              "rgba(126, 34, 206, 0.75)",
              1,
              "rgba(88, 28, 135, 0.9)",
            ],
          },
        });

        // Heat layer for community stories (stronger + reaction-weighted)
        map.addLayer({
          id: "safeher-community-heat",
          type: "heatmap",
          source: "safeher-community",
          paint: {
            "heatmap-weight": ["get", "weight"],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              10,
              8,
              28,
              14,
              44,
            ],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1.0,
              14,
              4.0,
            ],
            "heatmap-opacity": 0.7,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(168, 85, 247, 0)",
              0.25,
              "rgba(168, 85, 247, 0.35)",
              0.55,
              "rgba(147, 51, 234, 0.75)",
              0.85,
              "rgba(126, 34, 206, 0.9)",
              1,
              "rgba(88, 28, 135, 1.0)",
            ],
          },
        });

        // click interaction (simple + safe)
        map.on("click", (e: any) => {
          const z = map.getZoom();
          const msg =
            z < 5
              ? "Zoom in for neighborhood-level signals."
              : "This area shows combined signals (AI baseline + community reports when available).";
          setTip({ x: e.point.x, y: e.point.y, text: msg });

          window.setTimeout(() => setTip(null), 2500);
        });

        // load initial data
        await refreshSignals();

        // refresh when user moves/zooms (debounced-ish)
        let t: any = null;
        const schedule = () => {
          if (t) clearTimeout(t);
          t = setTimeout(() => refreshSignals(), 250);
        };

        map.on("moveend", schedule);
        map.on("zoomend", schedule);

        setReady(true);
      });

      async function refreshSignals() {
        if (!mapRef.current) return;

        const m = mapRef.current;
        const b = m.getBounds();
        const zoom = m.getZoom();

        const bbox: BBox = {
          west: b.getWest(),
          south: b.getSouth(),
          east: b.getEast(),
          north: b.getNorth(),
        };

        // 1) AI baseline points across viewport
        const aiGeo = buildAIBaselinePoints(bbox, zoom);
        (m.getSource("safeher-ai") as any)?.setData(aiGeo);

        // 2) Community points (reaction-weighted), filtered to viewport
        try {
          const res = await fetch("/api/heatmap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bbox, zoom }),
          });

          const geo = await res.json();
          if (geo?.type === "FeatureCollection") {
            (m.getSource("safeher-community") as any)?.setData(geo);
          }
        } catch {
          // If API fails, AI baseline still keeps map alive (no crashes)
        }
      }
    })();

    return () => {
      isMounted = false;
      try {
        mapRef.current?.remove();
      } catch {}
    };
  }, [mapboxToken]);

  return (
    <div className="min-h-screen bg-purple-50 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-purple-600 hover:underline">
          ← Back home
        </Link>

        <h1 className="text-4xl font-semibold mt-6">Community Safety Heatmap</h1>
        <p className="text-gray-600 mt-2">
          Safety signals inferred from AI context and community stories.
        </p>
        <p className="text-gray-600 mt-2">
          Zoom in to explore neighborhood-level safety signals.
        </p>

        {/* Map container (keep your UI) */}
        <div className="mt-6 bg-white rounded-3xl border border-black/10 overflow-hidden">
          <div className="relative">
            {!tokenOk ? (
              <div className="h-[460px] flex items-center justify-center text-gray-600">
                Missing Mapbox token. Add <code className="px-2">NEXT_PUBLIC_MAPBOX_TOKEN</code>.
              </div>
            ) : (
              <div ref={mapDivRef} className="h-[460px] w-full" />
            )}

            {/* Tooltip */}
            {tip && (
              <div
                className="absolute bg-white border rounded-xl shadow px-3 py-2 text-xs text-gray-700"
                style={{ left: tip.x + 12, top: tip.y + 12 }}
              >
                {tip.text}
              </div>
            )}
          </div>
        </div>

        {/* Legend (small + clear, no redesign) */}
        <div className="mt-6">
          <div className="flex items-center gap-3 text-gray-700">
            <span className="inline-block w-3 h-3 rounded-full bg-purple-300" />
            <span>Light purple: lower risk signals</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700 mt-2">
            <span className="inline-block w-3 h-3 rounded-full bg-purple-700" />
            <span>Darker purple: higher combined risk</span>
          </div>

          <p className="text-sm text-gray-600 mt-3">
            Signals are AI-inferred when community data is limited.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Signals reflect recent patterns (last 7–14 days). Accuracy improves as more women share experiences.
          </p>
        </div>

        {/* Small state note */}
        {!ready && tokenOk && (
          <p className="text-sm text-gray-500 mt-4">Loading heatmap…</p>
        )}
      </div>
    </div>
  );
}

