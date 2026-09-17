import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";

export default async function RootPage() {
  const user = await getAuthUser();

  redirect(user ? "/home" : "/login");
}
