"use client";

import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

const MEMBERS = [
  { id: 3, name: "Braddon", sub: "Fixed monthly income · SSI", emoji: "🛡️", href: "/ssi/3" },
  { id: 4, name: "Bro1",    sub: "Steady paycheck · W-2",      emoji: "💼", href: "/w2/4" },
  { id: 5, name: "Bro2",    sub: "Not set up yet",              emoji: "❓", href: "#" },
];

export default function Home() {
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

        {MEMBERS.map((m) => (
          <Link
            key={m.id}
            href={m.href}
            className="flex items-center gap-4 bg-white border border-zinc-200 rounded-xl px-5 py-4 text-zinc-800 font-medium hover:border-zinc-400 transition-colors"
          >
            <span className="text-2xl">{m.emoji}</span>
            <div>
              <div className="font-semibold">{m.name}</div>
              <div className="text-xs text-zinc-400 mt-0.5">{m.sub}</div>
            </div>
          </Link>
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
