import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "@/lib/catalog";

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
    return (
        <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                {items.map((item, i) => {
                    const last = i === items.length - 1;
                    return (
                        <li key={item.path} className="flex items-center gap-2">
                            {i > 0 && <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                            <Link
                                href={item.path}
                                aria-current={last ? "page" : undefined}
                                className={last ? "font-medium text-foreground" : "hover:text-primary"}
                            >
                                {item.name}
                            </Link>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
