import { AccountPanel } from "@/features/account/account-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Account and Learning Data",
  description:
    "Manage your learning account, sync placement practice across devices, and export or delete your practice history.",
  path: "/account",
  noindex: true,
});
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return <AccountPanel authFailed={(await searchParams).error === "auth"} />;
}
