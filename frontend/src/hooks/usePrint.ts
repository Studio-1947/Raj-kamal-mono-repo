import { useCallback } from 'react';

interface PrintOptions {
  title?: string;
  styles?: string;
  removeAfterPrint?: boolean;
}

export const usePrint = () => {
  const printElement = useCallback((element: HTMLElement, options: PrintOptions = {}) => {
    const { title = 'Print', styles = '', removeAfterPrint = true } = options;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: Arial, sans-serif; 
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .no-print { display: none !important; }
            }
            ${styles}
          </style>
        </head>
        <body>
          ${element.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              ${removeAfterPrint ? 'window.close();' : ''}
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }, []);

  const printContent = useCallback((content: string, options: PrintOptions = {}) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    printElement(tempDiv, options);
  }, [printElement]);

  return {
    printElement,
    printContent
  };
};