// ─────────────────────────────────────────────────────────────────────────────
// OfflineSheetTable.tsx
//
// Virtualised table for Google-Sheet Offline Sales data.
// Optimised for 100-row pages.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useMemo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import type { OfflineSheetItem } from './offlineSheetTypes';

const ROW_H = 55;
const TABLE_H = 650;

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
  { key: 'date',         label: 'Date',      width: 120, fmt: (v) => v ? String(v).slice(0, 10) : '—' },
  { key: 'docNoDisplay', label: 'Doc No',    width: 130, fmt: (_, r) => String(r.docNo ?? r.orderNo ?? '—') },
  { key: 'title',        label: 'Title',     width: 350, fmt: (v) => String(v ?? '—') },
  { key: 'author',       label: 'Author',    width: 200, fmt: (v) => String(v ?? '—') },
  { key: 'customerName', label: 'Customer',  width: 200, fmt: (v) => String(v ?? '—') },
  { key: 'state',        label: 'State',     width: 130, fmt: (v) => String(v ?? '—') },
  { key: 'city',         label: 'City',      width: 130, fmt: (v) => String(v ?? '—') },
  { key: 'publisher',    label: 'Publisher', width: 200, fmt: (v) => String(v ?? '—') },
  { key: 'binding',      label: 'Binding',   width: 100, fmt: (v) => String(v ?? '—') },
  { key: 'qty',          label: 'Qty',       width:  80, fmt: (v) => v != null ? String(v) : '—' },
  { key: 'rate',         label: 'Rate',      width: 100, fmt: fmtINR },
  { key: 'amount',       label: 'Amount',    width: 140, fmt: fmtINR },
];

const TOTAL_W = COLUMNS.reduce((acc, c) => acc + c.width, 0);

interface Props {
  rows: OfflineSheetItem[];
}

export default function OfflineSheetTable({ rows }: Props) {
  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const row = rows[index];
    const isEven = index % 2 === 0;

    return (
      <div
        style={style}
        className={`flex items-center border-b border-gray-200 transition-colors hover:bg-teal-50/30 ${isEven ? 'bg-white' : 'bg-gray-50/50'}`}
      >
        {COLUMNS.map((col) => {
          const raw = col.key === 'docNoDisplay' ? undefined : (row as any)[col.key];
          const text = col.fmt ? col.fmt(raw, row) : String(raw ?? '—');
          return (
            <div
              key={col.key}
              title={text}
              style={{ width: col.width }}
              className="px-4 overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-medium text-black"
            >
              {text}
            </div>
          );
        })}
      </div>
    );
  }, [rows]);

  const Header = useMemo(() => (
    <div
      style={{ width: TOTAL_W }}
      className="flex bg-gray-100 border-b-4 border-black sticky top-0 z-10"
    >
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          style={{ width: col.width }}
          className="px-4 py-4 text-xs font-semibold text-black uppercase tracking-widest bg-gray-100 border-r border-gray-200 last:border-r-0"
        >
          {col.label}
        </div>
      ))}
    </div>
  ), []);

  if (rows.length === 0) {
    return (
      <div className="flex h-60 flex-col items-center justify-center rounded-2xl border-4 border-dashed border-gray-200 bg-white shadow-xl">
        <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-2xl font-semibold text-black">No matching transactions</p>
        <p className="text-lg text-gray-400 font-medium mt-1">Try adjusting your filters or Search terms</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-4 border-gray-200 bg-white shadow-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ width: TOTAL_W }}>
          {Header}
          <List
            height={Math.min(rows.length * ROW_H, TABLE_H)}
            itemCount={rows.length}
            itemSize={ROW_H}
            width={TOTAL_W}
            overscanCount={10}
            className="scrollbar-thin scrollbar-thumb-teal-600 scrollbar-track-gray-100"
          >
            {Row}
          </List>
        </div>
      </div>
      <div className="bg-gray-50 px-6 py-3 border-t-2 border-gray-200 flex justify-end">
        <p className="text-sm font-semibold text-black uppercase tracking-widest">
           Showing {rows.length.toLocaleString('en-IN')} Records in this page
        </p>
      </div>
    </div>
  );
}
