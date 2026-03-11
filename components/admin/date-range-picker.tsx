'use client'

import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths } from 'date-fns'
import type { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

const presets = [
  { label: 'Today', getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: '7D', getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: '30D', getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  {
    label: 'This Month',
    getRange: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }),
  },
  {
    label: 'Last Month',
    getRange: () => {
      const prev = subMonths(new Date(), 1)
      return { from: startOfMonth(prev), to: endOfMonth(prev) }
    },
  },
]

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const selectedRange: DateRange | undefined =
    from && to
      ? { from: new Date(from), to: new Date(to) }
      : from
        ? { from: new Date(from) }
        : undefined

  function handleSelect(range: DateRange | undefined) {
    if (range?.from && range?.to) {
      onChange(format(range.from, 'yyyy-MM-dd'), format(range.to, 'yyyy-MM-dd'))
    } else if (range?.from) {
      onChange(format(range.from, 'yyyy-MM-dd'), '')
    } else {
      onChange('', '')
    }
  }

  function applyPreset(preset: (typeof presets)[number]) {
    const { from: f, to: t } = preset.getRange()
    onChange(format(f, 'yyyy-MM-dd'), format(t, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const displayText =
    from && to
      ? `${format(new Date(from), 'MMM d, yyyy')} – ${format(new Date(to), 'MMM d, yyyy')}`
      : from
        ? `${format(new Date(from), 'MMM d, yyyy')} – …`
        : 'Pick date range'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 justify-start gap-2 text-left font-normal',
            !from && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="size-4" />
          <span className="hidden sm:inline">{displayText}</span>
          <span className="sm:hidden">
            {from ? format(new Date(from), 'MMM d') : 'Dates'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-wrap gap-1 border-b p-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={{ after: new Date() }}
          defaultMonth={from ? new Date(from) : subMonths(new Date(), 1)}
        />
      </PopoverContent>
    </Popover>
  )
}
