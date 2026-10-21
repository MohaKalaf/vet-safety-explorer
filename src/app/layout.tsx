import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/ibm-plex-sans";
import { NavLink } from "@/components/NavLink";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vet Safety Explorer",
  description:
    "Explore side-effect reports for veterinary medicines, using public data from openFDA.",
  // Has its own dark mode; stops Dark Reader restyling it.
  other: { "darkreader-lock": "true" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Extensions add attributes to <html> before hydration. Only silences this element.
    <html lang="en-GB" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <div className="mx-auto max-w-5xl px-4 sm:px-8">
          <header className="flex items-baseline justify-between gap-6 border-b border-rule py-5">
            <Link href="/" className="font-medium">
              Vet Safety Explorer
            </Link>
            <nav className="flex gap-5 text-sm">
              <NavLink href="/">Explorer</NavLink>
              <NavLink href="/signals">Signals</NavLink>
            </nav>
          </header>

          {children}

          <footer className="border-t border-rule py-8 text-sm leading-relaxed text-slate">
            <p className="max-w-2xl">
              Data from{" "}
              <a
                href="https://open.fda.gov/apis/animalandveterinary/event/"
                className="underline underline-offset-4 hover:text-ink"
              >
                openFDA
              </a>
              , the US Food and Drug Administration&apos;s public API. Reports are unverified
              and mostly from the US. Don&apos;t use this site to make decisions about an
              animal&apos;s care; ask a vet.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
