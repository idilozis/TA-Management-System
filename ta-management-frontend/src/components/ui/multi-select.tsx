import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface Option {
  [key: string]: any
}

interface MultiSelectProps {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  labelKey: string
  valueKey: string
  placeholder?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  labelKey,
  valueKey,
  placeholder = "Select items...",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const selected = options.filter((option) => value.includes(option[valueKey]))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.map((option) => (
                <Badge
                  variant="secondary"
                  key={option[valueKey]}
                  className="mr-1"
                >
                  {option[labelKey]}
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>No item found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option[valueKey]}
                onSelect={() => {
                  const newValue = value.includes(option[valueKey])
                    ? value.filter((v) => v !== option[valueKey])
                    : [...value, option[valueKey]]
                  onChange(newValue)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value.includes(option[valueKey]) ? "opacity-100" : "opacity-0"
                  )}
                />
                {option[labelKey]}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 