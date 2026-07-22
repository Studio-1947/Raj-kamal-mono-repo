import React, { useState, useRef, useEffect, useMemo } from "react";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa";

export interface DateRangePreset {
    key: string;
    label: string;
    getRange: () => { from: string; to: string };
}

export function formatDateISO(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr: string): string {
    if (!dateStr) return "";
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export const DATE_PRESETS: DateRangePreset[] = [
    {
        key: "yesterday",
        label: "Yesterday",
        getRange: () => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            const iso = formatDateISO(d);
            return { from: iso, to: iso };
        },
    },
    {
        key: "last_week",
        label: "Last week",
        getRange: () => {
            const to = new Date();
            const from = new Date();
            from.setDate(to.getDate() - 7);
            return { from: formatDateISO(from), to: formatDateISO(to) };
        },
    },
    {
        key: "current_month",
        label: "Current month",
        getRange: () => {
            const to = new Date();
            const from = new Date(to.getFullYear(), to.getMonth(), 1);
            return { from: formatDateISO(from), to: formatDateISO(to) };
        },
    },
    {
        key: "last_30_days",
        label: "Last 30 days",
        getRange: () => {
            const to = new Date();
            const from = new Date();
            from.setDate(to.getDate() - 30);
            return { from: formatDateISO(from), to: formatDateISO(to) };
        },
    },
    {
        key: "previous_month",
        label: "Previous month",
        getRange: () => {
            const today = new Date();
            const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const to = new Date(today.getFullYear(), today.getMonth(), 0);
            return { from: formatDateISO(from), to: formatDateISO(to) };
        },
    },
    {
        key: "last_3_months",
        label: "Last 3 months",
        getRange: () => {
            const to = new Date();
            const from = new Date();
            from.setMonth(to.getMonth() - 3);
            return { from: formatDateISO(from), to: formatDateISO(to) };
        },
    },
    {
        key: "last_6_months",
        label: "Last 6 months",
        getRange: () => {
            const to = new Date();
            const from = new Date();
            from.setMonth(to.getMonth() - 6);
            return { from: formatDateISO(from), to: formatDateISO(to) };
        },
    },
    {
        key: "last_12_months",
        label: "Last 12 months",
        getRange: () => {
            const to = new Date();
            const from = new Date();
            from.setFullYear(to.getFullYear() - 1);
            return { from: formatDateISO(from), to: formatDateISO(to) };
        },
    },
];

interface DayCell {
    dateStr: string;
    dayNum: number;
    inMonth: boolean;
}

function getDaysGrid(year: number, monthIndex: number): (DayCell | null)[] {
    const firstDayIndex = new Date(year, monthIndex, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const grid: (DayCell | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
        grid.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = formatDateISO(new Date(year, monthIndex, d));
        grid.push({ dateStr, dayNum: d, inMonth: true });
    }
    return grid;
}

interface SocialDatePickerProps {
    from: string;
    to: string;
    onChange: (from: string, to: string, presetKey?: string) => void;
    activePresetKey?: string;
}

export default function SocialDatePicker({
    from,
    to,
    onChange,
    activePresetKey,
}: SocialDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Initial base month: month 1 of dual view
    const [baseMonth, setBaseMonth] = useState<Date>(() => {
        if (from) {
            const [y, m] = from.split("-").map(Number);
            if (y && m) return new Date(y, m - 2, 1); // show month before or month of from
        }
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    });

    const [tempFrom, setTempFrom] = useState(from);
    const [tempTo, setTempTo] = useState(to);
    const [isSelectingEnd, setIsSelectingEnd] = useState(false);
    const [hoverDate, setHoverDate] = useState<string | null>(null);

    // Sync temp state with props when modal opens or props change
    useEffect(() => {
        setTempFrom(from);
        setTempTo(to);
    }, [from, to, isOpen]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setIsSelectingEnd(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const prevMonth = () => {
        setBaseMonth(
            (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
        );
    };

    const nextMonth = () => {
        setBaseMonth(
            (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
        );
    };

    const month1 = baseMonth;
    const month2 = useMemo(
        () => new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 1),
        [baseMonth]
    );

    const month1Grid = useMemo(
        () => getDaysGrid(month1.getFullYear(), month1.getMonth()),
        [month1]
    );
    const month2Grid = useMemo(
        () => getDaysGrid(month2.getFullYear(), month2.getMonth()),
        [month2]
    );

    const activePreset = useMemo(() => {
        if (activePresetKey) return activePresetKey;
        for (const preset of DATE_PRESETS) {
            const p = preset.getRange();
            if (p.from === from && p.to === to) {
                return preset.key;
            }
        }
        return "custom";
    }, [from, to, activePresetKey]);

    const handleDateClick = (dateStr: string) => {
        if (!isSelectingEnd || (tempFrom && tempTo)) {
            setTempFrom(dateStr);
            setTempTo("");
            setIsSelectingEnd(true);
        } else {
            if (dateStr < tempFrom) {
                setTempFrom(dateStr);
                setTempTo("");
                setIsSelectingEnd(true);
            } else {
                setTempTo(dateStr);
                setIsSelectingEnd(false);
                onChange(tempFrom, dateStr, "custom");
                setIsOpen(false);
            }
        }
    };

    const handlePresetClick = (preset: DateRangePreset) => {
        const { from: pFrom, to: pTo } = preset.getRange();
        setTempFrom(pFrom);
        setTempTo(pTo);
        setIsSelectingEnd(false);
        onChange(pFrom, pTo, preset.key);

        // Adjust base month to show preset's target month
        const [y, m] = pTo.split("-").map(Number);
        if (y && m) {
            setBaseMonth(new Date(y, m - 2, 1));
        }
        setIsOpen(false);
    };

    // Range calculation helper for cell rendering
    const effectiveStart = tempFrom;
    const effectiveEnd =
        tempTo || (isSelectingEnd && hoverDate ? hoverDate : tempFrom);

    const rangeLow = effectiveStart && effectiveEnd ? (effectiveStart < effectiveEnd ? effectiveStart : effectiveEnd) : "";
    const rangeHigh = effectiveStart && effectiveEnd ? (effectiveStart < effectiveEnd ? effectiveEnd : effectiveStart) : "";

    const renderMonthCalendar = (monthDate: Date, grid: (DayCell | null)[]) => {
        const monthTitle = monthDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
        });

        const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

        return (
            <div className="w-[260px] sm:w-[280px]">
                <div className="text-center font-medium text-xs text-gray-700 mb-3 h-5 flex items-center justify-center">
                    {monthTitle}
                </div>
                <div className="grid grid-cols-7 gap-y-1 mb-1 text-center">
                    {dayNames.map((d, i) => (
                        <span key={i} className="text-[11px] font-semibold text-gray-400 uppercase py-1">
                            {d}
                        </span>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1 text-center">
                    {grid.map((cell, idx) => {
                        if (!cell) {
                            return <div key={`empty-${idx}`} className="h-8 w-8" />;
                        }

                        const { dateStr, dayNum } = cell;
                        const isStart = dateStr === tempFrom;
                        const isEnd = dateStr === (tempTo || (isSelectingEnd ? hoverDate : tempFrom));
                        const isInRange = rangeLow && rangeHigh && dateStr >= rangeLow && dateStr <= rangeHigh;
                        const isToday = dateStr === formatDateISO(new Date());

                        let bgStyle = "";
                        let textStyle = "text-gray-700 hover:bg-gray-100 rounded-lg";

                        if (isStart || (isEnd && tempTo)) {
                            bgStyle = "bg-[#2D232E] text-white font-semibold rounded-lg shadow-sm";
                            textStyle = "text-white";
                        } else if (isInRange) {
                            bgStyle = "bg-[#E6EFF4] text-[#2D232E] font-medium";
                            if (dateStr === rangeLow) {
                                bgStyle += " rounded-l-lg";
                            }
                            if (dateStr === rangeHigh) {
                                bgStyle += " rounded-r-lg";
                            }
                            textStyle = "text-[#2D232E]";
                        } else if (isToday) {
                            textStyle = "text-[#2D232E] font-bold border border-[#2D232E]/30 rounded-lg";
                        }

                        return (
                            <div
                                key={dateStr}
                                className="h-8 flex items-center justify-center relative p-0.5"
                                onMouseEnter={() => isSelectingEnd && setHoverDate(dateStr)}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleDateClick(dateStr)}
                                    className={`h-7 w-7 flex items-center justify-center text-xs transition-all duration-150 ${bgStyle} ${textStyle}`}
                                >
                                    {dayNum}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="relative inline-block text-left" ref={popoverRef}>
            {/* Trigger Button Header Component */}
            <div className="flex flex-col items-start gap-0.5">
                <span className="text-[11px] font-medium text-gray-500">Main period</span>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                    <FaCalendarAlt className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                    <span>
                        {formatDateDisplay(from)} - {formatDateDisplay(to)}
                    </span>
                </button>
            </div>

            {/* Popover Calendar Modal */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl flex flex-col md:flex-row gap-6 animate-in fade-in zoom-in-95 duration-150 min-w-[320px] max-w-[95vw] sm:max-w-none">
                    {/* Left: Dual Month View */}
                    <div className="flex flex-col gap-3">
                        {/* Month Navigation Controls */}
                        <div className="flex items-center justify-between px-1">
                            <button
                                type="button"
                                onClick={prevMonth}
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                                title="Previous month"
                            >
                                <FaChevronLeft className="h-3 w-3" />
                            </button>

                            <button
                                type="button"
                                onClick={nextMonth}
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors md:hidden"
                                title="Next month"
                            >
                                <FaChevronRight className="h-3 w-3" />
                            </button>

                            <div className="hidden md:flex items-center justify-between flex-1 px-8">
                                <span className="text-xs font-semibold text-gray-700">
                                    {month1.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                                </span>
                                <span className="text-xs font-semibold text-gray-700">
                                    {month2.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={nextMonth}
                                className="h-7 w-7 hidden md:flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                                title="Next month"
                            >
                                <FaChevronRight className="h-3 w-3" />
                            </button>
                        </div>

                        {/* Dual Month Grids */}
                        <div className="flex flex-col md:flex-row gap-6">
                            {renderMonthCalendar(month1, month1Grid)}
                            <div className="hidden md:block">
                                {renderMonthCalendar(month2, month2Grid)}
                            </div>
                        </div>
                    </div>

                    {/* Vertical Divider */}
                    <div className="hidden md:block w-[1px] bg-gray-100 self-stretch" />

                    {/* Right: Presets Sidebar */}
                    <div className="w-full md:w-44 flex flex-col gap-1 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
                            Quick Presets
                        </span>
                        {DATE_PRESETS.map((preset) => {
                            const isActive = activePreset === preset.key;
                            return (
                                <button
                                    key={preset.key}
                                    type="button"
                                    onClick={() => handlePresetClick(preset)}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all duration-150 ${
                                        isActive
                                            ? "bg-[#2D232E] text-white font-medium shadow-sm"
                                            : "text-gray-700 hover:bg-gray-100/80 hover:text-gray-900"
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
