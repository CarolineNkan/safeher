"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import StoryCard from "@/components/StoryCard";

interface Story {
  id: string;
  message: string;
  created_at: string;
  user_id?: string;
  likes?: number;
  helpful?: number;
  noted?: number;
}

export default function StoryFeed() {
  const [story, setStory] = useState("");
  const [stories, setStories] = useState<Story[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  
  // Mock current user ID - in a real app, this would come from authentication
  const currentUserId = "mock-user-id";

  // Initial fetch of stories
  useEffect(() => {
    fetchStories();
  }, []);

  // Real-time subscriptions for stories and reactions
  useEffect(() => {
    // Subscribe to stories table changes
    const storiesChannel = supabase
      .channel('stories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories'
        },
        (payload) => {
          console.log('Stories change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Add new story to the top of the feed
            const newStory = {
              ...payload.new,
              likes: 0,
              helpful: 0,
              noted: 0
            } as Story;
            
            setStories((current) => {
              // Avoid duplicates
              if (current.some(story => story.id === newStory.id)) {
                return current;
              }
              return [newStory, ...current];
            });
          } else if (payload.eventType === 'UPDATE') {
            // Update existing story
            setStories((current) =>
              current.map((story) =>
                story.id === payload.new.id 
                  ? { ...story, ...payload.new }
                  : story
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted story
            setStories((current) =>
              current.filter((story) => story.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Subscribe to reactions table changes
    const reactionsChannel = supabase
      .channel('reactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions'
        },
        async (payload) => {
          console.log('Reactions change received:', payload);
          
          // When reactions change, we need to refresh the affected story's counts
          let storyId: string | null = null;
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            storyId = payload.new.story_id;
          } else if (payload.eventType === 'DELETE') {
            storyId = payload.old.story_id;
          }
          
          if (storyId) {
            try {
              // Get updated reaction counts for the affected story
              const { data: counts, error: countsError } = await supabase
                .rpc('get_reaction_counts', { story_uuid: storyId });

              if (!countsError && counts && counts.length > 0) {
                // Update the story with new reaction counts
                setStories((current) =>
                  current.map((story) =>
                    story.id === storyId
                      ? {
                          ...story,
                          likes: counts[0].likes || 0,
                          helpful: counts[0].helpful || 0,
                          noted: counts[0].noted || 0
                        }
                      : story
                  )
                );
              }
            } catch (error) {
              console.error('Failed to update reaction counts:', error);
            }
          }
        }
      )
      .subscribe();

    // Cleanup function to unsubscribe from channels
    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(reactionsChannel);
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
      if (editingStoryId) {
        // Update existing story
        // Note: This would require an update API endpoint which isn't implemented yet
        // For now, we'll just create a new story and remove the old one
        alert("Story editing will be implemented in a future update. For now, please delete and recreate your story.");
        setEditingStoryId(null);
        setStory("");
      } else {
        // Create new story
        const response = await fetch("/api/stories/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            story: story.trim(),
            user_id: currentUserId, // Include user ID for ownership
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Clear textarea
          setStory("");
          
          // Add story to top of feed immediately
          setStories((current) => [result.story, ...current]);
        } else {
          alert("Failed to submit story. Please try again.");
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Failed to submit story. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReaction(id: string, type: 'like' | 'helpful' | 'noted') {
    try {
      const response = await fetch(`/api/stories/react/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, user_id: currentUserId }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the story in local state immediately
        setStories((current) =>
          current.map((story) =>
            story.id === id ? result.story : story
          )
        );
      }
    } catch (error) {
      console.error(`Failed to ${type} story:`, error);
    }
  }

  function handleEdit(id: string, message: string) {
    // Populate the composer with the story content for editing
    setStory(message);
    setEditingStoryId(id);
    
    // Scroll to the composer
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch('/api/stories/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (result.success) {
        // Remove the story from local state immediately
        setStories((current) => current.filter((story) => story.id !== id));
      } else {
        alert('Failed to delete story. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete story:', error);
      alert('Failed to delete story. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* HEADER */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Community Stories</h1>
          <p className="text-gray-600">
            Real experiences from women walking the same streets
          </p>
        </div>

        {/* COMPOSER */}
        <div className="bg-purple-50/70 backdrop-blur-sm border border-purple-200/60 rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm">
                You
              </div>
              <p className="text-gray-900 font-semibold">
                {editingStoryId ? "Edit your story" : "Share your safety experience"}
              </p>
            </div>
            {editingStoryId && (
              <button
                onClick={() => {
                  setEditingStoryId(null);
                  setStory("");
                }}
                className="text-purple-500 hover:text-purple-700 text-sm transition-colors duration-200"
              >
                Cancel
              </button>
            )}
          </div>

          <textarea
            className="w-full p-4 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 border border-purple-200/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 focus:bg-white/90 outline-none min-h-[150px] resize-none transition-all duration-200 placeholder:text-purple-400/70"
            placeholder="What happened? Use #hashtags to categorize your experience…"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            disabled={isSubmitting}
          />

          <div className="flex justify-between items-center">
            <p className="text-xs text-purple-600/70">
              {editingStoryId 
                ? "Update your story to reflect any changes" 
                : "Your story helps other women plan safer routes"
              }
            </p>
            <button
              className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white py-2 px-6 rounded-xl font-semibold hover:opacity-90 hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              onClick={submit}
              disabled={isSubmitting || !story.trim()}
            >
              {isSubmitting 
                ? (editingStoryId ? "Updating..." : "Sharing...") 
                : (editingStoryId ? "Update Story" : "Share Story")
              }
            </button>
          </div>
        </div>

        {/* FEED */}
        <div className="space-y-4">
          {stories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No stories yet — be the first to share!</p>
            </div>
          )}

          {stories.map((storyItem) => (
            <StoryCard
              key={storyItem.id}
              id={storyItem.id}
              message={storyItem.message}
              created_at={storyItem.created_at}
              user_id={storyItem.user_id}
              likes={storyItem.likes || 0}
              helpful={storyItem.helpful || 0}
              noted={storyItem.noted || 0}
              currentUserId={currentUserId}
              onReact={handleReaction}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}