"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // Skip onboarding check for certain pages
      const skipOnboardingPages = ['/onboarding', '/login', '/signup'];
      if (skipOnboardingPages.includes(pathname)) {
        setIsChecking(false);
        return;
      }

      const response = await fetch('/api/profile/save-home');
      if (response.ok) {
        const profile = await response.json();
        
        // If user doesn't have home location set, redirect to onboarding
        if (!profile.home_lat || !profile.home_lng) {
          setNeedsOnboarding(true);
          router.push('/onboarding');
          return;
        }
      }
      
      setIsChecking(false);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // On error, allow user to continue (fail gracefully)
      setIsChecking(false);
    }
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center shadow-md mb-4 mx-auto">
            <span className="text-xl" aria-hidden="true">💜</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SafeHER...</p>
        </div>
      </div>
    );
  }

  // Don't render children if redirecting to onboarding
  if (needsOnboarding) {
    return null;
  }

  return <>{children}</>;
}