"use client";

import { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Brand } from "@/components/brand";

export function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    drawer.current?.close();
  }, [pathname]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) drawer.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 flex min-h-[72px] items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <Brand />
        <button
          ref={toggle}
          type="button"
          onClick={() => drawer.current?.showModal()}
          aria-label="Open navigation menu"
          aria-haspopup="dialog"
          aria-controls="notes-navigation"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>
      <dialog
        ref={drawer}
        id="notes-navigation"
        aria-label="Navigation menu"
        onClose={() => toggle.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) drawer.current?.close();
        }}
        className="notes-drawer fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[90vw] border-r border-border bg-background text-foreground backdrop:bg-black/40"
      >
        <button
          type="button"
          onClick={() => drawer.current?.close()}
          aria-label="Close navigation menu"
          className="absolute top-3 right-2 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-accent"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <AppSidebar className="h-full w-full border-none" />
      </dialog>
      <div className="sticky top-0 hidden h-screen md:block">
        <AppSidebar />
      </div>
      <main id="main-content" className="min-w-0 flex-1 pt-[72px] md:pt-0">
        <div className="mx-auto max-w-6xl p-5 sm:p-8 lg:px-12 lg:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
