"use client";

import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-zinc-800 mb-1">Family Budget OS</h1>
      <p className="text-zinc-500 text-sm mb-6">Who are you?</p>

      <div className="mb-6 w-full max-w-xs">
        <ThemeToggle />
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {/* Family Hub */}
        <Link
          href="/hub"
          className="flex items-center gap-4 bg-zinc-800 text-white rounded-xl px-5 py-4 font-medium"
        >
          <span className="text-2xl">🏠</span>
          <div>
            <div className="font-semibold">Family Hub</div>
            <div className="text-xs text-zinc-400 uppercase tracking-wide">household</div>
          </div>
        </Link>

        <div className="border-t border-zinc-200 my-1" />

        {/* Mom + Dad — gig household */}
        <Link
          href="/gig/household"
          className="flex items-center gap-4 bg-white border border-zinc-200 rounded-xl px-5 py-4 text-zinc-800 font-medium hover:border-zinc-400 transition-colors"
        >
          <span className="text-2xl">🛵</span>
          <div className="flex-1">
            <div className="font-semibold">Mom + Dad</div>
            <div className="text-xs text-zinc-400 uppercase tracking-wide">gig · household</div>
          </div>
        </Link>

        {/* Individual gig dashboards */}
        <div className="grid grid-cols-2 gap-2 pl-2">
          <Link
            href="/gig/1"
            className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-700 text-sm font-medium hover:border-zinc-400 transition-colors"
          >
            <span>🛵</span>
            <div>
              <div className="font-semibold">Mom</div>
              <div className="text-xs text-zinc-400">individual</div>
            </div>
          </Link>
          <Link
            href="/gig/2"
            className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-700 text-sm font-medium hover:border-zinc-400 transition-colors"
          >
            <span>🛵</span>
            <div>
              <div className="font-semibold">Dad</div>
              <div className="text-xs text-zinc-400">individual</div>
            </div>
          </Link>
        </div>

        <div className="border-t border-zinc-200 my-1" />

        {/* Other family members */}
        {[
          { id: 3, name: "Braddon", type: "ssi", emoji: "🛡️", href: "/ssi/3" },
          { id: 4, name: "Bro1", type: "w2", emoji: "💼", href: "/w2/4" },
          { id: 5, name: "Bro2", type: "tbd", emoji: "❓", href: "#" },
        ].map((m) => (
          <Link
            key={m.id}
            href={m.href}
            className="flex items-center gap-4 bg-white border border-zinc-200 rounded-xl px-5 py-4 text-zinc-800 font-medium hover:border-zinc-400 transition-colors"
          >
            <span className="text-2xl">{m.emoji}</span>
            <div>
              <div className="font-semibold">{m.name}</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wide">{m.type}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
