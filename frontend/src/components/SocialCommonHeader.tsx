import React from "react";
import SocialDatePicker from "./SocialDatePicker";

export interface SocialTabSection {
    key: string;
    label: string;
}

interface SocialCommonHeaderProps {
    sections: SocialTabSection[];
    activeSection: string;
    onSelectSection: (key: string) => void;
    from: string;
    to: string;
    onDateChange: (from: string, to: string, presetKey?: string) => void;
    activePresetKey?: string;
    brandColor?: string;
}

export default function SocialCommonHeader({
    sections,
    activeSection,
    onSelectSection,
    from,
    to,
    onDateChange,
    activePresetKey,
    brandColor = "#E1306C",
}: SocialCommonHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border border-gray-200/70 p-4 sm:p-5 shadow-sm">
            {/* Left: Social Section Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0 -mx-1 px-1">
                {sections.map((sec) => {
                    const isActive = activeSection === sec.key;
                    return (
                        <button
                            key={sec.key}
                            type="button"
                            onClick={() => onSelectSection(sec.key)}
                            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl whitespace-nowrap transition-all duration-200 ${
                                isActive
                                    ? "text-white shadow-sm"
                                    : "bg-transparent text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
                            }`}
                            style={
                                isActive
                                    ? {
                                          backgroundColor: brandColor,
                                          boxShadow: `0 4px 12px ${brandColor}33`,
                                      }
                                    : {}
                            }
                        >
                            {sec.label}
                        </button>
                    );
                })}
            </div>

            {/* Right: Integrated Main Period Calendar Date Picker */}
            <div className="shrink-0 self-end md:self-auto">
                <SocialDatePicker
                    from={from}
                    to={to}
                    onChange={onDateChange}
                    activePresetKey={activePresetKey}
                />
            </div>
        </div>
    );
}
