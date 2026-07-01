import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { FiLoader } from "react-icons/fi";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    "transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-[#FCD34D] text-black border-2 border-black shadow-[4px_4px_0px_0px_#FCD34D] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#FCD34D] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150",

        destructive:
          "bg-red-500 text-white border-2 border-black shadow-[4px_4px_0px_0px_#ef4444] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#ef4444] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150",

        outline:
          "bg-white text-black border-2 border-black shadow-[4px_4px_0px_0px_#ffffff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#ffffff] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150",

        secondary:
          "bg-gray-300 text-black border-2 border-black shadow-[4px_4px_0px_0px_#d1d5db] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#d1d5db] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150",

        ghost:
          "bg-transparent text-(--text) border-2 border-(--border) shadow-[4px_4px_0px_0px_#ffffff] hover:bg-white hover:text-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#ffffff] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150",

        link: "text-blue-500 underline underline-offset-4 font-bold hover:text-blue-400 transition-colors duration-150",
      },

      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },

      fullWidth: {
        true: "w-full",
      },

      loading: {
        true: "cursor-not-allowed",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({
            variant,
            size,
            fullWidth,
            loading,
          }),
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <FiLoader className="animate-spin" />}

        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button };