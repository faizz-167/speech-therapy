import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border-4 border-black font-bold text-sm uppercase tracking-wide whitespace-nowrap transition-all duration-100 ease-out outline-none select-none neo-push disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-neo-accent text-black shadow-[4px_4px_0px_0px_#000] hover:brightness-110 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
        secondary: "bg-neo-secondary text-black shadow-[4px_4px_0px_0px_#000] hover:brightness-110 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
        outline: "bg-white text-black shadow-[4px_4px_0px_0px_#000] hover:bg-neo-secondary active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
        ghost: "border-transparent hover:border-black hover:bg-neo-muted hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
        destructive: "bg-neo-accent text-black shadow-[4px_4px_0px_0px_#000] hover:bg-red-500 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
        link: "border-0 text-black underline-offset-4 hover:underline font-bold",
      },
      size: {
        default: "h-12 gap-2 px-6",
        xs: "h-8 gap-1 px-3 text-xs border-2",
        sm: "h-10 gap-1.5 px-4 text-xs",
        lg: "h-14 gap-2 px-8 text-base",
        icon: "size-12",
        "icon-xs": "size-8 border-2",
        "icon-sm": "size-10",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
