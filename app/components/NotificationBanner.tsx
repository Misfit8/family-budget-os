"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
}

const TYPE_STYLE: Record<string, { border: string; dot: string }> = {
  RUNWAY_CRITICAL: { border: "border-red-200",    dot: "bg-red-500" },
  RUNWAY_LOW:      { border: "border-amber-200",  dot: "bg-amber-400" },
  SET_ASIDE_GAP:   { border: "border-amber-200",  dot: "bg-amber-400" },
  ASSET_CRISIS:    { border: "border-red-200",    dot: "bg-red-500" },
  ASSET_RED:       { border: "border-red-200",    dot: "bg-red-400" },
  ASSET_AMBER:     { border: "border-amber-200",  dot: "bg-amber-400" },
};

function getStyle(type: string) {
  return TYPE_STYLE[type] ?? { border: "border-zinc-200", dot: "bg-zinc-400" };
}

export default function NotificationBanner({ userId }: { userId: string }) {
  const [notes, setNotes] = useState<Notification[]>([]);

  async function load() {
    const res = await fetch(`/api/notifications/${userId}`);
    if (res.ok) setNotes(await res.json());
  }

  async function dismiss(id: number) {
    setNotes((n) => n.filter((x) => x.id !== id));
    await fetch(`/api/notifications/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  useEffect(() => { load(); }, [userId]);

  if (notes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-4">
      {notes.map((n) => {
        const style = getStyle(n.type);
        return (
          <div
            key={n.id}
            className={`bg-white rounded-xl border ${style.border} px-4 py-3 flex items-start gap-3`}
          >
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800">{n.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{n.body}</p>
              {n.action_url && (
                <Link
                  href={n.action_url}
                  className="text-xs text-zinc-400 underline mt-1 inline-block hover:text-zinc-600"
                >
                  Review →
                </Link>
              )}
            </div>
            <button
              onClick={() => dismiss(n.id)}
              className="text-zinc-300 hover:text-zinc-500 text-sm flex-shrink-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
