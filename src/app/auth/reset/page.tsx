import { AccountRecovery } from "@/components/AccountRecovery";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AccountRecovery purpose="reset" token={token} />;
}
