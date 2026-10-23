import { WorkspaceGate } from "@/components/WorkspaceGate";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <WorkspaceGate role="ADMIN">{children}</WorkspaceGate>;
}
