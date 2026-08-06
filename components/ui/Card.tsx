import { cn } from "@/lib/utils";
export function Card({className,...props}:React.HTMLAttributes<HTMLElement>){return <article className={cn("rounded-2xl border border-line bg-surface shadow-card",className)} {...props}/>}
