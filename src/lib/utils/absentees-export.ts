import { exportToCSV, exportToPDF } from './export-utils';
import type { ConsolidatedAbsentee } from './absentees-helpers';

export const exportAbsentees = {
  toCSV: (data: ConsolidatedAbsentee[], serviceName: string, date: string) => {
    const columns = [
      { header: 'Matric Number', accessor: 'matric_number' },
      { header: 'Student Name', accessor: 'student_name' },
      { header: 'Level', accessor: 'level' }
    ];
    
    exportToCSV({
      filename: `absentees-${serviceName}-${date}`,
      columns,
      data
    });
  },

  toPDF: (data: ConsolidatedAbsentee[], serviceName: string, date: string) => {
    const columns = [
      { header: 'Matric Number', accessor: 'matric_number' },
      { header: 'Student Name', accessor: 'student_name' },
      { header: 'Level', accessor: 'level' }
    ];
    
    exportToPDF({
      filename: `absentees-${serviceName}-${date}`,
      columns,
      data,
      title: 'Absentee Report',
      subtitle: `Service: ${serviceName} | Date: ${date}`
    });
  }
};