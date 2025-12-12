"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import StoryCard from "@/components/StoryCard";

interface Story {
  id: string;
  message: string;
  created_at: string;
  lat?: number;
  lng?: number;
}

export default function StoriesPage() {
  const [story, setStory] = useState("");
  const [stories, setStories] = useState<Story[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Initial fetch of stories
  useEffect(() => {
    fetchStories();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("stories-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stories",
        },
        (payload) => {
          console.log("New story received:", payload);
          const newStory = payload.new as Story;
          setStories((current) => [newStory, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchStories() {
    try {
      const response = await fetch("/api/stories/list");
      const data = await response.json();
      setStories(data);
    } catch (error) {
      console.error("Failed to fetch stories:", error);
    }
  }

  async function submit() {
    if (!story.trim()) {
      alert("Please write a story first.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Optimistic UI update - add story immediately
      const optimisticStory: Story = {
        id: `temp-${Date.now()}`,
        message: story,
        created_at: new Date().toISOString(),
      };
      
      setStories((current) => [optimisticStory, ...current]);
      setStory("");

      // Submit to server
      const response = await fetch("/api/stories/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          lat: null,
          lng: null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Remove optimistic story and let real-time update handle the real one
        setStories((current) => 
          current.filter((s) => s.id !== optimisticStory.id)
        );
        router.refresh();
      } else {
        // Remove optimistic story on error
        setStories((current) => 
          current.filter((s) => s.id !== optimisticStory.id)
        );
        alert("Failed to submit story. Please try again.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      // Remove optimistic story on error
      setStories((current) => 
        current.filter((s) => s.id.startsWith("temp-"))
      );
      alert("Failed to submit story. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Community Stories</h1>
        <p className="text-purple-300">
          Share your experiences and help other women stay safe
        </p>
      </div>

      {/* COMPOSER */}
      <div className="bg-[#0e0f1a] border border-purple-700/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 flex items-center justify-center text-white font-bold">
            You
          </div>
          <p className="text-white font-semibold">Share your safety experience</p>
        </div>

        <textarea
          className="w-full p-4 rounded-xl bg-black/20 text-white border border-purple-600/40 focus:border-purple-400 outline-none min-h-[120px] resize-none"
          placeholder="What happened? Use #hashtags to categorize your experience..."
          value={story}
          onChange={(e) => setStory(e.target.value)}
          disabled={isSubmitting}
        />

        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Your story helps other women plan safer routes
          </p>
          <button
            className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white py-2 px-6 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
            onClick={submit}
            disabled={isSubmitting || !story.trim()}
          >
            {isSubmitting ? "Sharing..." : "Share Story"}
          </button>
        </div>
      </div>

      {/* FEED */}
      <div className="space-y-4">
        {stories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No stories yet — be the first to share!</p>
          </div>
        )}

        {stories.map((storyItem) => (
          <StoryCard
            key={storyItem.id}
            id={storyItem.id}
            message={storyItem.message}
            created_at={storyItem.created_at}
          />
        ))}
      </div>
    </div>
  );
}