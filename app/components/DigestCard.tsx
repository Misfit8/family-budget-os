"use client";

import { useEffect, useState } from "react";

interface Digest {
  id: number;
  headline: string;
  runway_status?: string;
  key_metric: string;
  insight: string;
  action_item: string;
  generated_at: string;
  fresh: boolean;
}

export default function DigestCard({ userId }: { userId: string }) {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load(force = false) {
    if (force) setRefreshing(true);
    const res = await fetch(`/api/digest/${userId}${force ? "?refresh=1" : ""}`);
    if (res.ok) setDigest(await res.json());
    setLoading(false);
    setRefreshing(false);
  }

  async function dismiss() {
    setDismissed(true);
    await fetch(`/api/digest/${userId}`, { method: "PATCH" });
  }

  useEffect(() => { load(); }, [userId]);

  if (loading) return null;
  if (dismissed || !digest) return null;

  const date = new Date(digest.generated_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  return (
    <div className="bg-zinc-800 text-white rounded-2xl p-5 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Weekly Digest · {date}</p>
          <p className="text-base font-semibold leading-snug">{digest.headline}</p>
        </div>
        <button
          onClick={dismiss}
          className="text-zinc-500 hover:text-zinc-300 text-lg leading-none ml-3 flex-shrink-0"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <div className="bg-zinc-700 rounded-xl px-4 py-2.5">
          <p className="text-xs text-zinc-400 mb-0.5">Key metric</p>
          <p className="text-sm font-medium">{digest.key_metric}</p>
        </div>

        {digest.runway_status && (
          <div className="bg-zinc-700 rounded-xl px-4 py-2.5">
            <p className="text-xs text-zinc-400 mb-0.5">Status</p>
            <p className="text-sm">{digest.runway_status}</p>
          </div>
        )}

        <div className="bg-zinc-700 rounded-xl px-4 py-2.5">
          <p className="text-xs text-zinc-400 mb-0.5">Insight</p>
          <p className="text-sm">{digest.insight}</p>
        </div>

        <div className="bg-emerald-800 rounded-xl px-4 py-2.5">
          <p className="text-xs text-emerald-400 mb-0.5">This week</p>
          <p className="text-sm font-medium">{digest.action_item}</p>
        </div>
      </div>

      <button
        onClick={() => load(true)}
        disabled={refreshing}
        className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors"
      >
        {refreshing ? "Refreshing…" : "↻ Refresh"}
      </button>
    </div>
  );
}
