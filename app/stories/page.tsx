// app/stories/page.tsx
"use client";

import ShareStoryButton from "@/components/ShareStoryButton";
import StoryCard from "@/components/StoryCard";

const MOCK_STORIES = [
  {
    id: 1,
    author: "Lebo M.",
    isAnonymous: false,
    location: "Downtown bus stop",
    timeAgo: "2 hours ago",
    category: "Street harassment",
    text:
      "I was walking back from a late shift and a group of men kept making comments as I passed. " +
      "Another woman at the stop came to stand beside me and we pretended to be on a phone call together. " +
      "Just want to flag this spot for other women who walk here at night.",
    tags: ["nightShift", "harassment", "busStop"],
  },
  {
    id: 2,
    author: "Anonymous",
    isAnonymous: true,
    location: "Elm & 3rd alleyway",
    timeAgo: "Yesterday",
    category: "Unsafe route",
    text:
      "That shortcut alley behind the grocery store feels really unsafe after 8pm. " +
      "Poor lighting, almost no foot traffic, and cars can’t see you from the main road. " +
      "I’ve switched to the longer main street route and it feels so much better.",
    tags: ["lighting", "alleyway", "routeChange"],
  },
  {
    id: 3,
    author: "Nadia K.",
    isAnonymous: false,
    location: "Eagle Street",
    timeAgo: "3 days ago",
    category: "Safety tip",
    text:
      "If you have to walk past the bar strip on Eagle Street, I recommend crossing to the side with the pharmacy. " +
      "There’s better lighting, more cameras, and usually more people around. " +
      "Also, share your live location with someone you trust.",
    tags: ["safetyTip", "routeAdvice", "eagleStreet"],
  },
];

export default function StoriesPage() {
  const handleShareClick = () => {
    // Later: open a modal or navigate to /stories/new
    console.log("Share story clicked");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50 px-4 py-10 flex justify-center">
      <main className="w-full max-w-3xl">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
              <span className="text-xl" aria-hidden="true">
                💜
              </span>
              <span className="sr-only">Community Stories</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                Community Stories
              </h1>
              <p className="text-sm text-gray-600">
                Real experiences from women walking these same streets.
              </p>
            </div>
          </div>

          <div className="hidden sm:block">
            <ShareStoryButton onClick={handleShareClick} />
          </div>
        </header>

        {/* Mobile share button */}
        <div className="sm:hidden mb-4">
          <ShareStoryButton onClick={handleShareClick} />
        </div>

        {/* Info banner */}
        <section className="mb-5">
          <div className="rounded-2xl bg-purple-50 border border-purple-100 px-4 py-3 text-xs sm:text-sm text-purple-900">
            <p className="font-medium">
              Your voice matters.
            </p>
            <p className="mt-1">
              Sharing what you&apos;ve experienced helps other women plan safer routes,
              avoid unsafe spots, and feel less alone.
            </p>
          </div>
        </section>

        {/* Stories list */}
        <section className="space-y-4 mb-10">
          {MOCK_STORIES.map((story) => (
            <StoryCard key={story.id} {...story} />
          ))}
        </section>

        {/* Soft footer note */}
        <footer className="text-center text-[11px] text-gray-500 max-w-md mx-auto">
          SafeHER is a community-driven space. Stories are personal experiences, not
          official reports. Always trust your instincts and prioritize your safety.
        </footer>
      </main>
    </div>
  );
}
