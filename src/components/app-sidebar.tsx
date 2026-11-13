"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronRight, GraduationCap, LayoutDashboard, type LucideIcon } from "lucide-react";
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
  return items.some((child) => child.href === pathname || (child.items && containsPath(child.items, pathname)));
}

const SidebarItem = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
  const pathname = usePathname();
  // `null` = follow the current route; once the user toggles, their choice wins.
  const [manualOpen, setManualOpen] = React.useState<boolean | null>(null);
  const hasChildren = !!item.items && item.items.length > 0;
  const isActive = item.href ? pathname === item.href : false;
  const isOpen = manualOpen ?? (hasChildren && containsPath(item.items!, pathname));

  return (
    <div>
      {item.href ? (
        <Link
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 relative group",
            "hover:text-sidebar-accent-foreground",
            isActive ? "text-sidebar-accent-foreground font-semibold" : "text-sidebar-foreground/70",
            depth > 0 && "ml-4"
          )}
        >
          {isActive && (
            <motion.div
              layoutId="active-indicator"
              className="absolute inset-0 bg-sidebar-accent/50 rounded-md -z-10"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            />
          )}
          {item.icon && (
            <item.icon
              aria-hidden="true"
              className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}
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
            "flex w-full items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors group",
            "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
            "text-sidebar-foreground/80",
            depth > 0 && "ml-4"
          )}
        >
          <div className="flex items-center gap-2">
            {item.icon && (
              <item.icon aria-hidden="true" className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
            <span>{item.title}</span>
          </div>
          {hasChildren && (
            <ChevronRight
              aria-hidden="true"
              className={cn("w-4 h-4 transition-transform duration-200 text-muted-foreground", isOpen && "rotate-90")}
            />
          )}
        </button>
      )}

      <AnimatePresence>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-l border-sidebar-border/50 ml-5 pl-1 my-1 space-y-1">
              {item.items!.map((child) => (
                <SidebarItem key={child.href ?? child.title} item={child} depth={depth + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function AppSidebar({ className }: { className?: string }) {
  return (
    <aside
      aria-label="Notes navigation"
      className={cn("w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0", className)}
    >
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform</div>
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

        <div className="mt-4 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Library</div>
        {navigationData.map((item) => (
          <SidebarItem key={item.title} item={item} />
        ))}
      </nav>
    </aside>
  );
}
