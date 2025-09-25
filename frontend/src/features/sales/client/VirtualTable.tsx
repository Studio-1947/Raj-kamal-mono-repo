import React from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

export type SaleRow = {
  id: string;
  source: string;
  orderNo?: string | null;
  isbn?: string | null;
  title?: string | null;
  customerName?: string | null;
  paymentMode?: string | null;
  amount?: string | number | null;
  qty?: number | null;
  date?: string | null;
};

type Props = {
  rows: SaleRow[];
  height?: number;
  rowHeight?: number;
  onEndReached?: () => void; // called when near end
};

const columns: { key: keyof SaleRow; label: string; width: number }[] = [
  { key: 'id', label: 'ID', width: 140 },
  { key: 'source', label: 'Source', width: 160 },
  { key: 'date', label: 'Date', width: 120 },
  { key: 'title', label: 'Title', width: 240 },
  { key: 'isbn', label: 'ISBN', width: 140 },
  { key: 'customerName', label: 'Customer', width: 180 },
  { key: 'paymentMode', label: 'Mode', width: 120 },
  { key: 'qty', label: 'Qty', width: 80 },
  { key: 'amount', label: 'Amount', width: 120 },
];

const VirtualTable: React.FC<Props> = ({ rows, height = 400, rowHeight = 36, onEndReached }) => {
  const totalWidth = columns.reduce((acc, c) => acc + c.width, 0);

  const Row = ({ index, style }: ListChildComponentProps) => {
    const r = rows[index];
    if (onEndReached && index >= rows.length - 5) {
      // trigger fetch-ahead near the end
      onEndReached();
    }
    return (
      <div style={{ ...style, display: 'flex', borderBottom: '1px solid #eee', alignItems: 'center' }}>
        {columns.map((c) => (
          <div key={String(c.key)} style={{ width: c.width, padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {String(r?.[c.key] ?? '')}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ border: '1px solid #ddd', overflow: 'auto' }}>
      <div style={{ display: 'flex', background: '#f9f9f9', borderBottom: '1px solid #ddd', fontWeight: 600 }}>
        {columns.map((c) => (
          <div key={c.label} style={{ width: c.width, padding: '6px 8px' }}>{c.label}</div>
        ))}
      </div>
      <div style={{ width: totalWidth }}>
        <List height={height} itemCount={rows.length} itemSize={rowHeight} width={totalWidth}>
          {Row}
        </List>
      </div>
    </div>
  );
};

export default VirtualTable;

