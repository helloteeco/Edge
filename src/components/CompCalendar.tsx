"use client";

import { useState, useMemo } from "react";

interface CalendarDay {
  date: string;
  available: boolean;
}

interface CompCalendarProps {
  comparables: {
    id?: string;
    name: string;
    url?: string;
    adr?: number;
    occupancy?: number;
    dailyCalendar?: CalendarDay[];
  }[];
  occupancyData?: Record<string, {
    occupancyRate: number;
    bookedDays: number;
    totalDays: number;
    peakMonths: string[];
    lowMonths: string[];
    dailyCalendar?: CalendarDay[];
  }>;
}

export default function CompCalendar({ comparables, occupancyData }: CompCalendarProps) {
  const [selectedCompIdx, setSelectedCompIdx] = useState(0);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Get comps that have calendar data
  const compsWithCalendar = useMemo(() => {
    return comparables.map((comp, idx) => {
      const roomId = comp.id || comp.url?.match(/\/rooms\/(\d+)/)?.[1] || "";
      const occData = occupancyData?.[roomId];
      const calendar = occData?.dailyCalendar || [];
      return {
        ...comp,
        roomId,
        calendar,
        hasCalendar: calendar.length > 0,
        occupancyRate: occData?.occupancyRate,
        peakMonths: occData?.peakMonths || [],
        lowMonths: occData?.lowMonths || [],
        idx,
      };
    }).filter(c => c.hasCalendar);
  }, [comparables, occupancyData]);

  if (compsWithCalendar.length === 0) {
    return null;
  }

  const selectedComp = compsWithCalendar[selectedCompIdx] || compsWithCalendar[0];

  // Build calendar grid for the selected month
  const calendarGrid = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Create a map of dates to availability
    const dateMap = new Map<string, boolean>();
    for (const entry of selectedComp.calendar) {
      dateMap.set(entry.date, entry.available);
    }

    const weeks: { day: number | null; available: boolean | null; dateStr: string }[][] = [];
    let currentWeek: { day: number | null; available: boolean | null; dateStr: string }[] = [];

    // Fill in empty days before the first day
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({ day: null, available: null, dateStr: "" });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const available = dateMap.has(dateStr) ? dateMap.get(dateStr)! : null;
      currentWeek.push({ day, available, dateStr });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill remaining days in the last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ day: null, available: null, dateStr: "" });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [viewMonth, selectedComp]);

  // Calculate month stats
  const monthStats = useMemo(() => {
    const { year, month } = viewMonth;
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthDays = selectedComp.calendar.filter(d => d.date.startsWith(monthPrefix));
    const booked = monthDays.filter(d => !d.available).length;
    const total = monthDays.length;
    const occupancy = total > 0 ? Math.round((booked / total) * 100) : 0;
    return { booked, total, occupancy };
  }, [viewMonth, selectedComp]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  const navigateMonth = (direction: number) => {
    setViewMonth(prev => {
      let newMonth = prev.month + direction;
      let newYear = prev.year;
      if (newMonth < 0) { newMonth = 11; newYear--; }
      if (newMonth > 11) { newMonth = 0; newYear++; }
      return { year: newYear, month: newMonth };
    });
  };

  // Get color for a day cell
  const getDayColor = (available: boolean | null) => {
    if (available === null) return "transparent";
    if (available) return "#dcfce7"; // green-100 — available
    return "#fee2e2"; // red-100 — booked
  };

  const getDayBorder = (available: boolean | null) => {
    if (available === null) return "transparent";
    if (available) return "#86efac"; // green-300
    return "#fca5a5"; // red-300
  };

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold" style={{ color: "#2b2823" }}>Comp Calendar</h3>
          <p className="text-xs" style={{ color: "#787060" }}>Real availability from Airbnb calendars</p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#dcfce7", border: "1px solid #86efac" }}></span>
          <span style={{ color: "#787060" }}>Available</span>
          <span className="inline-block w-3 h-3 rounded-sm ml-2" style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5" }}></span>
          <span style={{ color: "#787060" }}>Booked</span>
        </div>
      </div>

      {/* Comp selector pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        {compsWithCalendar.map((comp, i) => (
          <button
            key={comp.roomId}
            onClick={() => setSelectedCompIdx(i)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
            style={{
              backgroundColor: selectedCompIdx === i ? "#2b2823" : "#f5f4f0",
              color: selectedCompIdx === i ? "#ffffff" : "#787060",
              border: selectedCompIdx === i ? "none" : "1px solid #e5e3da",
            }}
          >
            #{comp.idx + 1} {comp.name.length > 20 ? comp.name.slice(0, 20) + "…" : comp.name}
          </button>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: "#787060" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <span className="text-sm font-semibold" style={{ color: "#2b2823" }}>
            {monthNames[viewMonth.month]} {viewMonth.year}
          </span>
          <div className="flex items-center justify-center gap-3 mt-0.5">
            <span className="text-xs" style={{ color: "#787060" }}>
              {monthStats.booked}/{monthStats.total} nights booked
            </span>
            <span className="text-xs font-semibold" style={{ 
              color: monthStats.occupancy >= 70 ? "#16a34a" : monthStats.occupancy >= 40 ? "#f59e0b" : "#ef4444" 
            }}>
              {monthStats.occupancy}% occ.
            </span>
          </div>
        </div>
        <button
          onClick={() => navigateMonth(1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: "#787060" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e3da" }}>
        {/* Day headers */}
        <div className="grid grid-cols-7" style={{ backgroundColor: "#f5f4f0" }}>
          {dayNames.map((name, i) => (
            <div key={i} className="text-center py-2">
              <span className="text-[10px] font-semibold" style={{ color: "#787060" }}>{name}</span>
            </div>
          ))}
        </div>

        {/* Weeks */}
        {calendarGrid.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7" style={{ borderTop: "1px solid #f0efe8" }}>
            {week.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className="text-center py-2 relative"
                style={{
                  backgroundColor: getDayColor(day.available),
                  borderLeft: dayIdx > 0 ? "1px solid #f0efe8" : "none",
                  minHeight: "36px",
                }}
              >
                {day.day !== null && (
                  <>
                    <span className="text-xs font-medium" style={{ 
                      color: day.available === null ? "#c4c0b8" : day.available ? "#16a34a" : "#dc2626" 
                    }}>
                      {day.day}
                    </span>
                    {day.available !== null && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                        <div 
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: day.available ? "#22c55e" : "#ef4444" }}
                        ></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Selected comp info */}
      <div className="mt-3 p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: "#f5f4f0" }}>
        <div>
          <p className="text-xs font-semibold" style={{ color: "#2b2823" }}>
            {selectedComp.name.length > 30 ? selectedComp.name.slice(0, 30) + "…" : selectedComp.name}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            {selectedComp.occupancyRate !== undefined && (
              <span className="text-xs" style={{ color: "#787060" }}>
                {selectedComp.occupancyRate}% annual occ.
              </span>
            )}
            {selectedComp.adr && (
              <span className="text-xs" style={{ color: "#787060" }}>
                ${selectedComp.adr}/night
              </span>
            )}
          </div>
        </div>
        {selectedComp.url && (
          <a
            href={selectedComp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
            style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
          >
            View Listing
          </a>
        )}
      </div>

      {/* Peak/Low season tags */}
      {(selectedComp.peakMonths.length > 0 || selectedComp.lowMonths.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedComp.peakMonths.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px]" style={{ color: "#787060" }}>Peak:</span>
              {selectedComp.peakMonths.map((m, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}>
                  {m}
                </span>
              ))}
            </div>
          )}
          {selectedComp.lowMonths.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px]" style={{ color: "#787060" }}>Low:</span>
              {selectedComp.lowMonths.map((m, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#fffbeb", color: "#f59e0b" }}>
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
