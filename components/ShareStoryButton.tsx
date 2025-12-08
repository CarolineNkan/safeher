// components/ShareStoryButton.tsx
"use client";

type ShareStoryButtonProps = {
  onClick?: () => void;
};

export default function ShareStoryButton({ onClick }: ShareStoryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-5 py-2.5 shadow-sm transition"
    >
      <span>✍️</span>
      <span>Share your story</span>
    </button>
  );
}
