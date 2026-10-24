"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/plan", label: "Plan" },
  { href: "/track", label: "Track" },
  { href: "/ask", label: "पूछें" },
  { href: "/consult", label: "Consult" },
  { href: "/profile", label: "Profile" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="मुख्य मेन्यू"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] items-center justify-center px-1 text-center text-xs font-medium ${
                  active ? "text-brand" : "text-neutral-700"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}