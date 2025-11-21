/**
 * Loading skeleton components for social media views
 */

export function TableRowSkeleton({ columns = 10 }: { columns?: number }) {
    return (
        <tr className="border-t border-gray-100 animate-pulse">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="py-2 pr-2">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                </td>
            ))}
        </tr>
    );
}

export function TableSkeleton({
    rows = 5,
    columns = 10,
    headers = []
}: {
    rows?: number;
    columns?: number;
    headers?: string[];
}) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
                {headers.length > 0 && (
                    <thead>
                        <tr className="text-left text-gray-900">
                            {headers.map((header, i) => (
                                <th key={i} className="py-2 pr-2">{header}</th>
                            ))}
                        </tr>
                    </thead>
                )}
                <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <TableRowSkeleton key={i} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function MetricCardSkeleton() {
    return (
        <div className="rounded-2xl bg-sky-50 px-4 py-3 text-center shadow-inner border border-sky-100 animate-pulse">
            <div className="h-3 bg-gray-300 rounded w-16 mx-auto mb-2" />
            <div className="h-6 bg-gray-400 rounded w-20 mx-auto" />
        </div>
    );
}

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
    return (
        <div className={`${height} bg-gray-100 rounded-lg animate-pulse flex items-center justify-center`}>
            <div className="text-center">
                <div className="inline-block h-8 w-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-2" />
                <p className="text-sm text-gray-500">Loading chart...</p>
            </div>
        </div>
    );
}

export function SectionSkeleton() {
    return (
        <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5 animate-pulse">
            <div className="mb-4">
                <div className="h-4 bg-gray-300 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-48" />
            </div>
            <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-4 bg-gray-200 rounded w-4/6" />
            </div>
        </section>
    );
}

export function LoadingSpinner({
    size = "md",
    message = "Loading..."
}: {
    size?: "sm" | "md" | "lg";
    message?: string;
}) {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-4",
        lg: "h-12 w-12 border-4"
    };

    return (
        <div className="flex flex-col items-center justify-center py-8">
            <div className={`${sizeClasses[size]} border-gray-300 border-t-blue-500 rounded-full animate-spin`} />
            {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
        </div>
    );
}
