"use client";

import { useRouter } from "next/navigation";

export default function QuickSOSButton({ variant = "floating" }: { variant?: "floating" | "prominent" }) {
  const router = useRouter();

  const base =
    variant === "floating"
      ? "fixed bottom-6 right-6 w-16 h-16 rounded-full bg-purple-600 text-white shadow-xl hover:bg-purple-700 transition flex items-center justify-center font-bold"
      : "w-full py-5 rounded-2xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition";

  return (
    <button
      onClick={() => router.push("/sos")}
      className={base}
      aria-label="Open SOS Mode"
    >
      SOS
    </button>
  );
}
