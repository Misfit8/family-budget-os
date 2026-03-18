"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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

const BACK: Record<string, string> = {
  "1": "/gig/household",
  "2": "/gig/household",
  "3": "/ssi/3",
  "4": "/w2/4",
  "5": "/",
};

export default function DigestPage() {
  const { userId } = useParams<{ userId: string }>();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(force = false) {
    if (force) setRefreshing(true);
    const res = await fetch(`/api/digest/${userId}${force ? "?refresh=1" : ""}`);
    if (res.ok) setDigest(await res.json());
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, [userId]);

  const backHref = BACK[userId] ?? "/";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400 text-sm">Loading your digest…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={backHref} className="text-zinc-400 text-sm">← Back</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Weekly Digest</h1>
      </div>

      {!digest ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center">
          <p className="text-zinc-500 text-sm mb-2">No digest yet.</p>
          <p className="text-xs text-zinc-400 mb-4">
            Your first digest generates automatically once you have some activity logged.
          </p>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="bg-zinc-800 text-white rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {refreshing ? "Generating…" : "Generate Now"}
          </button>
        </div>
      ) : (
        <>
          <div className="bg-zinc-800 text-white rounded-2xl p-5 mb-4">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">
              Week of {new Date(digest.generated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
            <p className="text-xl font-semibold leading-snug">{digest.headline}</p>
          </div>

          <div className="flex flex-col gap-3 mb-4">
            <Section label="Key number" content={digest.key_metric} />
            {digest.runway_status && <Section label="Status" content={digest.runway_status} />}
            <Section label="What the data says" content={digest.insight} />
            <Section label="One thing to focus on this week" content={digest.action_item} accent />
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-4 mb-4">
            <p className="text-xs text-zinc-400 mb-2">
              Your digest updates weekly. Claude looks at your recent activity and writes a
              personalized summary — no financial advice, just honest numbers.
            </p>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="text-sm text-zinc-600 font-medium hover:text-zinc-800 disabled:opacity-50 transition-colors"
            >
              {refreshing ? "Refreshing…" : "↻ Refresh digest"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ label, content, accent }: { label: string; content: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "bg-emerald-50 border-emerald-200" : "bg-white border-zinc-200"}`}>
      <p className={`text-xs uppercase tracking-widest mb-1.5 ${accent ? "text-emerald-600" : "text-zinc-400"}`}>
        {label}
      </p>
      <p className={`text-sm leading-relaxed ${accent ? "text-emerald-900 font-medium" : "text-zinc-700"}`}>
        {content}
      </p>
    </div>
  );
}
