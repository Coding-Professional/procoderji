import { PortfolioEditor } from "@/features/portfolio/editor/portfolio-editor";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Portfolio Builder",
  description: "Prepare your student portfolio, preview two themes, and manage your private draft and public page.",
  path: "/learn/portfolio",
  noindex: true,
});

export default function PortfolioEditorPage() {
  return <PortfolioEditor />;
}
