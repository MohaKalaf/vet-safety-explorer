"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "text-ink underline decoration-signal decoration-2 underline-offset-8"
          : "text-slate hover:text-ink"
      }
    >
      {children}
    </Link>
  );
}
