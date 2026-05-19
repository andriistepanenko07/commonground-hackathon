import type { Cluster, SafeMember } from "@/lib/types";
import ClusterAvatars from "./ClusterAvatars";

// Takes SafeMember[], NOT User[] — the caller is responsible for stripping unsafe fields
// (toSafeMember in lib/types.ts) before passing in. This keeps email/status/life_stage from
// ever entering the component tree, including Next.js's dev-mode RSC metadata.
export function ClusterPreview({
  cluster,
  members,
}: {
  cluster: Cluster;
  members: SafeMember[];
}) {
  return (
    <div>
      <ClusterAvatars members={members} sharedInterests={cluster.shared_interests} />
      <div className="flex flex-wrap gap-1.5 mt-4">
        {cluster.shared_interests.map((t) => (
          <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-chip-bg text-chip-text">
            {t}
          </span>
        ))}
      </div>
      <p className="text-xs text-ink-soft mt-4">
        {members.length} people in {cluster.city}.
      </p>
    </div>
  );
}
