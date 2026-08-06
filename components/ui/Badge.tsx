import { cn } from "@/lib/utils";
export function Badge({children,className}:{children:React.ReactNode;className?:string}){return <span className={cn("inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted",className)}>{children}</span>}
