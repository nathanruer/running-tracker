"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { CloseButton } from "./close-button"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { inputVariants } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  allowClear?: boolean
  variant?: "outline" | "ghost"
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Choisir une date",
  className,
  allowClear = false,
}: DatePickerProps) {
  return (
    <div className="relative flex w-full">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              inputVariants({ variant: "form" }),
              "justify-start text-left font-normal text-sm hover:bg-[#141414] hover:text-foreground",
              !date && "text-muted-foreground",
              allowClear && date && "pr-10",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP", { locale: fr }) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {allowClear && date && (
        <CloseButton
          onClick={(e) => {
            e.preventDefault();
            onSelect?.(undefined);
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          iconClassName="h-3.5 w-3.5"
        />
      )}
    </div>
  )
}
