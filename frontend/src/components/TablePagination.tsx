import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface TablePaginationProps {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
}

export default function TablePagination({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [5, 10],
}: TablePaginationProps) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(totalItems, currentPage * pageSize);

    // Generate page numbers range for clean navigation
    const pageNumbers = React.useMemo(() => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push("...");
            
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);

            if (currentPage < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    }, [currentPage, totalPages]);

    if (totalItems === 0) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-2 border-t border-gray-100/80 text-xs font-medium text-gray-600">
            {/* Range Indicator & Page Size Selector */}
            <div className="flex items-center gap-3">
                <span>
                    Showing <strong className="text-gray-900 font-bold">{startItem}</strong> to{" "}
                    <strong className="text-gray-900 font-bold">{endItem}</strong> of{" "}
                    <strong className="text-gray-900 font-bold">{totalItems}</strong> entries
                </span>

                {onPageSizeChange && (
                    <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-gray-400">Rows:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                onPageSizeChange(Number(e.target.value));
                                onPageChange(1);
                            }}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            {pageSizeOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Page Navigation Buttons */}
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:hover:bg-white transition shadow-xs"
                    title="Previous page"
                >
                    <FaChevronLeft className="h-2.5 w-2.5" />
                </button>

                {pageNumbers.map((page, idx) => (
                    <React.Fragment key={idx}>
                        {typeof page === "number" ? (
                            <button
                                type="button"
                                onClick={() => onPageChange(page)}
                                className={`h-8 w-8 rounded-xl font-bold text-xs transition border ${page === currentPage
                                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                    }`}
                            >
                                {page}
                            </button>
                        ) : (
                            <span className="px-1 text-gray-400 font-bold">...</span>
                        )}
                    </React.Fragment>
                ))}

                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:hover:bg-white transition shadow-xs"
                    title="Next page"
                >
                    <FaChevronRight className="h-2.5 w-2.5" />
                </button>
            </div>
        </div>
    );
}
