"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Story {
  id: string;
  message: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  user_id: string;
  likes: number;
  helpful: number;
  noted: number;
}

interface MapProps {
  className?: string;
}

export default function Map({ className = "w-full h-96" }: MapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stories with location data
  const fetchStories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stories/list');
      if (response.ok) {
        const data = await response.json();
        // Filter stories that have location data
        const storiesWithLocation = data.filter((story: Story) => 
          story.lat !== null && story.lng !== null
        );
        setStories(storiesWithLocation);
        console.log(`Loaded ${storiesWithLocation.length} stories with location data`);
      } else {
        throw new Error('Failed to fetch stories');
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
      setError('Failed to load community data');
    } finally {
      setLoading(false);
    }
  };

  // Convert stories to GeoJSON FeatureCollection
  const createGeoJSONFromStories = (stories: Story[]) => {
    return {
      type: "FeatureCollection" as const,
      features: stories.map(story => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [story.lng!, story.lat!]
        },
        properties: {
          id: story.id,
          message: story.message,
          likes: story.likes,
          helpful: story.helpful,
          noted: story.noted
        }
      }))
    };
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-74.006, 40.7128], // Default to NYC
      zoom: 10,
    });

    map.current.on("load", () => {
      // Fetch stories when map loads
      fetchStories();
    });

    return () => map.current?.remove();
  }, []);

  // Handle heatmap toggle
  const toggleHeatmap = () => {
    if (!map.current) return;

    if (heatmapEnabled) {
      // Remove heatmap layer and source
      if (map.current.getLayer('community-heatmap')) {
        map.current.removeLayer('community-heatmap');
      }
      if (map.current.getSource('stories')) {
        map.current.removeSource('stories');
      }
      setHeatmapEnabled(false);
    } else {
      // Add heatmap layer
      addHeatmapLayer();
      setHeatmapEnabled(true);
    }
  };

  // Add heatmap layer to map
  const addHeatmapLayer = () => {
    if (!map.current || stories.length === 0) return;

    const geoJsonData = createGeoJSONFromStories(stories);

    // Add source
    map.current.addSource('stories', {
      type: 'geojson',
      data: geoJsonData
    });

    // Add heatmap layer
    map.current.addLayer({
      id: 'community-heatmap',
      type: 'heatmap',
      source: 'stories',
      maxzoom: 18,
      paint: {
        // Increase the heatmap weight based on story engagement (likes + helpful + noted)
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['+', ['+', ['get', 'likes'], ['get', 'helpful']], ['get', 'noted']],
          0, 0.1,
          10, 1
        ],
        // Increase the heatmap intensity by zoom level
        // heatmap-intensity is a multiplier on top of heatmap-weight
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 0.5,
          9, 1,
          15, 2
        ],
        // Color ramp for heatmap: Dark purple → Medium purple → Hot pink
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(45, 10, 82, 0)',       // Transparent dark purple
          0.1, 'rgba(45, 10, 82, 0.4)',   // Dark purple (#2d0a52)
          0.3, 'rgba(106, 13, 173, 0.6)', // Medium purple (#6a0dad)
          0.5, 'rgba(255, 78, 224, 0.8)', // Hot pink (#ff4ee0)
          1, 'rgba(255, 78, 224, 1)'      // Full hot pink
        ],
        // Adjust the heatmap radius by zoom level
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 5,
          9, 15,
          15, 25
        ],
        // Heatmap opacity increases with zoom level
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, 0.6,
          9, 0.8,
          15, 1
        ]
      }
    });
  };

  // Update heatmap when stories change
  useEffect(() => {
    if (heatmapEnabled && map.current && stories.length > 0) {
      // Remove existing layer and source if they exist
      if (map.current.getLayer('community-heatmap')) {
        map.current.removeLayer('community-heatmap');
      }
      if (map.current.getSource('stories')) {
        map.current.removeSource('stories');
      }
      // Add updated heatmap
      addHeatmapLayer();
    }
  }, [stories, heatmapEnabled]);

  return (
    <div className={`relative ${className}`}>
      {/* Map container */}
      <div
        ref={mapContainer}
        className="w-full h-full rounded-xl border border-gray-200"
      />
      
      {/* Heatmap toggle button */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={toggleHeatmap}
          disabled={loading || stories.length === 0}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg ${
            heatmapEnabled
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          } ${(loading || stories.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Loading...' : `Community Heatmap: ${heatmapEnabled ? 'ON' : 'OFF'}`}
        </button>
        
        {/* Story count indicator */}
        {stories.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md text-xs text-gray-600 shadow-sm">
            {stories.length} community reports
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-300 px-3 py-2 rounded-md text-xs text-red-700 shadow-sm max-w-48">
            {error}
            <button
              onClick={fetchStories}
              className="ml-2 text-red-800 hover:text-red-900 underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}