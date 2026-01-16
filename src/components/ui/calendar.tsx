"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"
import { fr } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={fr}
      className={cn(
        "group/calendar p-3 [--cell-size:2rem]",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("fr-FR", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit p-1", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 z-10",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 rounded-lg p-0 opacity-50 hover:opacity-100 hover:bg-muted transition-all active:scale-95",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 rounded-lg p-0 opacity-50 hover:opacity-100 hover:bg-muted transition-all active:scale-95",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-8 w-full items-center justify-center px-8",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-8 w-full items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-tight",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm transition-all has-focus:border-violet-500/50 has-focus:ring-violet-500/20 has-focus:ring-2",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "bg-popover absolute inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex justify-between mt-2", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground/50 flex-1 select-none text-[9px] font-black uppercase tracking-widest text-center",
          defaultClassNames.weekday
        ),
        week: cn("mt-1.5 flex w-full gap-1", defaultClassNames.week),
        day: cn(
          "group/day relative aspect-square h-8 w-8 select-none p-0 text-center flex items-center justify-center",
          defaultClassNames.day
        ),
        today: cn(
          "before:content-[''] before:absolute before:bottom-1 before:left-1/2 before:-translate-x-1/2 before:size-1 before:bg-violet-500 before:rounded-full font-bold",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground/30 opacity-40 aria-selected:text-muted-foreground/40",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-30",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "h-8 w-8 p-0 font-semibold text-sm transition-all rounded-lg active:scale-95 text-foreground/90",
        "hover:bg-white/5 hover:text-white",
        "data-[selected-single=true]:bg-violet-600 data-[selected-single=true]:text-white data-[selected-single=true]:font-bold",
        "data-[range-start=true]:bg-violet-600 data-[range-start=true]:text-white data-[range-end=true]:bg-violet-600 data-[range-end=true]:text-white data-[range-middle=true]:bg-violet-500/10 data-[range-middle=true]:text-violet-500 data-[range-middle=true]:rounded-none",
        "group-data-[focused=true]/day:bg-white/5",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
