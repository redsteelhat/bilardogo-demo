'use client';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as React from 'react';
import { cn } from './cn';

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({ className, align = 'end', ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={6}
        className={cn('z-50 min-w-48 rounded-2xl border border-border bg-surface-2 p-1.5 shadow-2xl', className)}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  className,
  danger,
  icon,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenu.Item> & { danger?: boolean; icon?: React.ReactNode }) {
  return (
    <DropdownMenu.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-surface-3 [&_svg]:h-4 [&_svg]:w-4',
        danger ? 'text-danger' : 'text-fg',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </DropdownMenu.Item>
  );
}

export const MenuSeparator = () => <DropdownMenu.Separator className="my-1 h-px bg-border" />;
