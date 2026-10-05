'use client';

import React, { useCallback, useRef } from 'react';

import Icon from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon: string;
}
export interface TabNavigationProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: readonly Tab[] | Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'underline';
  /** aria-label for the tablist landmark. Required for accessible context. */
  'aria-label'?: string;
}

/**
 * TabNavigation - Accessible tab bar (`tablist`) with keyboard navigation.
 */
const TabNavigation = React.forwardRef<HTMLDivElement, Readonly<TabNavigationProps>>(
  (
    {
      className,
      tabs,
      activeTab,
      onTabChange,
      variant = 'default',
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const isUnderline = variant === 'underline';
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent, currentIndex: number) => {
        const count = tabs.length;
        let nextIndex: number | null = null;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          nextIndex = (currentIndex + 1) % count;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          nextIndex = (currentIndex - 1 + count) % count;
        } else if (e.key === 'Home') {
          nextIndex = 0;
        } else if (e.key === 'End') {
          nextIndex = count - 1;
        }

        if (nextIndex !== null) {
          e.preventDefault();
          tabRefs.current[nextIndex]?.focus();
          onTabChange(tabs[nextIndex].id);
        }
      },
      [tabs, onTabChange],
    );

    if (isUnderline) {
      return (
        <div className={cn('border-b border-gray-lightest', className)} ref={ref} {...props}>
          <div
            role="tablist"
            aria-label={ariaLabel}
            className="flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((tab, index) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onTabChange(tab.id)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={cn(
                    'shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm',
                    isActive
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-gray hover:text-primary',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          className,
        )}
        ref={ref}
        {...props}
      >
        <div
          role="tablist"
          aria-label={ariaLabel}
          className="flex gap-1 border-b border-gray-100 min-w-max"
        >
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={cn(
                  'relative flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm',
                  isActive
                    ? 'text-primary bg-primary/5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-primary after:rounded-t'
                    : 'text-gray hover:text-primary hover:bg-muted cursor-pointer',
                )}
              >
                <Icon name={tab.icon} size={15} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);

TabNavigation.displayName = 'TabNavigation';

export default TabNavigation;
