"use client";

import { useState, useRef, useEffect } from 'react';

interface StoryCardProps {
  id: string;
  message: string;
  created_at: string;
  user_id?: string;
  likes?: number;
  helpful?: number;
  noted?: number;
  onReact?: (id: string, type: 'like' | 'helpful' | 'noted') => void;
  onEdit?: (id: string, message: string) => void;
  onDelete?: (id: string) => void;
  currentUserId?: string;
}

function extractHashtags(message: string): string[] {
  return message.match(/#\w+/g) || [];
}

export default function StoryCard({ 
  id, 
  message, 
  created_at,
  user_id,
  likes = 0, 
  helpful = 0, 
  noted = 0,
  onReact,
  onEdit,
  onDelete,
  currentUserId
}: StoryCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const hashtags = extractHashtags(message);
  const avatarLetter = message[0]?.toUpperCase() || "A";
  
  // Check if current user owns this story
  const isOwner = user_id && currentUserId && user_id === currentUserId;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleReaction = (type: 'like' | 'helpful' | 'noted') => {
    if (onReact) {
      onReact(id, type);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(id, message);
    }
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this story?')) {
      onDelete(id);
    }
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 shadow-sm">
      {/* PROFILE + TIMESTAMP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm">
            {avatarLetter}
          </div>
          <div>
            <p className="text-gray-900 font-semibold">Anonymous</p>
            <p className="text-xs text-gray-500">
              {new Date(created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
            Community report
          </span>
          
          {/* Three-dot menu - only show for story owners */}
          {isOwner && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={toggleMenu}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Story options"
              >
                <svg
                  className="w-4 h-4 text-gray-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              
              {/* Dropdown menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MESSAGE */}
      <p className="text-gray-800 leading-relaxed">{message}</p>

      {/* HASHTAGS */}
      {hashtags.length > 0 && (
        <div className="flex gap-2 flex-wrap pt-2">
          {hashtags.map((tag, index) => (
            <span
              key={index}
              className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="flex gap-6 pt-3 text-sm text-gray-600">
        <button 
          className="hover:text-purple-600 transition flex items-center gap-1"
          onClick={() => handleReaction('like')}
        >
          ❤️ Like ({likes})
        </button>
        <button 
          className="hover:text-purple-600 transition flex items-center gap-1"
          onClick={() => handleReaction('helpful')}
        >
          ✨ Helpful ({helpful})
        </button>
        <button 
          className="hover:text-purple-600 transition flex items-center gap-1"
          onClick={() => handleReaction('noted')}
        >
          👀 Noted ({noted})
        </button>
      </div>
    </div>
  );
}