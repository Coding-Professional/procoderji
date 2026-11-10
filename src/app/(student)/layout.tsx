import { ProgressProvider } from "@/features/progress/progress-provider";
import { LearningShell } from "@/features/practice/client/learning-shell";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProgressProvider>
      <LearningShell>{children}</LearningShell>
    </ProgressProvider>
  );
}
