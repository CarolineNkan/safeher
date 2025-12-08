"use client";

export default function RouteScorePage() {
  return (
    <div className="min-h-screen bg-[#faf5ff] flex flex-col items-center py-12 px-4">
      
      {/* Container */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-md p-8">

        {/* Safety Score */}
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex flex-col justify-center items-center text-white shadow-lg">
            <p className="text-4xl font-bold">72</p>
            <p className="text-sm opacity-80">/100</p>
          </div>

          <h2 className="mt-4 text-2xl font-semibold text-[#2b2b2b]">
            Moderate safety level
          </h2>
          <p className="text-gray-500 mt-1 text-[15px] max-w-md">
            This route was analyzed using recent reports, lighting data, and visibility information.
          </p>
        </div>

        {/* Risk Breakdown */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold text-[#333] mb-4">
            Risk Breakdown
          </h3>

          <div className="space-y-3">
            {/* Item */}
            <div className="flex justify-between bg-purple-50 p-4 rounded-xl">
              <span className="text-gray-700 font-medium">Street lighting</span>
              <span className="text-yellow-600 font-semibold">Medium</span>
            </div>

            <div className="flex justify-between bg-purple-50 p-4 rounded-xl">
              <span className="text-gray-700 font-medium">Past incidents</span>
              <span className="text-red-600 font-semibold">High</span>
            </div>

            <div className="flex justify-between bg-purple-50 p-4 rounded-xl">
              <span className="text-gray-700 font-medium">Visibility</span>
              <span className="text-green-600 font-semibold">Low</span>
            </div>
          </div>
        </div>

        {/* Map Preview */}
        <div className="mt-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl h-56 flex items-center justify-center relative border border-purple-200">
          <p className="text-purple-700 text-sm opacity-80">Map preview coming soon</p>
          
          {/* Fake dot routes */}
          <div className="absolute top-10 left-10 w-4 h-4 bg-purple-600 rounded-full"></div>
          <div className="absolute bottom-10 right-12 w-4 h-4 bg-pink-500 rounded-full"></div>
        </div>

        {/* CTA Button */}
        <button className="w-full mt-8 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-lg font-semibold transition">
          Try a safer route instead
        </button>

      </div>
    </div>
  );
}
