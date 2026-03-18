"use client";

import { useState, useRef, useEffect } from "react";

interface HelpTipProps {
  explanation: string;
}

export default function HelpTip({ explanation }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="ml-1.5 w-4 h-4 rounded-full bg-zinc-200 text-zinc-500 text-[10px] font-bold leading-none flex items-center justify-center hover:bg-zinc-300 transition-colors flex-shrink-0"
        aria-label="What does this mean?"
      >
        ?
      </button>
      {open && (
        <span className="absolute left-6 top-0 z-50 w-56 bg-white border border-zinc-200 rounded-xl shadow-lg px-3 py-2.5 text-xs text-zinc-600 leading-relaxed">
          {explanation}
          <button
            onClick={() => setOpen(false)}
            className="block mt-1.5 text-zinc-400 hover:text-zinc-600 text-[10px]"
          >
            Got it ✓
          </button>
        </span>
      )}
    </span>
  );
}
