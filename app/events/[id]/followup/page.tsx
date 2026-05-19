import { redirect, notFound } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { getSessionUserId } from "@/lib/session";
import { getEvent, getCluster, allUsers, allContacts } from "@/lib/store";
import FollowupPicker from "./FollowupPicker";
import AgentNotice from "@/components/AgentNotice";

export const dynamic = "force-dynamic";

export default async function FollowupPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  const cluster = await getCluster(event.cluster_id);
  if (!cluster || !cluster.member_ids.includes(userId)) notFound();

  const [usersAll, contacts] = await Promise.all([allUsers(), allContacts()]);
  const userIndex = new Map(usersAll.map((u) => [u.id, u]));
  const others = cluster.member_ids
    .filter((mid) => mid !== userId)
    .map((mid) => userIndex.get(mid))
    .filter((u): u is NonNullable<typeof u> => !!u);

  const pickedIds = contacts
    .filter((c) => c.from_user_id === userId && c.via_event_id === id)
    .map((c) => c.to_user_id);
  const pickedBackIds = new Set(
    contacts
      .filter((c) => c.to_user_id === userId && c.via_event_id === id)
      .map((c) => c.from_user_id),
  );
  const mutualIds = pickedIds.filter((oid) => pickedBackIds.has(oid));

  return (
    <div className="app-shell">
      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-8">
        <div className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">
          After the meetup
        </div>
        <HeartHandshake className="mt-4 h-10 w-10 text-accent" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-3 leading-tight">
          Met someone you&apos;d like to stay in touch with?
        </h1>
        <p className="text-ink-soft text-sm mt-2 leading-relaxed">
          Pick anyone you&apos;d like to keep in touch with. We&apos;ll share your handle with them only if they pick you back.
        </p>

        <FollowupPicker
          eventId={id}
          eventActivity={event.activity}
          others={others.map((o) => ({ id: o.id, display_name: o.display_name }))}
          pickedIds={pickedIds}
          mutualIds={mutualIds}
        />

        <AgentNotice className="text-center mt-8" />
      </main>
    </div>
  );
}
