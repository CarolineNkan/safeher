"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface RouteMapProps {
  route: {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
    geometry: any;
  };
}

export default function RouteMap({ route }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!route || !mapContainer.current) return;

    const { start, end, geometry } = route;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [start.lng, start.lat],
      zoom: 13,
    });

    map.current.on("load", () => {
      map.current!.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry,
        },
      });

      map.current!.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#FF4EC8",
          "line-width": 4,
        },
      });

      new mapboxgl.Marker({ color: "#9b5de5" })
        .setLngLat([start.lng, start.lat])
        .addTo(map.current!);

      new mapboxgl.Marker({ color: "#ff4ec8" })
        .setLngLat([end.lng, end.lat])
        .addTo(map.current!);

      const bounds = new mapboxgl.LngLatBounds();
      geometry.coordinates.forEach(([lng, lat]: any) => {
        bounds.extend([lng, lat]);
      });

      map.current!.fitBounds(bounds, { padding: 50 });
    });

    return () => map.current?.remove();
  }, [route]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-72 rounded-xl border border-gray-700 mt-4"
    />
  );
}