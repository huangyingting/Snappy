import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import type { RoleCode } from "@/lib/constants";

export async function WorkspaceGate({ role, children }: { role: RoleCode; children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session) redirect(`/auth/${role.toLowerCase()}`);
  if (session.role !== role) redirect(`/${session.role.toLowerCase()}`);
  return children;
}
