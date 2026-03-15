"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomDatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  label,
  className,
  minDate,
  maxDate,
  disabled = false,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Get locale from document or default to French
  const locale = typeof document !== "undefined" 
    ? document.documentElement.lang === "es" ? "es" : "fr"
    : "fr";

  const days = locale === "es" ? DAYS_EN : DAYS;
  const months = locale === "es" ? MONTHS_ES : MONTHS;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideContainer = containerRef.current?.contains(target);
      const clickedInsideCalendar = calendarRef.current?.contains(target);

      if (!clickedInsideContainer && !clickedInsideCalendar) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  // Reset view when closing
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setViewDate(value || new Date());
        setViewMode("days");
      }, 200);
    }
  }, [isOpen, value]);

  // Calculate calendar position
  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: Math.max(280, rect.width),
      };
    }
    return { top: 0, left: 0, width: 280 };
  }, []);

  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0, width: 280 });

  useEffect(() => {
    if (isOpen) {
      setCalendarPosition(updatePosition());

      const handleScrollResize = () => {
        setCalendarPosition(updatePosition());
      };

      window.addEventListener("scroll", handleScrollResize, true);
      window.addEventListener("resize", handleScrollResize);

      return () => {
        window.removeEventListener("scroll", handleScrollResize, true);
        window.removeEventListener("resize", handleScrollResize);
      };
    }
  }, [isOpen, updatePosition]);

  const formatDisplayDate = useMemo(() => {
    if (!value) return "";
    const day = value.getDate().toString().padStart(2, "0");
    const month = (value.getMonth() + 1).toString().padStart(2, "0");
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }, [value]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(viewDate);
    if (viewMode === "days") {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === "months") {
      newDate.setFullYear(newDate.getFullYear() + direction);
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction * 10);
    }
    setViewDate(newDate);
  };

  const handleSelectDate = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    
    // Check min/max date constraints
    if (minDate && newDate < minDate) return;
    if (maxDate && newDate > maxDate) return;
    
    onChange(newDate);
    setIsOpen(false);
  };

  const handleSelectMonth = (month: number) => {
    const newDate = new Date(viewDate.getFullYear(), month, 1);
    setViewDate(newDate);
    setViewMode("days");
  };

  const handleSelectYear = (year: number) => {
    const newDate = new Date(year, 0, 1);
    setViewDate(newDate);
    setViewMode("months");
  };

  const isDateSelected = (day: number) => {
    if (!value) return false;
    return (
      value.getDate() === day &&
      value.getMonth() === viewDate.getMonth() &&
      value.getFullYear() === viewDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewDate.getMonth() &&
      today.getFullYear() === viewDate.getFullYear()
    );
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const renderDaysView = () => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const days = [];

    // Empty cells for alignment
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const selected = isDateSelected(day);
      const today = isToday(day);
      const disabled = isDateDisabled(day);

      days.push(
        <button
          key={day}
          type="button"
          disabled={disabled}
          onClick={() => handleSelectDate(day)}
          className={cn(
            "w-8 h-8 rounded-lg text-sm font-medium transition-all duration-150",
            "flex items-center justify-center",
            disabled && "text-franol-muted/40 cursor-not-allowed",
            !disabled && selected
              ? "bg-franol-accent-blue text-white shadow-md"
              : !disabled && today
                ? "bg-franol-accent-blue/10 text-franol-accent-blue font-semibold"
                : "text-franol-text hover:bg-franol-sand"
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const renderMonthsView = () => {
    return months.map((month, index) => (
      <button
        key={index}
        type="button"
        onClick={() => handleSelectMonth(index)}
        className={cn(
          "px-2 py-2 rounded-lg text-sm font-medium transition-all duration-150",
          "hover:bg-franol-sand",
          viewDate.getMonth() === index
            ? "bg-franol-accent-blue/10 text-franol-accent-blue"
            : "text-franol-text"
        )}
      >
        {month}
      </button>
    ));
  };

  const renderYearsView = () => {
    const currentYear = viewDate.getFullYear();
    const startYear = Math.floor(currentYear / 10) * 10;
    const years = [];

    for (let year = startYear; year < startYear + 12; year++) {
      years.push(
        <button
          key={year}
          type="button"
          onClick={() => handleSelectYear(year)}
          className={cn(
            "px-2 py-2 rounded-lg text-sm font-medium transition-all duration-150",
            "hover:bg-franol-sand",
            currentYear === year
              ? "bg-franol-accent-blue/10 text-franol-accent-blue"
              : "text-franol-text"
          )}
        >
          {year}
        </button>
      );
    }

    return years;
  };

  const calendarContent = (
    <div className="bg-white rounded-xl border border-franol-warm shadow-xl p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className="p-1.5 rounded-lg hover:bg-franol-sand transition-colors"
        >
          <ChevronLeft size={16} className="text-franol-text" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (viewMode === "days") setViewMode("months");
            else if (viewMode === "months") setViewMode("years");
          }}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold text-franol-text hover:bg-franol-sand transition-colors"
        >
          {viewMode === "days" && `${months[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
          {viewMode === "months" && viewDate.getFullYear()}
          {viewMode === "years" && `${Math.floor(viewDate.getFullYear() / 10) * 10} - ${Math.floor(viewDate.getFullYear() / 10) * 10 + 11}`}
        </button>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className="p-1.5 rounded-lg hover:bg-franol-sand transition-colors"
        >
          <ChevronRight size={16} className="text-franol-text" />
        </button>
      </div>

      {/* Days header (only in days view) */}
      {viewMode === "days" && (
        <div className="grid grid-cols-7 gap-1 mb-2">
          {days.map((day) => (
            <div
              key={day}
              className="w-8 h-6 flex items-center justify-center text-xs font-medium text-franol-muted"
            >
              {day}
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div
        className={cn(
          "grid gap-1",
          viewMode === "days" ? "grid-cols-7" : "grid-cols-3"
        )}
      >
        {viewMode === "days" && renderDaysView()}
        {viewMode === "months" && renderMonthsView()}
        {viewMode === "years" && renderYearsView()}
      </div>
    </div>
  );

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-franol-muted mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "w-full px-3.5 py-2.5 rounded-xl text-sm text-left",
            "flex items-center justify-between gap-2",
            "transition-colors duration-200 ease-out",
            "border-2 shadow-sm",
            disabled && "opacity-50 cursor-not-allowed",
            isOpen
              ? "border-franol-accent-blue bg-white shadow-md"
              : "border-franol-warm/60 bg-white hover:border-franol-warm hover:shadow-md"
          )}
        >
          <div className="flex items-center gap-2.5">
            <Calendar size={16} className="text-franol-muted" />
            <span
              className={cn(
                "truncate font-medium",
                value ? "text-franol-text" : "text-franol-muted/70"
              )}
            >
              {value ? formatDisplayDate : placeholder}
            </span>
          </div>
          <ChevronDown
            size={18}
            className={cn(
              "flex-shrink-0 transition-all duration-200",
              isOpen
                ? "rotate-180 text-franol-accent-blue"
                : "text-franol-muted/60"
            )}
          />
        </button>

        {isOpen && createPortal(
          <div
            ref={calendarRef}
            style={{
              position: "absolute",
              top: calendarPosition.top,
              left: calendarPosition.left,
              width: calendarPosition.width,
              maxWidth: "320px",
            }}
            className="z-[9999] animate-fade-in"
          >
            {calendarContent}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
