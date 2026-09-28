"use client";

import { Select } from "@base-ui/react/select";
import { CaretDown, Check } from "@phosphor-icons/react";

export type SelectOption = { value: string; label: string; disabled?: boolean };

/** Shared admin field. Base UI owns typeahead, roving focus and dismissal. */
export default function AdminSelect({
  label,
  value,
  onValueChange,
  options,
  disabled = false,
  hideLabel = false,
  className = "",
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string;
}) {
  return (
    <div className={`admin-select-field ${className}`}>
      <Select.Root
        items={options}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next);
        }}
      >
        <Select.Label className={hideLabel ? "sr-only" : "admin-select-label"}>
          {label}
        </Select.Label>
        <Select.Trigger className="admin-select-trigger">
          <Select.Value className="admin-select-value" />
          <Select.Icon className="admin-select-icon">
            <CaretDown size={14} aria-hidden />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            className="admin-select-positioner"
            align="start"
            sideOffset={6}
            collisionPadding={12}
            alignItemWithTrigger={false}
          >
            <Select.Popup className="admin-select-popup">
              <Select.List className="admin-select-list">
                {options.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="admin-select-option"
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator className="admin-select-check">
                      <Check size={15} weight="bold" aria-hidden />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
