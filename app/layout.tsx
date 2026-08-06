import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "./globals.css";
export const metadata:Metadata={title:{default:"Xassida Search",template:"%s · Xassida Search"},description:"Rechercher, lire et écouter les khassaïdes de Cheikh Ahmadou Bamba."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr" suppressHydrationWarning><body><SiteHeader/><div className="min-h-screen pt-[72px]">{children}</div><SiteFooter/></body></html>}
