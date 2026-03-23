import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { AppShell } from "@/app/components/layout/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <AppShell userName={session.user.name} userImage={session.user.image}>{children}</AppShell>;
}
