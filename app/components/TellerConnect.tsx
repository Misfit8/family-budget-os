"use client";

import { useEffect, useRef } from "react";

interface TellerEnrollment {
  accessToken: string;
  user: { id: string };
  enrollment: { id: string; institution: { name: string } };
}

declare global {
  interface Window {
    TellerConnect?: {
      setup: (config: {
        applicationId: string;
        onSuccess: (enrollment: TellerEnrollment) => void;
        onExit?: () => void;
      }) => { open: () => void };
    };
  }
}

interface Props {
  userId: number;
  label?: string;
  onConnected?: () => void;
}

export default function TellerConnect({ userId, label = "Link Bank Account", onConnected }: Props) {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;
    const script = document.createElement("script");
    script.src = "https://cdn.teller.io/connect/connect.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  async function openTeller() {
    if (!window.TellerConnect) {
      alert("Teller Connect is still loading, try again in a moment.");
      return;
    }

    const connect = window.TellerConnect.setup({
      applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID ?? "",
      onSuccess: async (enrollment) => {
        await fetch("/api/teller/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, enrollment }),
        });
        onConnected?.();
      },
    });

    connect.open();
  }

  return (
    <button
      onClick={openTeller}
      className="w-full bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-sm font-medium hover:border-zinc-400 transition-colors text-left px-4 flex items-center justify-between"
    >
      <span>{label}</span>
      <span className="text-zinc-400 text-xs">+ Link</span>
    </button>
  );
}
