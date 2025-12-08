"use client";
import { useState } from "react";
import { Bell, MessageCircle, MapPin, Heart } from "lucide-react";

interface Notification {
  id: string;
  type: "alert" | "reply" | "location" | "system";
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

const iconMap = {
  alert: <Bell className="w-5 h-5 text-purple-500" />,
  reply: <MessageCircle className="w-5 h-5 text-purple-500" />,
  location: <MapPin className="w-5 h-5 text-purple-500" />,
  system: <Heart className="w-5 h-5 text-purple-500" />
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "alert",
      title: "New safety alert nearby",
      message: "A woman reported an unsafe interaction near Elm Street.",
      time: "5 min ago",
      unread: true
    },
    {
      id: "2",
      type: "reply",
      title: "Someone replied to your story",
      message: "“Thank you for sharing. I also walk that route daily…”",
      time: "1 hr ago",
      unread: false
    },
    {
      id: "3",
      type: "location",
      title: "Route update",
      message: "Lighting data changed for one of your usual routes.",
      time: "Yesterday",
      unread: false
    }
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white px-5 py-6">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
      </div>

      {/* Subtext */}
      <p className="text-gray-600 mb-6">
        Updates that help you stay aware and feel supported.
      </p>

      <div className="flex flex-col gap-4">
        {notifications.map((note) => (
          <div
            key={note.id}
            className={`p-5 rounded-2xl shadow-sm border 
              transition-all cursor-pointer
              bg-white/80 hover:bg-purple-50
              ${note.unread ? "border-purple-300" : "border-gray-200"}`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="mt-1">{iconMap[note.type]}</div>

              {/* Text */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">{note.title}</h2>
                  {note.unread && (
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  )}
                </div>
                <p className="text-gray-600 mt-1 text-sm leading-relaxed">
                  {note.message}
                </p>
                <p className="text-xs text-gray-400 mt-2">{note.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

    </main>
  );
}
