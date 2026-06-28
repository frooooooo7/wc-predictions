"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Smooth scroll to top when navigating between tabs/pages. */
export function RouteScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [pathname]);

  return null;
}
