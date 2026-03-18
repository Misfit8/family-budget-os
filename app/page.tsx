import Link from "next/link";

const FAMILY = [
  { id: 1, name: "Mom", type: "gig", emoji: "🛵" },
  { id: 2, name: "Dad", type: "gig", emoji: "🛵" },
  { id: 3, name: "Braddon", type: "ssi", emoji: "🛡️" },
  { id: 4, name: "Bro1", type: "w2", emoji: "💼" },
  { id: 5, name: "Bro2", type: "tbd", emoji: "❓" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-zinc-800 mb-1">Family Budget OS</h1>
      <p className="text-zinc-500 text-sm mb-8">Who are you?</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
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
        {FAMILY.map((m) => {
          const href =
            m.type === "gig"
              ? `/gig/${m.id}`
              : m.type === "ssi"
              ? `/ssi/${m.id}`
              : m.type === "w2"
              ? `/w2/${m.id}`
              : "#";
          return (
            <Link
              key={m.id}
              href={href}
              className="flex items-center gap-4 bg-white border border-zinc-200 rounded-xl px-5 py-4 text-zinc-800 font-medium hover:border-zinc-400 transition-colors"
            >
              <span className="text-2xl">{m.emoji}</span>
              <div>
                <div className="font-semibold">{m.name}</div>
                <div className="text-xs text-zinc-400 uppercase tracking-wide">{m.type}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
