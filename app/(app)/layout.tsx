import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <div className="px-5 pt-4 pb-2 text-[11px] uppercase tracking-[0.2em] font-semibold text-accent">
        Common Ground
      </div>
      <main className="flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
