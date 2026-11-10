import { LearnerDashboard } from "@/features/practice/client/learner-dashboard";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "My Learning",
  description:
    "Review your placement practice, choose your next topic, and build a manageable study routine with ProCoderJii.",
  path: "/learn",
  noindex: true,
});

export default function LearnPage() {
  return <LearnerDashboard />;
}
