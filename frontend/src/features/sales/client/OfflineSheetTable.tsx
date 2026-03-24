// ─────────────────────────────────────────────────────────────────────────────
// OfflineSheetTable.tsx
//
// Virtualised table for Google-Sheet Offline Sales data.
// Optimised for 100-row pages.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useMemo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import type { OfflineSheetItem } from './offlineSheetTypes';

const ROW_H = 50;
const TABLE_H = 600;

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
  { key: 'title',        label: 'Title',     width: 280, fmt: (v) => String(v ?? '—') },
  { key: 'customerName', label: 'Customer',  width: 180, fmt: (v) => String(v ?? '—') },
  { key: 'state',        label: 'State',     width: 130, fmt: (v) => String(v ?? '—') },
  { key: 'publisher',    label: 'Publisher', width: 180, fmt: (v) => String(v ?? '—') },
  { key: 'qty',          label: 'Qty',       width:  70, fmt: (v) => v != null ? String(v) : '—' },
  { key: 'amount',       label: 'Amount',    width: 130, fmt: fmtINR },
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
        className={`flex items-center border-b border-gray-100 ${isEven ? 'bg-white' : 'bg-gray-50/50'}`}
      >
        {COLUMNS.map((col) => {
          const raw = col.key === 'docNoDisplay' ? undefined : (row as any)[col.key];
          const text = col.fmt ? col.fmt(raw, row) : String(raw ?? '—');
          return (
            <div
              key={col.key}
              title={text}
              style={{ width: col.width }}
              className="px-3 overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-bold text-gray-800"
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
      className="flex bg-gray-100 border-b-2 border-gray-200 sticky top-0 z-10"
    >
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          style={{ width: col.width }}
          className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest"
        >
          {col.label}
        </div>
      ))}
    </div>
  ), []);

  if (rows.length === 0) {
    return (
      <div className="flex h-60 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white shadow-sm">
        <svg className="h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg font-bold text-gray-400">No transactions found</p>
        <p className="text-sm text-gray-400">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-gray-100 bg-white shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        {Header}
        <List
          height={Math.min(rows.length * ROW_H, TABLE_H)}
          itemCount={rows.length}
          itemSize={ROW_H}
          width={TOTAL_W}
          overscanCount={5}
        >
          {Row}
        </List>
      </div>
    </div>
  );
}
