import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/overview");
  } else {
    redirect("/login");
  }
}
