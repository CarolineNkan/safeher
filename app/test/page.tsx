"use client";

import { supabase } from "@/lib/supabaseClient";

export default function TestPage() {
  const handleTest = async () => {
    const { data, error } = await supabase.auth.signUp({
      email: "carolinetest1@gmail.com",
      password: "password123",
    });

    console.log("DATA:", data);
    console.log("ERROR:", error);
  };

  return (
    <div>
      <h1>Supabase Auth Test</h1>
      <button
        onClick={handleTest}
        style={{ padding: "10px", background: "purple", color: "white" }}
      >
        Test SignUp
      </button>
    </div>
  );
}
