import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const styles = cva("inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-45", {
  variants: {
    variant: {
      primary: "bg-brand text-white shadow-sm hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lift",
      secondary: "border border-line bg-surface text-ink hover:border-brand/25 hover:bg-brand/5",
      ghost: "text-muted hover:bg-brand/5 hover:text-brand",
      success: "bg-emerald-700 text-white hover:bg-emerald-800",
    },
    size: { sm: "h-9 px-3", md: "h-11 px-4", lg: "h-13 px-6 text-[15px]" },
  }, defaultVariants: { variant: "primary", size: "md" },
});

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof styles>;
export function Button({ className, variant, size, ...props }: Props) { return <button className={cn(styles({variant,size}),className)} {...props}/>; }
export { styles as buttonStyles };
