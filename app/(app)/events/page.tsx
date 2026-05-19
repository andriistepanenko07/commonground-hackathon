import { redirect } from "next/navigation";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { getSessionUserId } from "@/lib/session";
import { store, LAMBDA_ID } from "@/lib/store";
import EventCard from "@/components/EventCard";
import AgentNotice from "@/components/AgentNotice";
import FindAnotherGroupCard from "@/components/FindAnotherGroupCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = store.users.get(userId);
  if (!user) redirect("/login");
  if (!user.profile_complete) redirect("/onboarding/chat");

  // Find every event tied to a cluster this user belongs to.
  const myClusters = [...store.clusters.values()].filter((c) => c.member_ids.includes(userId));
  const myClusterIds = new Set(myClusters.map((c) => c.id));
  const myEvents = [...store.events.values()].filter((e) => myClusterIds.has(e.cluster_id));

  console.log(
    `[events] lambda=${LAMBDA_ID} storeUsers=${store.users.size} storeClusters=${store.clusters.size} storeEvents=${store.events.size} forUser=${userId} myClusters=${myClusters.length} myEvents=${myEvents.length}`,
  );
  const activeClusterCount = myClusters.filter((c) => c.status !== "dissolved").length;

  const toConfirm = myEvents.filter((e) => e.status === "proposed");
  const upcoming = myEvents.filter((e) => e.status === "fired");
  const past = myEvents.filter((e) => e.status === "completed");

  if (myEvents.length === 0) {
    return (
      <div className="px-5 pt-6 pb-8 space-y-8">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">
            Events
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink mt-2">Nothing yet.</h1>
          <p className="text-ink-soft text-sm mt-2 leading-relaxed">
            When your group has a meetup proposal, it&apos;ll show up here.
          </p>
          <Link
            href="/now"
            className="mt-6 inline-block text-sm font-medium text-accent"
          >
            Go to Now to find a group →
          </Link>
        </div>

        {activeClusterCount > 0 && (
          <FindAnotherGroupCard
            interests={user.interests}
            activeClusterCount={activeClusterCount}
          />
        )}
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-8 space-y-8">
      {toConfirm.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold mb-3">
            To confirm
          </h2>
          <div className="space-y-4">
            {toConfirm.map((e) => (
              <EventCard key={e.id} event={e} currentUserId={userId} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold mb-3">
            Upcoming
          </h2>
          <div className="space-y-4">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} currentUserId={userId} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold mb-3">
            Past
          </h2>
          <div className="space-y-4">
            {past.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}/followup`}
                className="block rounded-xl border border-border-soft bg-surface p-5 card-shadow hover:bg-chip-bg/40 transition"
              >
                <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                  <HeartHandshake className="h-3 w-3 text-accent" />
                  Past meetup
                </div>
                <div className="text-lg font-semibold text-ink mt-1">{e.activity}</div>
                <div className="text-xs text-ink-soft mt-1">{e.place.name}</div>
                <div className="inline-flex items-center gap-1 text-[11px] text-accent font-semibold mt-3">
                  Follow up with the group
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {activeClusterCount > 0 && (
        <section>
          <FindAnotherGroupCard
            interests={user.interests}
            activeClusterCount={activeClusterCount}
          />
        </section>
      )}

      <AgentNotice className="text-center" />
    </div>
  );
}
