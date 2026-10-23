import { WorkspaceGate } from "@/components/WorkspaceGate";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <WorkspaceGate role="RECIPIENT">{children}</WorkspaceGate>;
}
