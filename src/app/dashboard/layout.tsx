import { DashboardClientLayout } from "./dashboard-layout-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-[-1] bg-background" />

      <DashboardClientLayout>{children}</DashboardClientLayout>
    </>
  );
}
