import { DeveloperTheme } from "./developer-theme";
import { SimpleTheme } from "./simple-theme";
import type { PortfolioThemeProps } from "./theme-frame";
import type { PortfolioThemeId } from "./presentation";

export interface PortfolioPreviewProps extends PortfolioThemeProps {
  theme?: PortfolioThemeId;
}

/** The editor preview and published page render the same components and data. */
export function PortfolioPreview({ theme, ...props }: PortfolioPreviewProps) {
  return (theme ?? props.data.theme) === "developer" ? <DeveloperTheme {...props} /> : <SimpleTheme {...props} />;
}
