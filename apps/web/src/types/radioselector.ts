// Shared types for RadioSelector and RadioOption
import type { ChangeEventHandler, FocusEventHandler, ReactNode, Ref } from 'react';

import { type ValidIconName } from '@/components/atoms/Icon';

export type RadioOptionVariant = 'simple' | 'complex';

export interface BaseRadioOption {
  value: string;
  disabled?: boolean;
}

export interface SimpleRadioOption extends BaseRadioOption {
  label: string;
}

export interface ComplexRadioOption extends BaseRadioOption {
  title: string;
  description: string;
  icon: ValidIconName;
}

export type RadioSelectorOption = SimpleRadioOption | ComplexRadioOption;

export interface RadioSelectorProps {
  options: RadioSelectorOption[];
  variant?: RadioOptionVariant;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  disabled?: boolean;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  name?: string;
  inputRef?: Ref<HTMLInputElement>;
}

export interface RadioOptionProps extends BaseRadioOption {
  name?: string;
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  children?: ReactNode;
  className?: string;
  id?: string;
  title?: string;
  description?: string;
  icon?: ValidIconName;
  variant?: RadioOptionVariant;
  inputRef?: Ref<HTMLInputElement>;
}
