// ─────────────────────────────────────────────────────────────────────────────
// OfflineSheetTable.tsx
//
// Virtualised infinite-scroll table for Google-Sheet Offline Sales data.
//
// Performance design:
//  • react-window FixedSizeList — only ~15 DOM row nodes exist at any time,
//    regardless of how many rows are in memory (5000+). Scrolling is 60fps.
//  • Infinite scroll via TanStack Query's useInfiniteQuery: when the user
//    scrolls within 10 rows of the bottom, fetchNextPage() is called. New rows
//    append without re-rendering existing rows.
//  • Rows are only re-rendered when their slice of data changes (structural
//    sharing via TQ).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useMemo, useRef } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import type { OfflineSheetItem } from './offlineSheetTypes';

const ROW_H = 38;
const TABLE_H = 460;

interface Column {
  key: keyof OfflineSheetItem | 'docNoDisplay';
  label: string;
  width: number;
  fmt?: (v: unknown, row: OfflineSheetItem) => string;
}

function fmtINR(n: unknown): string {
  const num = Number(n);
  if (!num && num !== 0) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
  }
}

const COLUMNS: Column[] = [
  { key: 'date',         label: 'Date',     width: 110, fmt: (v) => v ? String(v).slice(0, 10) : '—' },
  { key: 'docNoDisplay', label: 'Doc No',   width: 130, fmt: (_, r) => String(r.docNo ?? r.orderNo ?? '—') },
  { key: 'title',        label: 'Title',    width: 280, fmt: (v) => String(v ?? '—') },
  { key: 'customerName', label: 'Customer', width: 180, fmt: (v) => String(v ?? '—') },
  { key: 'qty',          label: 'Qty',      width:  70, fmt: (v) => v != null ? String(v) : '—' },
  { key: 'rate',         label: 'Rate',     width: 110, fmt: fmtINR },
  { key: 'amount',       label: 'Amount',   width: 120, fmt: fmtINR },
];

const TOTAL_W = COLUMNS.reduce((acc, c) => acc + c.width, 0);

interface Props {
  rows: OfflineSheetItem[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
}

export default function OfflineSheetTable({
  rows,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: Props) {
  const fetchRef = useRef(false);

  const maybeFetchMore = useCallback((index: number) => {
    if (!hasNextPage || isFetchingNextPage || fetchRef.current) return;
    if (index >= rows.length - 10) {
      fetchRef.current = true;
      fetchNextPage?.();
      // Unlock after a tick so we don't call multiple times per render pass
      setTimeout(() => { fetchRef.current = false; }, 50);
    }
  }, [hasNextPage, isFetchingNextPage, rows.length, fetchNextPage]);

  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const row = rows[index];
    maybeFetchMore(index);
    const bg = index % 2 === 0 ? '#fff' : '#f9fafb';

    return (
      <div
        style={{ ...style, display: 'flex', alignItems: 'center', background: bg, borderBottom: '1px solid #f0f0f0' }}
      >
        {COLUMNS.map((col) => {
          const raw = col.key === 'docNoDisplay' ? undefined : (row as any)[col.key];
          const text = col.fmt ? col.fmt(raw, row) : String(raw ?? '—');
          return (
            <div
              key={col.key}
              title={text}
              style={{
                width: col.width,
                padding: '0 10px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 13,
                color: '#374151',
              }}
            >
              {text}
            </div>
          );
        })}
      </div>
    );
  }, [rows, maybeFetchMore]);

  const Header = useMemo(() => (
    <div
      style={{
        display: 'flex',
        background: '#f3f4f6',
        borderBottom: '2px solid #e5e7eb',
        width: TOTAL_W,
      }}
    >
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          style={{
            width: col.width,
            padding: '8px 10px',
            fontSize: 12,
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {col.label}
        </div>
      ))}
    </div>
  ), []);

  if (rows.length === 0 && !isFetchingNextPage) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400">
        No records match the current filters
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div style={{ overflowX: 'auto' }}>
        {Header}
        <List
          height={TABLE_H}
          itemCount={rows.length}
          itemSize={ROW_H}
          width={TOTAL_W}
          overscanCount={8}
        >
          {Row}
        </List>
      </div>
      {isFetchingNextPage && (
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-500">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          Loading more rows…
        </div>
      )}
      {!hasNextPage && rows.length > 0 && (
        <div className="py-2 text-center text-xs text-gray-400">
          All {rows.length.toLocaleString('en-IN')} records loaded
        </div>
      )}
    </div>
  );
}
