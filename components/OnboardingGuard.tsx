"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function OnboardingGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const publicRoutes = ["/login", "/signup"];
    if (!user && !publicRoutes.includes(pathname)) {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  // 🚨 DO NOT BLOCK RENDERING
  return <>{children}</>;
}
