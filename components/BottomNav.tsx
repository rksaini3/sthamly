"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/plan", label: "आज" },
  { href: "/track", label: "लक्षण" },
  { href: "/ask", label: "पूछें" },
  { href: "/consult", label: "Consult" },
  { href: "/profile", label: "प्रोफ़ाइल" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="मुख्य मेन्यू"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="relative flex min-h-[60px] items-center justify-center px-1 text-center"
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-brand"
                  />
                ) : null}
                <span
                  className={`text-[13px] ${active ? "font-semibold text-brand" : "font-medium text-muted"}`}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}