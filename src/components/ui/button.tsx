import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type SharedProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

type LinkButtonProps = SharedProps & {
  href: string;
  target?: string;
  rel?: string;
};

type NativeButtonProps = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonProps = LinkButtonProps | NativeButtonProps;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[color:color-mix(in_srgb,var(--accent)_60%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent-bg)_82%,transparent),color-mix(in_srgb,var(--glass-hi)_68%,transparent))] text-[color:var(--label)] shadow-[0_14px_34px_-24px_rgba(217,194,140,0.8)] hover:border-[color:var(--accent)] hover:-translate-y-px",
  secondary:
    "border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_74%,transparent)] text-[color:var(--label2)] hover:border-[color:var(--accent)] hover:text-[color:var(--label)] hover:-translate-y-px",
  ghost:
    "border border-transparent bg-transparent text-[color:var(--label2)] hover:border-[color:var(--line)] hover:bg-[color:color-mix(in_srgb,var(--glass)_60%,transparent)] hover:text-[color:var(--label)]"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 rounded-[14px] px-4 text-sm",
  md: "h-11 rounded-[16px] px-5 text-sm",
  lg: "h-12 rounded-[16px] px-6 text-[15px]"
};

const sharedClasses =
  "focus-ring inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap text-center font-semibold leading-tight transition";

export function Button(props: ButtonProps) {
  const {
    children,
    className,
    variant = "secondary",
    size = "md",
    fullWidth = false
  } = props;

  const classes = cn(
    sharedClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    className
  );

  if ("href" in props && props.href) {
    const { href, rel, target } = props;

    return (
      <Link href={href} rel={rel} target={target} className={classes}>
        {children}
      </Link>
    );
  }

  const buttonProps = {
    ...(props as NativeButtonProps & { href?: undefined })
  };
  delete buttonProps.href;
  delete buttonProps.children;
  delete buttonProps.className;
  delete buttonProps.variant;
  delete buttonProps.size;
  delete buttonProps.fullWidth;

  const type = buttonProps.type ?? "button";
  delete buttonProps.type;

  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
