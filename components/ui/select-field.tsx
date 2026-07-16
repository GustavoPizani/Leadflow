'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SelectField({
  value,
  onValueChange,
  defaultValue,
  name,
  placeholder,
  options,
  className,
  disabled,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  name?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      defaultValue={defaultValue}
      name={name}
      disabled={disabled}
      onValueChange={onValueChange ? (v) => onValueChange(String(v ?? '')) : undefined}
    >
      <SelectTrigger className={className ?? 'w-full'}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
