"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface QuickSOSButtonProps {
  className?: string;
  variant?: "floating" | "prominent" | "grid";
}

export default function QuickSOSButton({ 
  className = "", 
  variant = "prominent" 
}: QuickSOSButtonProps) {
  const router = useRouter();
  const [isPressed, setIsPressed] = useState(false);

  const handleSOSPress = () => {
    setIsPressed(true);
    // Provide immediate visual feedback
    setTimeout(() => setIsPressed(false), 200);
    
    // Navigate to SOS page
    router.push("/sos");
  };

  if (variant === "floating") {
    return (
      <button
        onClick={handleSOSPress}
        className={`
          fixed bottom-6 right-6 z-50
          w-16 h-16 rounded-full
          bg-red-600 hover:bg-red-700 active:bg-red-800
          text-white font-bold text-lg
          shadow-2xl hover:shadow-red-500/25
          transform transition-all duration-200
          ${isPressed ? 'scale-95' : 'hover:scale-105'}
          focus:outline-none focus:ring-4 focus:ring-red-500/50
          ${className}
        `}
        aria-label="Emergency SOS - Quick Access"
      >
        <div className="flex flex-col items-center justify-center">
          <span className="text-2xl leading-none">🆘</span>
          <span className="text-xs font-semibold leading-none mt-0.5">SOS</span>
        </div>
      </button>
    );
  }

  if (variant === "grid") {
    return (
      <button
        onClick={handleSOSPress}
        className={`
          rounded-2xl bg-red-600 text-white px-4 py-3 
          flex flex-col gap-1 shadow-lg
          hover:bg-red-700 active:bg-red-800
          transform transition-all duration-200
          ${isPressed ? 'scale-95' : 'hover:scale-105'}
          focus:outline-none focus:ring-4 focus:ring-red-500/50
          ${className}
        `}
        aria-label="Emergency SOS - Quick Access"
      >
        <span className="text-xs uppercase tracking-wide opacity-90 font-semibold">
          🆘 EMERGENCY
        </span>
        <span className="font-bold text-lg">SOS Alert</span>
        <span className="text-xs opacity-90 leading-tight">
          Tap for immediate emergency assistance
        </span>
      </button>
    );
  }

  // Default prominent variant
  return (
    <button
      onClick={handleSOSPress}
      className={`
        w-full rounded-3xl bg-red-600 text-white px-6 py-4
        flex items-center justify-center gap-3
        shadow-xl hover:shadow-red-500/25
        hover:bg-red-700 active:bg-red-800
        transform transition-all duration-200
        ${isPressed ? 'scale-98' : 'hover:scale-102'}
        focus:outline-none focus:ring-4 focus:ring-red-500/50
        border-2 border-red-500
        ${className}
      `}
      aria-label="Emergency SOS - Quick Access"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-2xl">🆘</span>
        </div>
        <div className="text-left">
          <div className="text-sm uppercase tracking-wide opacity-90 font-semibold">
            EMERGENCY
          </div>
          <div className="text-xl font-bold">SOS Quick Access</div>
          <div className="text-sm opacity-90">
            Tap for immediate emergency assistance
          </div>
        </div>
      </div>
    </button>
  );
}