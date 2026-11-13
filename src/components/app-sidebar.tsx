"use client";

import * as React from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { usePathname } from "next/navigation";
import {
  Brain,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCourses } from "@/lib/courses";
import { dashboardHref } from "@/lib/catalog";

interface NavItem {
  title: string;
  href?: string;
  icon?: LucideIcon;
  items?: NavItem[];
}

// Built from the catalogue so the sidebar can never link to pages that don't exist.
const navigationData: NavItem[] = getCourses().map((course) => ({
  title: course.title,
  icon: GraduationCap,
  items: course.branches.map((branch) => ({
    title: branch.short ?? branch.title,
    items: branch.semesters.map((sem) => ({
      title: sem.title,
      href: dashboardHref([course.slug, branch.slug, sem.slug]),
    })),
  })),
}));

function containsPath(items: NavItem[], pathname: string): boolean {
  return items.some(
    (child) =>
      child.href === pathname ||
      (child.items && containsPath(child.items, pathname)),
  );
}

const SidebarItem = ({ item }: { item: NavItem }) => {
  const pathname = usePathname();
  // `null` = follow the current route; once the user toggles, their choice wins.
  const [manualOpen, setManualOpen] = React.useState<boolean | null>(null);
  const hasChildren = !!item.items && item.items.length > 0;
  const isActive = item.href ? pathname === item.href : false;
  const isOpen =
    manualOpen ?? (hasChildren && containsPath(item.items!, pathname));

  return (
    <div>
      {item.href ? (
        <Link
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors relative group",
            "hover:text-sidebar-accent-foreground",
            isActive
              ? "bg-accent text-primary font-semibold"
              : "text-sidebar-foreground/70",
          )}
        >
          {item.icon && (
            <item.icon
              aria-hidden="true"
              className={cn(
                "w-4 h-4 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
          )}
          <span>{item.title}</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setManualOpen(!isOpen)}
          aria-expanded={hasChildren ? isOpen : undefined}
          className={cn(
            "flex min-h-11 w-full items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors group",
            "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
            "text-sidebar-foreground/80",
          )}
        >
          <div className="flex items-center gap-2">
            {item.icon && (
              <item.icon
                aria-hidden="true"
                className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors"
              />
            )}
            <span>{item.title}</span>
          </div>
          {hasChildren && (
            <ChevronRight
              aria-hidden="true"
              className={cn(
                "w-4 h-4 transition-transform duration-200 text-muted-foreground",
                isOpen && "rotate-90",
              )}
            />
          )}
        </button>
      )}

      {isOpen && hasChildren && (
        <div>
          <div className="border-l border-sidebar-border/50 ml-5 pl-1 my-1 space-y-1">
            {item.items!.map((child) => (
              <SidebarItem key={child.href ?? child.title} item={child} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export function AppSidebar({ className }: { className?: string }) {
  return (
    <aside
      aria-label="Notes navigation"
      className={cn(
        "w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0",
        className,
      )}
    >
      <div className="p-4 border-b border-sidebar-border">
        <Brand />
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Your study desk
        </div>
        <Link
          href="/learn"
          className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LayoutDashboard aria-hidden="true" className="h-4 w-4" /> My learning
        </Link>
        <Link
          href="/practice"
          className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Brain aria-hidden="true" className="h-4 w-4" /> Placement practice
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LayoutDashboard aria-hidden="true" className="w-4 h-4" />
          Browse Notes
        </Link>
        <Link
          href="/games"
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Brain aria-hidden="true" className="w-4 h-4" />
          Practice Games
        </Link>

        <div className="mt-4 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Library
        </div>
        {navigationData.map((item) => (
          <SidebarItem key={item.title} item={item} />
        ))}
      </nav>
    </aside>
  );
}
