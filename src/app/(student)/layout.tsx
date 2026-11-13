import { LearningShell } from "@/features/practice/client/learning-shell";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LearningShell>{children}</LearningShell>;
}
