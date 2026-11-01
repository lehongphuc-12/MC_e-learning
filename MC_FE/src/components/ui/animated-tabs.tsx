import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface AnimatedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  tabClassName?: string;
  activeIndicatorClassName?: string;
  layoutId?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  tabClassName,
  activeIndicatorClassName,
  layoutId = 'animated-tab-indicator',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-xs py-1.5 px-3 gap-1.5',
    md: 'text-sm py-2 px-4 gap-2',
    lg: 'text-base py-2.5 px-5 gap-2.5',
  };

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            type="button"
            className={cn(
              'relative flex items-center justify-center font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg select-none',
              sizeClasses[size],
              isActive
                ? 'text-slate-900 font-semibold dark:text-white'
                : 'hover:text-slate-800 dark:hover:text-slate-200',
              tabClassName
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 35,
                }}
                className={cn(
                  'absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-slate-700',
                  activeIndicatorClassName
                )}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                    isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};
