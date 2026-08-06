import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:{default:"Xassida Search",template:"%s · Xassida Search"},description:"Rechercher, lire et écouter des khassaïdes à partir de sources validées."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body><header className="topbar"><a className="brand" href="/"><span>خ</span><strong>Xassida <small>Search</small></strong></a><nav><a href="/#bibliotheque">Bibliothèque</a><a href="/#assistant">Assistant sourcé</a><a href="/admin">Administration</a></nav></header>{children}<footer><strong>Xassida Search</strong><p>Chaque contenu publié doit être traçable et validé.</p></footer></body></html>}
