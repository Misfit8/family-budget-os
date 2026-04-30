"use client";

import Script from "next/script";
import { useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Argyle: any;
  }
}

interface ArgyleLinkProps {
  userId: number;
  label?: string;
}

export default function ArgyleLink({ userId, label = "Link Uber Account" }: ArgyleLinkProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "open" | "linked" | "error">("idle");
  const [scriptLoaded, setScriptLoaded] = useState(false);

  async function openLink() {
    if (!scriptLoaded) { setStatus("error"); return; }
    setStatus("loading");

    try {
      const res = await fetch("/api/argyle/user-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) throw new Error("Token fetch failed");
      const { userToken } = await res.json();

      const link = window.Argyle.create({
        userToken,
        sandbox: process.env.NODE_ENV !== "production",
        items: ["uber", "doordash", "lyft", "instacart"],
        onAccountConnected: async ({ accountId, employer }: { accountId: string; employer: string }) => {
          await fetch("/api/argyle/account-connected", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, account_id: accountId, employer }),
          });
          setStatus("linked");
        },
        onAccountError: () => setStatus("error"),
        onClose: () => setStatus((s) => s === "linked" ? "linked" : "idle"),
      });

      setStatus("open");
      link.open();
    } catch {
      setStatus("error");
    }
  }

  if (status === "linked") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl py-3 text-center text-sm font-medium text-emerald-700">
        ✓ Account linked — earnings sync automatically
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://plugin.argyle.com/argyle.web.v5.js"
        onLoad={() => setScriptLoaded(true)}
      />
      <button
        onClick={openLink}
        disabled={status === "loading" || status === "open"}
        className="w-full bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors disabled:opacity-50"
      >
        {status === "loading" ? "Opening…" :
         status === "error"   ? "Connection failed — tap to retry" :
         label}
      </button>
    </>
  );
}
