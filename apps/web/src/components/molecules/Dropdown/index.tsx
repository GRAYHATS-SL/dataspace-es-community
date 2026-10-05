import { useEffect, useRef, useState } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

/**
 * Dropdown - Custom dropdown with single or multiple selection.
 */

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string[];
  onSelectionChange?: (selectedValues: string[]) => void;
  placeholder?: string;
  label?: string;
  multiple?: boolean;
  className?: string;
}

export default function Dropdown({
  options,
  value = [],
  onSelectionChange,
  placeholder = 'Seleccionar...',
  label,
  multiple = true,
  className,
}: Readonly<DropdownProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>(value);

  // Sync internal state with the `value` prop
  useEffect(() => {
    setSelectedValues(value);
  }, [value]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionToggle = (optionValue: string) => {
    let newSelectedValues: string[];

    if (multiple) {
      if (selectedValues.includes(optionValue)) {
        newSelectedValues = selectedValues.filter((v) => v !== optionValue);
      } else {
        newSelectedValues = [...selectedValues, optionValue];
      }
    } else {
      newSelectedValues = selectedValues.includes(optionValue) ? [] : [optionValue];
      setIsOpen(false);
    }

    setSelectedValues(newSelectedValues);
    onSelectionChange?.(newSelectedValues);
  };

  const clearAll = () => {
    setSelectedValues([]);
    onSelectionChange?.([]);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      return options.find((opt) => opt.value === selectedValues[0])?.label || placeholder;
    }
    return `${selectedValues.length} seleccionados`;
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button variant="outline" size="lg" onClick={() => setIsOpen(!isOpen)}>
        <span className="flex items-center gap-2">
          <Icon name="ListFilter" size={16} />
          {label && (
            <Typography variant="small" className="font-medium" color="primary">
              {label}:
            </Typography>
          )}
          <Typography variant="small" className="truncate" color="primary">
            {getDisplayText()}
          </Typography>
        </span>
        <Icon
          name="ChevronDown"
          size={16}
          className={cn('transition-transform', isOpen && 'rotate-180')}
        />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-2">
            {/* Header with clear all */}
            {multiple && selectedValues.length > 0 && (
              <div className="flex items-center justify-between border-b border-gray-100 p-2">
                <Typography variant="small" color="gray">
                  {selectedValues.length} seleccionados
                </Typography>
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-auto p-1 text-xs">
                  Limpiar
                </Button>
              </div>
            )}

            {/* Options */}
            <div role={multiple ? 'group' : undefined} className="max-h-64 overflow-y-auto">
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => handleOptionToggle(option.value)}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors hover:bg-gray-50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                      isSelected && 'bg-primary/5 text-primary',
                    )}
                  >
                    {multiple && (
                      <div
                        aria-hidden="true"
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2',
                          isSelected ? 'border-primary bg-primary' : 'border-gray-300',
                        )}
                      >
                        {isSelected && <Icon name="Check" size={12} className="text-white" />}
                      </div>
                    )}
                    <Typography variant="small" className="flex-1">
                      {option.label}
                    </Typography>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
