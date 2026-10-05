'use client';

import { ChevronDown } from 'lucide-react';
import React from 'react';

import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

/** FaqItem - Accessible accordion item (WAI-ARIA) for a question and its answer. */

/** Props of `FaqItem`. */
export interface FaqItemProps {
  id: string;
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: string) => void;
  className?: string;
}

const FaqItem: React.FC<Readonly<FaqItemProps>> = ({
  id,
  question,
  answer,
  isOpen,
  onToggle,
  className,
}) => {
  const headingId = `faq-heading-${id}`;
  const panelId = `faq-panel-${id}`;

  return (
    <div className={cn('border-b border-gray-lightest last:border-b-0', className)}>
      <h3>
        <button
          id={headingId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => onToggle(id)}
          className={cn(
            'flex w-full items-center justify-between gap-4 py-4 text-left md:gap-6 md:py-5',
            'rounded-sm focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-secondary focus-visible:ring-offset-2',
          )}
        >
          <Typography as="span" variant="subtitle" color="primary">
            {question}
          </Typography>
          <ChevronDown
            className={cn(
              'size-5 shrink-0 transition-all duration-300',
              isOpen ? 'rotate-180 text-primary' : 'text-gray-light',
            )}
            aria-hidden="true"
          />
        </button>
      </h3>

      {/* grid-rows animation: no height calculation needed */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-4 pr-4 md:pb-6 md:pr-10">
            {typeof answer === 'string' ? (
              <Typography variant="body" color="gray" className="leading-relaxed">
                {answer}
              </Typography>
            ) : (
              answer
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaqItem;
