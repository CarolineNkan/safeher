"use client";

import { useState } from "react";

interface ScoredRoute {
  id: string;
  distance: number;
  duration: number;
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

interface RouteComparisonProps {
  safestRoute: ScoredRoute;
  alternativeRoutes: ScoredRoute[];
  explanation: string;
}

export default function RouteComparison({
  safestRoute,
  alternativeRoutes,
  explanation
}: RouteComparisonProps) {
  const [selectedRoute, setSelectedRoute] = useState<string>(safestRoute.id);
  const allRoutes = [safestRoute, ...alternativeRoutes];

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 bg-green-50";
    if (score >= 40) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getFactorColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Route Safety Analysis
        </h2>
        <p className="text-gray-600 text-sm">{explanation}</p>
      </div>

      {/* Route Cards */}
      <div className="grid gap-4 mb-6">
        {allRoutes.map((route, index) => {
          const isSafest = route.id === safestRoute.id;
          const isSelected = route.id === selectedRoute;
          
          return (
            <div
              key={route.id}
              onClick={() => setSelectedRoute(route.id)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${isSafest ? 'ring-2 ring-green-200' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">
                    {isSafest ? '🏆 Recommended Route' : `Alternative ${index}`}
                  </h3>
                  {isSafest && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Safest
                    </span>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(route.score.score)}`}>
                  {route.score.score}/100
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <span className="text-xs text-gray-500">Distance</span>
                  <p className="font-medium">{formatDistance(route.distance)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Duration</span>
                  <p className="font-medium">{formatDuration(route.duration)}</p>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-3">
                {route.score.explanation}
              </div>

              {/* Safety Factors */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Safety Factors</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Distance</span>
                        <span>{route.safetyFactors.distanceScore}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getFactorColor(route.safetyFactors.distanceScore)}`}
                          style={{ width: `${route.safetyFactors.distanceScore}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Lighting</span>
                        <span>{route.safetyFactors.lightingScore}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getFactorColor(route.safetyFactors.lightingScore)}`}
                          style={{ width: `${route.safetyFactors.lightingScore}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Safety</span>
                        <span>{route.safetyFactors.crimeScore}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getFactorColor(route.safetyFactors.crimeScore)}`}
                          style={{ width: `${route.safetyFactors.crimeScore}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Community</span>
                        <span>{route.safetyFactors.storyScore}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getFactorColor(route.safetyFactors.storyScore)}`}
                          style={{ width: `${route.safetyFactors.storyScore}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition">
          Use Recommended Route
        </button>
        <button className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">
          Share Route
        </button>
      </div>
    </div>
  );
}