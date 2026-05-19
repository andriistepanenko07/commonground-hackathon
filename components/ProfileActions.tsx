"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2 } from "lucide-react";

export default function ProfileActions() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function logout() {
    setPending("logout");
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
  }

  async function del() {
    setPending("delete");
    await fetch("/api/account/delete", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="space-y-3">
      <button
        onClick={logout}
        disabled={pending !== null}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border-soft py-3 text-sm text-ink font-medium disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
      {confirming ? (
        <div className="rounded-lg border border-danger bg-danger-soft p-3">
          <p className="text-xs text-ink mb-3">
            Deletes your profile and removes you from any active group. This can&apos;t be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={del}
              disabled={pending !== null}
              className="flex-1 rounded bg-danger text-white text-xs font-semibold py-2 disabled:opacity-60"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={pending !== null}
              className="flex-1 rounded border border-border-soft text-xs text-ink font-medium py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          disabled={pending !== null}
          className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm text-danger font-medium"
        >
          <Trash2 className="h-4 w-4" />
          Delete my account
        </button>
      )}
    </div>
  );
}
