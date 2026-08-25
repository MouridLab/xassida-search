"use client";

import { usePathname } from "next/navigation";
import { BrowserShell } from "./BrowserShell";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

const browserRoots = [
  "/bibliotheque",
  "/collections",
  "/favoris",
  "/khassidas",
  "/kourels",
  "/recherche-ia",
  "/search",
  "/themes",
];

function usesBrowserShell(pathname: string) {
  return browserRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (usesBrowserShell(pathname)) {
    return <BrowserShell>{children}</BrowserShell>;
  }

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen pt-[72px]">{children}</div>
      <SiteFooter />
    </>
  );
}
