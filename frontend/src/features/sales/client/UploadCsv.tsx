import React, { useState } from 'react';
import { apiClient } from '../../../lib/apiClient';

type ImportResult = {
  ok: boolean;
  totalRows?: number;
  inserted?: number;
  errors?: number;
  errorReportPath?: string | null;
  error?: string;
};

/**
 * Triggers a server-side import from a fixed Excel path on the server.
 * Intentionally does not upload a file to keep the server deterministic.
 */
const UploadCsv: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onImport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await apiClient.post<ImportResult>('/api/sales/import', {});
      setResult(res);
    } catch (e: any) {
      setResult({ ok: false, error: e?.message || 'Import failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={onImport} disabled={loading} style={{ padding: '8px 12px', border: '1px solid #ccc' }}>
        {loading ? 'Importing…' : 'Import Excel on Server'}
      </button>
      {result && (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', background: '#fafafa' }}>
          {result.ok ? (
            <div>
              <div>Imported: {result.inserted} / {result.totalRows}</div>
              <div>Errors: {result.errors}</div>
              {result.errorReportPath && (
                <div>Errors file: <code>{result.errorReportPath}</code></div>
              )}
            </div>
          ) : (
            <div style={{ color: 'crimson' }}>Failed: {result.error}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadCsv;

