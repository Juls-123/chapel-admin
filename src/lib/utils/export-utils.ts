import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportOptions {
  filename: string;
  columns: { header: string; accessor: string }[];
  data: any[];
  title: string;
  subtitle?: string;
}

export const exportToCSV = (options: Omit<ExportOptions, 'title'>) => {
  const { filename, columns, data } = options;
  const headers = columns.map(col => `"${col.header}"`).join(',');
  const rows = data.map(item => 
    columns.map(col => `"${String(item[col.accessor] || '')}"`).join(',')
  ).join('\n');
  
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
};

export const exportToPDF = (options: ExportOptions) => {
  const { filename, columns, data, title, subtitle } = options;
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Subtitle
  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 30);
  }
  
  // Table
  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: data.map(item => columns.map(col => item[col.accessor])),
    startY: 40,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] }
  });
  
  doc.save(`${filename}.pdf`);
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};