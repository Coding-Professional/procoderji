import { ThemeFrame, type PortfolioThemeProps } from "./theme-frame";

export function SimpleTheme(props: PortfolioThemeProps) {
  return <ThemeFrame {...props} variant="simple" />;
}
