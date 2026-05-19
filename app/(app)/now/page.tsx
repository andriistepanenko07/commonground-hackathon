import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { getSessionUserId } from "@/lib/session";
import { store, LAMBDA_ID } from "@/lib/store";
import { toSafeMember } from "@/lib/types";
import { ClusterPreview } from "@/components/ClusterPreview";
import FindGroupButton from "@/components/FindGroupButton";
import AgentNotice from "@/components/AgentNotice";
import HalfGroup from "@/components/illustrations/HalfGroup";

export const dynamic = "force-dynamic";

export default async function NowPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = store.users.get(userId);
  if (!user) redirect("/login");
  if (!user.profile_complete) redirect("/onboarding/chat");

  const clusters = [...store.clusters.values()].filter(
    (c) => c.member_ids.includes(userId) && c.status !== "dissolved",
  );

  console.log(
    `[now] lambda=${LAMBDA_ID} storeUsers=${store.users.size} storeClusters=${store.clusters.size} forUser=${userId} myClusters=${clusters.length}`,
  );

  if (clusters.length === 0) {
    return (
      <div className="px-5 pt-6 pb-8">
        <div className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">
          Now
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-2">
          Ready for a new group?
        </h1>
        <p className="text-ink-soft text-sm mt-2 leading-relaxed">
          Tap below and an AI agent will find 4–5 people in {user.city} who share what you like to do.
        </p>

        <HalfGroup className="mt-6 mx-auto w-40 h-auto text-accent/70" />

        <div className="mt-6">
          <FindGroupButton />
        </div>
        <div className="mt-6 rounded-xl border border-border-soft bg-chip-bg p-4 text-xs text-ink-soft">
          Each group exists to produce one meetup. Don&apos;t love a group? Open Events and find another, on your terms.
        </div>
        <AgentNotice className="mt-6 text-center" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-8 space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">
          Now
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-2">
          {clusters.length === 1 ? "Your group" : `Your groups (${clusters.length})`}
        </h1>
        <p className="text-ink-soft text-sm mt-2">
          {clusters.length === 1
            ? "Open the Events tab to see your meetup proposal."
            : "Each group runs on its own track. Open the Events tab to see all proposals."}
        </p>
      </div>

      {clusters.map((cluster) => {
        const memberUsers = cluster.member_ids
          .map((id) => store.users.get(id))
          .filter((u): u is NonNullable<typeof u> => !!u);
        const members = memberUsers.map(toSafeMember);

        const event = [...store.events.values()].find(
          (e) => e.cluster_id === cluster.id && e.status !== "cancelled",
        );

        return (
          <div
            key={cluster.id}
            className="rounded-xl border border-border-soft bg-surface p-5 card-shadow"
          >
            <ClusterPreview cluster={cluster} members={members} />
            {event ? (
              <Link
                href="/events"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent"
              >
                See the proposal
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <p className="mt-4 text-sm text-ink-soft italic inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                An AI agent is preparing a meetup proposal…
              </p>
            )}
          </div>
        );
      })}

      <AgentNotice className="text-center" />
    </div>
  );
}
