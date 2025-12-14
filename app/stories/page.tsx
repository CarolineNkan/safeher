"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ---------- anonymous ownership ---------- */
function getClientId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("safeher_client_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("safeher_client_id", id);
  }
  return id;
}

export default function StoriesPage() {
  const clientId = getClientId();

  const [stories, setStories] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  /* ---------- load ---------- */
  async function loadStories() {
    const res = await fetch("/api/stories/list", { cache: "no-store" });
    const json = await res.json();
    setStories(json.stories || []);
  }

  useEffect(() => {
    loadStories();
  }, []);

  /* ---------- create ---------- */
  async function submitStory() {
    if (!message.trim()) return;

    setLoading(true);
    await fetch("/api/stories/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        client_id: clientId,
      }),
    });

    setMessage("");
    setLoading(false);
    loadStories();
  }

  /* ---------- reactions ---------- */
  async function react(storyId: string, reaction: string) {
    await fetch("/api/stories/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        story_id: storyId,
        reaction,
        client_id: clientId,
      }),
    });
    loadStories();
  }

  /* ---------- delete (FIXED) ---------- */
  async function deleteStory(id: string) {
    const res = await fetch("/api/stories/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        client_id: clientId,
      }),
    });

    if (!res.ok) {
      console.error("Delete failed");
      return;
    }

    setOpenMenuId(null);
    loadStories();
  }

  /* ---------- edit ---------- */
  async function saveEdit(id: string) {
    if (!editText.trim()) return;

    await fetch("/api/stories/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        message: editText,
        client_id: clientId,
      }),
    });

    setEditingId(null);
    setEditText("");
    setOpenMenuId(null);
    loadStories();
  }

  return (
    <div className="min-h-screen bg-purple-50 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-purple-600 hover:underline">
          ← Back home
        </Link>

        {/* ================= POST COMPOSER (YOUR UI) ================= */}
        <div className="bg-white border rounded-2xl p-4 mt-6">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share what happened, where you felt unsafe, or advice for others…"
            className="w-full p-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={4}
          />

          <button
            onClick={submitStory}
            disabled={loading}
            className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? "Posting…" : "Share Story"}
          </button>

          <p className="text-xs text-gray-500 mt-2">
            Location sharing is optional. Stories are shared anonymously.
          </p>
        </div>

        {/* ================= HEADER ================= */}
        <h1 className="text-3xl font-semibold mt-6">Community Stories</h1>
        <p className="text-gray-600 mt-1">
          Real experiences shared by women to help others stay safe.
        </p>

        {/* ================= STORIES ================= */}
        <div className="mt-8 space-y-4">
          {stories.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl p-5 shadow relative">
              {/* MESSAGE */}
              {editingId === s.id ? (
                <>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-2 border rounded-lg resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveEdit(s.id)}
                      className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditText("");
                      }}
                      className="px-3 py-1 border rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-gray-900">{s.message}</p>
              )}

              {/* META */}
              <p className="text-xs text-gray-500 mt-2">
                {s.lat && s.lng ? "Shared with location" : "Location not shared"} ·{" "}
                {new Date(s.created_at).toLocaleString()}
              </p>

              {/* REACTIONS */}
              <div className="flex items-center gap-4 mt-4 text-sm">
                <button onClick={() => react(s.id, "like")}>
                  ❤️ {s.reactions.like}
                </button>
                <button onClick={() => react(s.id, "helpful")}>
                  👍 {s.reactions.helpful}
                </button>
                <button onClick={() => react(s.id, "noted")}>
                  📌 {s.reactions.noted}
                </button>
              </div>

              {/* 3-DOT MENU */}
              {s.client_id === clientId && (
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() =>
                      setOpenMenuId(openMenuId === s.id ? null : s.id)
                    }
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ⋯
                  </button>

                  {openMenuId === s.id && (
                    <div className="absolute right-0 mt-2 w-28 bg-white border rounded-xl shadow-md z-10">
                      <button
                        onClick={() => {
                          setEditingId(s.id);
                          setEditText(s.message);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteStory(s.id)}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




