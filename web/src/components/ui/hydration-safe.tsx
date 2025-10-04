/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { ReactNode, ElementType } from 'react';

interface HydrationSafeProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  [key: string]: any;
}

/**
 * A wrapper component that safely handles hydration mismatches
 * caused by browser extensions injecting attributes.
 * 
 * Use this for containers that might be affected by browser extensions
 * like div elements with flex classes or any containers that show
 * hydration warnings.
 */
export function HydrationSafe({ 
  children, 
  className, 
  as: Component = 'div',
  ...props 
}: HydrationSafeProps) {
  return (
    <Component 
      className={className} 
      suppressHydrationWarning={true}
      {...props}
    >
      {children}
    </Component>
  );
}
