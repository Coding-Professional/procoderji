import { DashboardClientLayout } from "./dashboard-layout-client";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <div
                aria-hidden="true"
                className="fixed inset-0 z-[-1] bg-gradient-to-b from-background via-background to-muted/30"
            />

            <DashboardClientLayout>
                {children}
            </DashboardClientLayout>
        </>
    );
}
