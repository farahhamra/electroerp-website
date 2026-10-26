import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
}
interface DropdownProps {
  id: string
  value: string
  onValueChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  name?: string
  label?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  describedBy?: string
}
const emptyValue = '__dropdown_empty__'

/** A themed select with portal positioning, typeahead, and roving keyboard focus. */
export function Dropdown({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  name,
  label,
  disabled,
  required,
  invalid,
  describedBy,
}: DropdownProps) {
  const hasEmpty = options.some((option) => option.value === '')
  return (
    <Select.Root
      name={name}
      value={value || (hasEmpty ? emptyValue : '')}
      onValueChange={(next) => onValueChange(next === emptyValue ? '' : next)}
      disabled={disabled}
      required={required}
    >
      <Select.Trigger
        id={id}
        className="dropdown-trigger"
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown size={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="dropdown-content"
          position="popper"
          sideOffset={8}
          collisionPadding={12}
        >
          <Select.ScrollUpButton className="dropdown-scroll">
            <ChevronUp size={16} />
          </Select.ScrollUpButton>
          <Select.Viewport className="dropdown-viewport">
            {options.map((option) => (
              <Select.Item
                className="dropdown-option"
                value={option.value || emptyValue}
                key={option.value}
                disabled={option.disabled}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={16} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="dropdown-scroll">
            <ChevronDown size={16} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
