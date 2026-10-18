"use client";

import { DropdownMenu as Menu } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const MenuDeroulant = Menu.Root;
export const MenuDeroulantDeclencheur = Menu.Trigger;

export function MenuDeroulantContenu({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        className={cn("z-50 min-w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md", className)}
        {...props}
      />
    </Menu.Portal>
  );
}

export function MenuDeroulantElement({ className, ...props }: React.ComponentProps<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2.5 text-sm outline-none focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 md:py-2 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function MenuDeroulantLibelle({ className, ...props }: React.ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn("px-3 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function MenuDeroulantSeparateur({ className, ...props }: React.ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn("my-1 h-px bg-border", className)} {...props} />;
}
