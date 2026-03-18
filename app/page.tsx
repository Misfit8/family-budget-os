"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

interface User {
  id: number;
  name: string;
  income_type: string;
}

const SPOKE_CONFIG: Record<string, { sub: string; emoji: string; href: (id: number) => string }> = {
  ssi: { sub: "Fixed monthly income · SSI",  emoji: "🛡️", href: (id) => `/ssi/${id}` },
  w2:  { sub: "Steady paycheck · W-2",       emoji: "💼", href: (id) => `/w2/${id}` },
  tbd: { sub: "Not set up yet",              emoji: "❓", href: () => "#" },
};

function MemberCard({ user, onRenamed }: { user: User; onRenamed: (id: number, name: string) => void }) {
  const config = SPOKE_CONFIG[user.income_type];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === user.name) { setEditing(false); setDraft(user.name); return; }
    setSaving(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setSaving(false);
    if (res.ok) { onRenamed(user.id, trimmed); setEditing(false); }
    else { setDraft(user.name); setEditing(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") { setEditing(false); setDraft(user.name); }
  }

  const href = config ? config.href(user.id) : "#";
  const emoji = config?.emoji ?? "👤";
  const sub = config?.sub ?? "";

  return (
    <div className="flex items-center gap-4 bg-white border border-zinc-200 rounded-xl px-5 py-4 text-zinc-800 font-medium hover:border-zinc-400 transition-colors">
      <Link href={href} className="flex items-center gap-4 flex-1 min-w-0">
        <span className="text-2xl flex-shrink-0">{emoji}</span>
        <div className="min-w-0">
          {editing ? null : <div className="font-semibold truncate">{user.name}</div>}
          <div className="text-xs text-zinc-400 mt-0.5">{sub}</div>
        </div>
      </Link>

      {editing ? (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-2xl flex-shrink-0">{emoji}</span>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={handleKeyDown}
            maxLength={40}
            disabled={saving}
            className="flex-1 border border-zinc-300 rounded-lg px-2 py-1 text-sm font-semibold text-zinc-800 outline-none focus:border-zinc-500 bg-white"
            style={{ fontSize: "16px" }}
          />
          <button
            onClick={save}
            disabled={saving}
            className="text-xs text-zinc-500 border border-zinc-200 rounded-lg px-2 py-1 hover:border-zinc-400 flex-shrink-0"
          >
            {saving ? "…" : "Save"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-zinc-300 hover:text-zinc-500 transition-colors flex-shrink-0 p-1"
          title="Rename"
          aria-label="Rename"
        >
          ✏️
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, []);

  function handleRenamed(id: number, name: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, name } : u)));
  }

  // Split: gig users (1 & 2) go to the shared /gig/household spoke
  // Everyone else gets their own card with inline rename
  const individuals = users.filter((u) => u.income_type !== "gig");

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-zinc-800 mb-1">Family Budget OS</h1>
      <p className="text-zinc-500 text-sm mb-6">Select your dashboard</p>

      <div className="mb-6 w-full max-w-xs">
        <ThemeToggle />
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/hub"
          className="flex items-center gap-4 bg-zinc-800 text-white rounded-xl px-5 py-4 font-medium"
        >
          <span className="text-2xl">🏠</span>
          <div>
            <div className="font-semibold">Family Hub</div>
            <div className="text-xs text-zinc-400 mt-0.5">Shared bills · household overview</div>
          </div>
        </Link>

        <div className="border-t border-zinc-200 my-1" />

        <Link
          href="/gig/household"
          className="flex items-center gap-4 bg-white border border-zinc-200 rounded-xl px-5 py-4 text-zinc-800 font-medium hover:border-zinc-400 transition-colors"
        >
          <span className="text-2xl">🛵</span>
          <div>
            <div className="font-semibold">Parents</div>
            <div className="text-xs text-zinc-400 mt-0.5">Gig delivery · earnings & runway</div>
          </div>
        </Link>

        {individuals.map((u) => (
          <MemberCard key={u.id} user={u} onRenamed={handleRenamed} />
        ))}

        <div className="border-t border-zinc-200 my-1" />

        <Link
          href="/help"
          className="flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors py-2"
        >
          <span>?</span>
          <span>Help & Glossary</span>
        </Link>
      </div>
    </div>
  );
}
