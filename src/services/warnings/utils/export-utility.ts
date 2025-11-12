// src/lib/utils/warning-letters/export-utility.ts

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { WarningListRecord } from './storage-utility';

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'pdf' | 'xlsx';

/**
 * Export options
 */
export interface ExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  includeServices?: boolean;
  groupByLevel?: boolean;
}

export class ExportError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ExportError";
  }
}

/**
 * Convert warning list to CSV format
 */
export function exportWarningListToCSV(
  warningList: WarningListRecord[],
  options: ExportOptions
): void {
  const { filename, includeServices = false } = options;
  
  // Define headers
  const headers = [
    'Matric Number',
    'Student Name',
    'Level',
    'Miss Count',
    'Status',
  ];
  
  if (includeServices) {
    headers.push('Services Missed', 'Dates');
  }
  
  // Build CSV rows
  const rows = warningList.map(record => {
    const baseRow = [
      record.matricNumber,
      record.studentName,
      record.level,
      record.missCount.toString(),
      record.status,
    ];
    
    if (includeServices) {
      const serviceLabels = record.services.map((s: { meta: { label: any; }; }) => s.meta.label).join('; ');
      const serviceDates = record.services.map((s: { meta: { date: any; }; }) => s.meta.date).join('; ');
      baseRow.push(serviceLabels, serviceDates);
    }
    
    return baseRow;
  });
  
  // Create CSV content
  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

/**
 * Export warning list to PDF
 */
export function exportWarningListToPDF(
  warningList: WarningListRecord[],
  options: ExportOptions
): void {
  const { filename, title, subtitle, includeServices = false, groupByLevel = false } = options;
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
  
  let startY = subtitle ? 40 : 35;
  
  if (groupByLevel) {
    // Group by level and create separate tables
    const grouped = new Map<string, WarningListRecord[]>();
    for (const record of warningList) {
      const existing = grouped.get(record.level) || [];
      existing.push(record);
      grouped.set(record.level, existing);
    }
    
    const sortedLevels = Array.from(grouped.keys()).sort();
    
    for (const level of sortedLevels) {
      const records = grouped.get(level)!;
      
      // Level header
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`Level ${level} (${records.length} students)`, 14, startY);
      startY += 7;
      
      // Table for this level
      const tableData = records.map(record => {
        const row = [
          record.matricNumber,
          record.studentName,
          record.missCount.toString(),
        ];
        
        if (includeServices) {
          row.push(record.services.map((s: { meta: { label: any; date: any; }; }) => `${s.meta.label} (${s.meta.date})`).join('\n'));
        }
        
        return row;
      });
      
      const headers = ['Matric Number', 'Name', 'Absences'];
      if (includeServices) {
        headers.push('Services Missed');
      }
      
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 },
      });
      
      // @ts-ignore - autoTable adds finalY to doc
      startY = doc.lastAutoTable.finalY + 10;
      
      // Add new page if needed
      if (startY > 250 && level !== sortedLevels[sortedLevels.length - 1]) {
        doc.addPage();
        startY = 20;
      }
    }
  } else {
    // Single table for all records
    const tableData = warningList.map(record => {
      const row = [
        record.matricNumber,
        record.studentName,
        record.level,
        record.missCount.toString(),
      ];
      
      if (includeServices) {
        row.push(record.services.map((s: { meta: { label: any; date: any; }; }) => `${s.meta.label} (${s.meta.date})`).join('\n'));
      }
      
      return row;
    });
    
    const headers = ['Matric Number', 'Name', 'Level', 'Absences'];
    if (includeServices) {
      headers.push('Services Missed');
    }
    
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });
  }
  
  doc.save(`${filename}.pdf`);
}

/**
 * Generate individual warning letter PDF for a student
 */
export function generateIndividualWarningLetter(
  record: WarningListRecord,
  options: {
    schoolName: string;
    departmentName: string;
    issueDate: string;
    authorityName?: string;
    authorityTitle?: string;
  }
): jsPDF {
  const doc = new jsPDF();
  const { schoolName, departmentName, issueDate, authorityName, authorityTitle } = options;
  
  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName, 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(departmentName, 105, 28, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  doc.text(`Date: ${issueDate}`, 14, 45);
  
  // Student details
  doc.setFontSize(11);
  doc.text(`To: ${record.studentName}`, 14, 55);
  doc.text(`Matric Number: ${record.matricNumber}`, 14, 62);
  doc.text(`Level: ${record.level}`, 14, 69);
  
  // Subject
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RE: WARNING LETTER - ATTENDANCE VIOLATION', 14, 82);
  
  // Body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  const bodyText = `Dear ${record.studentName},

This is to inform you that our records indicate you were absent from ${record.missCount} mandatory service(s) between ${record.startDate} and ${record.endDate}.

The following services were missed:`;
  
  doc.text(bodyText, 14, 95, { maxWidth: 180 });
  
  // Services table
  const serviceData = record.services.map((service: { meta: { label: any; date: any; }; }, index: number) => [
    (index + 1).toString(),
    service.meta.label,
    service.meta.date,
  ]);
  
  autoTable(doc, {
    head: [['#', 'Service', 'Date']],
    body: serviceData,
    startY: 130,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
    margin: { left: 14, right: 14 },
  });
  
  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY + 10;
  
  // Closing text
  const closingText = `Attendance at all scheduled services is mandatory. Continued absence may result in disciplinary action. Please ensure you attend all future services.

If you have any valid reasons for your absence, please report to the department office immediately with supporting documentation.`;
  
  doc.text(closingText, 14, finalY, { maxWidth: 180 });
  
  // Signature section
  const signatureY = finalY + 35;
  if (authorityName && authorityTitle) {
    doc.text('_________________________', 14, signatureY);
    doc.text(authorityName, 14, signatureY + 7);
    doc.text(authorityTitle, 14, signatureY + 14);
  }
  
  return doc;
}

/**
 * Export batch of individual warning letters as single PDF
 */
export function exportIndividualLettersBatch(
  warningList: WarningListRecord[],
  options: ExportOptions & {
    schoolName: string;
    departmentName: string;
    issueDate: string;
    authorityName?: string;
    authorityTitle?: string;
  }
): void {
  const { filename, schoolName, departmentName, issueDate, authorityName, authorityTitle } = options;
  const doc = new jsPDF();
  
  warningList.forEach((record, index) => {
    if (index > 0) {
      doc.addPage();
    }
    
    const individualDoc = generateIndividualWarningLetter(record, {
      schoolName,
      departmentName,
      issueDate,
      authorityName,
      authorityTitle,
    });
    
    // Copy pages from individual doc to main doc
    // Note: This is a simplified approach - for production, use proper PDF merging
    const pages = individualDoc.internal.pages;
    // @ts-ignore
    doc.internal.pages[index + 1] = pages[1];
  });
  
  doc.save(`${filename}.pdf`);
}

/**
 * Trigger file download
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}