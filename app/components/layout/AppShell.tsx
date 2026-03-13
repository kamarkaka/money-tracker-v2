import { Topbar } from "./Topbar";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string | null;
}

export function AppShell({ children, userName }: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Topbar userName={userName} />
      <main className="mx-auto min-w-[960px] max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
