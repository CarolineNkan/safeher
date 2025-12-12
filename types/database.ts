/**
 * Database type definitions for the story management system
 */

export interface Story {
  id: string;
  message: string;
  created_at: string;
  lat?: number;
  lng?: number;
  location?: any; // PostGIS geometry type
  user_id?: string;
  likes?: number;
  helpful?: number;
  noted?: number;
}

export interface Reaction {
  id: string;
  story_id: string;
  user_id: string;
  type: 'like' | 'helpful' | 'noted';
  created_at: string;
}

export interface ReactionCounts {
  likes: number;
  helpful: number;
  noted: number;
}

export interface StoryWithCounts extends Omit<Story, 'likes' | 'helpful' | 'noted'> {
  likes: number;
  helpful: number;
  noted: number;
}

// Database function return types
export interface GetReactionCountsResult {
  likes: number;
  helpful: number;
  noted: number;
}

export interface GetStoryWithCountsResult {
  id: string;
  message: string;
  created_at: string;
  lat: number | null;
  lng: number | null;
  location: any | null;
  user_id: string | null;
  likes: number;
  helpful: number;
  noted: number;
}

// API request/response types
export interface CreateReactionRequest {
  story_id: string;
  type: 'like' | 'helpful' | 'noted';
}

export interface DeleteStoryRequest {
  id: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Supabase database schema type
export interface Profile {
  id: string;
  home_lat: number | null;
  home_lng: number | null;
  home_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      stories: {
        Row: Story;
        Insert: Omit<Story, 'id' | 'created_at'>;
        Update: Partial<Omit<Story, 'id' | 'created_at'>>;
      };
      reactions: {
        Row: Reaction;
        Insert: Omit<Reaction, 'id' | 'created_at'>;
        Update: Partial<Omit<Reaction, 'id' | 'created_at'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Functions: {
      get_reaction_counts: {
        Args: { story_uuid: string };
        Returns: GetReactionCountsResult;
      };
      get_story_with_counts: {
        Args: { story_uuid: string };
        Returns: GetStoryWithCountsResult;
      };
      get_all_stories_with_counts: {
        Args: {};
        Returns: GetStoryWithCountsResult[];
      };
    };
  };
}