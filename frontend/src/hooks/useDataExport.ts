import { useToast } from '../components/Toast';

interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  filename?: string;
}

export const useDataExport = () => {
  const { addToast } = useToast();

  const exportToCSV = (data: any[], filename: string = 'export') => {
    try {
      if (!data.length) {
        addToast({ message: 'No data to export', type: 'warning' });
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      downloadFile(csvContent, `${filename}.csv`, 'text/csv');
      addToast({ message: 'Data exported successfully', type: 'success' });
    } catch (error) {
      addToast({ message: 'Export failed', type: 'error' });
    }
  };

  const exportToJSON = (data: any[], filename: string = 'export') => {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      downloadFile(jsonContent, `${filename}.json`, 'application/json');
      addToast({ message: 'Data exported successfully', type: 'success' });
    } catch (error) {
      addToast({ message: 'Export failed', type: 'error' });
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    exportToCSV,
    exportToJSON
  };
};