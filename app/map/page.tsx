import Map from "../../components/Map";

export default function MapPage() {
  return (
    <div className="min-h-screen bg-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Safety Map</h1>
          <p className="text-gray-600">Explore community safety reports and trends</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <Map className="w-full h-[600px]" />
        </div>
      </div>
    </div>
  );
}