"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DemoEntry() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function go() {
    setPending(true);
    const res = await fetch("/api/demo/login", { method: "POST" });
    if (res.ok) router.push("/now");
    else setPending(false);
  }

  return (
    <button
      onClick={go}
      disabled={pending}
      className="block w-full text-xs text-ink-soft underline text-center py-2 disabled:opacity-60"
    >
      {pending ? "Loading…" : "Demo: jump in as a pre-built profile"}
    </button>
  );
}
