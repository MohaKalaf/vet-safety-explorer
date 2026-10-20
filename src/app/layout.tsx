import type { Metadata } from "next";
import "@fontsource-variable/ibm-plex-sans";
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
