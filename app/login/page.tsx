"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function ensureClientId() {
  if (typeof window === "undefined") return;
  let id = localStorage.getItem("safeher_client_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("safeher_client_id", id);
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Attempt real Supabase login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        console.warn("Supabase login failed — falling back to demo mode");

        // 🔐 Demo / guest login fallback
        ensureClientId();

        // Optional: still sync anonymous session
        await fetch("/api/user-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: {
              id: "guest",
              email: "guest@safeher.demo",
            },
          }),
        });

        router.push("/onboarding");
        return;
      }

      // ✅ Real user logged in
      ensureClientId();

      await fetch("/api/user-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: {
            id: data.user.id,
            email: data.user.email,
          },
        }),
      });

      router.push("/");
    } catch (err) {
      console.error("Unexpected login error:", err);

      // Absolute safety net
      ensureClientId();
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm text-center">
        {/* Purple heart */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl">
            💜
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-gray-800">Welcome back</h1>
        <p className="text-gray-500 mb-8">
          Login to continue
        </p>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="text-gray-700 text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-gray-700 text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-xl mt-2 hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-gray-600">
          Don’t have an account?{" "}
          <Link
            href="/signup"
            className="text-purple-600 font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>

        <p className="mt-4 text-xs text-gray-400">
          Demo note: authentication gracefully falls back to guest mode if needed.
        </p>
      </div>
    </div>
  );
}
