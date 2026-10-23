import { AccountRecovery } from "@/components/AccountRecovery";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AccountRecovery purpose="verify" token={token} />;
}
