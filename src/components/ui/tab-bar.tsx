import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabBarItem = {
  label: string;
  icon: ReactNode;
  active?: boolean;
};

export function TabBar({
  items,
  className
}: {
  items: TabBarItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Preview tab bar"
      className={cn(
        "rounded-[22px] border border-[color:var(--line)] bg-[color:var(--tabbar)] px-2 py-2 backdrop-blur-[24px]",
        className
      )}
    >
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className={cn(
              "focus-ring flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[16px] px-2 py-2 text-[10px] font-medium transition",
              item.active
                ? "text-[color:var(--label)]"
                : "text-[color:var(--label3)] hover:bg-[color:color-mix(in_srgb,var(--glass)_76%,transparent)] hover:text-[color:var(--label2)]"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center",
                item.active && "text-[color:var(--accent)]"
              )}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
