type IconName = "search"|"moon"|"globe"|"user"|"arabic"|"file"|"headphones"|"tag"|"book"|"spark"|"bot"|"school"|"heart"|"mosque"|"leaf"|"hourglass"|"shield"|"lock"|"check"|"play"|"send"|"message";

export function Icon({name,size=20}:{name:IconName;size?:number}) {
  const common={width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true};
  const paths:Record<IconName,React.ReactNode>={
    search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, moon:<path d="M20 15a8 8 0 0 1-11-11 8.5 8.5 0 1 0 11 11Z"/>,
    globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>, user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    arabic:<><path d="M7 5c-3 3-3 11 1 14M11 8c2 1 4 1 6-1M13 12h6"/><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/></>, file:<><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6"/></>,
    headphones:<><path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z"/></>, tag:<><path d="M3 11V4h7l11 11-6 6z"/><circle cx="7.5" cy="7.5" r="1"/></>,
    book:<><path d="M3 5a8 8 0 0 1 9 2v14a8 8 0 0 0-9-2zM21 5a8 8 0 0 0-9 2v14a8 8 0 0 1 9-2z"/></>, spark:<><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5zM19 17v4M17 19h4"/></>,
    bot:<><rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/></>, school:<><path d="m3 10 9-5 9 5-9 5zM7 13v4c3 2 7 2 10 0v-4M21 10v6"/></>,
    heart:<path d="M20 5c-2-2-5-1-8 2-3-3-6-4-8-2-3 3-1 8 8 15 9-7 11-12 8-15Z"/>, mosque:<><path d="M5 21V10h14v11M9 21v-5a3 3 0 0 1 6 0v5M4 10h16M8 10V7l4-4 4 4v3"/></>,
    leaf:<><path d="M20 4C10 4 5 9 5 16c5 1 12-1 15-12ZM4 20c3-5 7-8 12-11"/></>, hourglass:<><path d="M6 3h12M6 21h12M7 3c0 5 2 6 5 9-3 3-5 4-5 9M17 3c0 5-2 6-5 9 3 3 5 4 5 9"/></>,
    shield:<path d="M12 3 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6z"/>, lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    check:<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>, play:<><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></>, send:<><path d="m3 11 18-8-8 18-2-8zM11 13l4-4"/></>,
    message:<><path d="M4 5h16v12H9l-5 4z"/><circle cx="9" cy="11" r=".7" fill="currentColor"/><circle cx="12" cy="11" r=".7" fill="currentColor"/><circle cx="15" cy="11" r=".7" fill="currentColor"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}
