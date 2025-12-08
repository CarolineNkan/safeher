// components/StoryCard.tsx
"use client";

type StoryCardProps = {
  author: string;
  isAnonymous?: boolean;
  location: string;
  timeAgo: string;
  category: string;
  text: string;
  tags: string[];
};

export default function StoryCard({
  author,
  isAnonymous = false,
  location,
  timeAgo,
  category,
  text,
  tags,
}: StoryCardProps) {
  const displayName = isAnonymous ? "Anonymous" : author;
  const initials = isAnonymous
    ? "💜"
    : author
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

  return (
    <article className="bg-white/90 border border-purple-100 rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Top row: avatar + name + meta */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-sm font-semibold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {location} • {timeAgo}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-50 text-[11px] font-medium text-purple-700">
          {category}
        </span>
      </header>

      {/* Story text */}
      <p className="mt-3 text-sm text-gray-800 leading-relaxed">
        {text}
      </p>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-50 text-[11px] font-medium text-purple-700"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Reactions row */}
      <footer className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <button className="inline-flex items-center gap-1 hover:text-purple-700 transition">
          <span>💜</span>
          <span>Support</span>
        </button>
        <button className="inline-flex items-center gap-1 hover:text-purple-700 transition">
          <span>✨</span>
          <span>Helpful</span>
        </button>
        <button className="inline-flex items-center gap-1 hover:text-purple-700 transition">
          <span>👀</span>
          <span>Noted</span>
        </button>
      </footer>
    </article>
  );
}
