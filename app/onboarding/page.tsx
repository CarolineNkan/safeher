"use client";

import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl">
        {/* Top Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
            <span className="text-2xl" aria-hidden="true">
              💜
            </span>
            <span className="sr-only">SafeHER</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-purple-100 px-6 py-7 sm:px-8 sm:py-9">
          {/* Illustration-style block */}
          <div className="mb-6 sm:mb-8">
            <div className="w-full h-28 sm:h-32 rounded-2xl bg-gradient-to-r from-purple-100 via-purple-50 to-pink-50 flex items-center justify-center relative overflow-hidden">
              <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-purple-200 rounded-full opacity-60" />
              <div className="absolute -right-10 -top-8 w-24 h-24 bg-purple-300 rounded-full opacity-40" />
              <div className="relative flex flex-col items-center gap-1">
                <span className="text-3xl sm:text-4xl" aria-hidden="true">
                  🕊️
                </span>
                <p className="text-xs sm:text-sm text-gray-600">
                  Stay safe. Stay aware. Stay connected.
                </p>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="text-center mb-6 sm:mb-7">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-snug">
              Women deserve to feel safe
              <br className="hidden sm:block" /> everywhere, every day.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-gray-600">
              SafeHER helps you move through the world with more confidence, 
              with safer routes, SOS alerts, and stories from women who&apos;ve 
              walked the same streets.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="grid gap-3 sm:grid-cols-3 mb-6 sm:mb-7">
            <div className="bg-purple-50 rounded-2xl px-3 py-3 flex flex-col gap-1">
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                Safer routes
              </span>
              <p className="text-xs text-gray-600">
                See which streets women actually feel safe walking.
              </p>
            </div>

            <div className="bg-purple-50 rounded-2xl px-3 py-3 flex flex-col gap-1">
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                SOS alerts
              </span>
              <p className="text-xs text-gray-600">
                Share your live location with trusted contacts in moments.
              </p>
            </div>

            <div className="bg-purple-50 rounded-2xl px-3 py-3 flex flex-col gap-1">
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                Community stories
              </span>
              <p className="text-xs text-gray-600">
                Read real experiences and speak up about unsafe spaces.
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Link
              href="/signup"
              className="block w-full text-center bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition shadow-sm"
            >
              Get started
            </Link>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-purple-600 font-medium hover:underline"
              >
                Login instead
              </Link>
            </p>
          </div>
        </div>

        {/* Small bottom caption */}
        <p className="mt-6 text-center text-xs text-gray-500 max-w-md mx-auto">
          SafeHER is a community-driven safety companion. It doesn&apos;t replace
          emergency services, but it helps you feel less alone while getting the
          help you need.
        </p>
      </div>
    </div>
  );
}
