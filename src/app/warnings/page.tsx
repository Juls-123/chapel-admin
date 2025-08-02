"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { format } from 'date-fns';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { warningLetterSummaries } from '@/lib/mock-data';
import type { WarningLetterSummary } from '@/lib/types';
import { WarningLettersTable } from './data-table';

export default function WarningLettersPage() {
  const [selectedStudent, setSelectedStudent] = useState<WarningLetterSummary | null>(warningLetterSummaries[0]);
  const [weekOffset, setWeekOffset] = useState(0);

  const handleSelectStudent = (student: WarningLetterSummary) => {
    setSelectedStudent(student);
  };

  const getWeekDisplay = (offset: number) => {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay() + 1 + (offset * 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  return (
    <AppShell>
      <PageHeader
        title="Warning Letters"
        description="Generate, review, and send warning letters to students."
      />
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
            <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-medium text-center w-56">{getWeekDisplay(weekOffset)}</span>
        <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}>
            <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <WarningLettersTable data={warningLetterSummaries} onRowSelect={handleSelectStudent} />
        </div>
        <div className="lg:col-span-2">
            <Card className="shadow-sm sticky top-20">
                <CardHeader>
                    <CardTitle>Letter Preview</CardTitle>
                    <CardDescription>A preview of the warning letter for the selected student.</CardDescription>
                </CardHeader>
                <CardContent>
                    {selectedStudent ? (
                        <div className="p-6 border rounded-lg bg-white dark:bg-background/50 min-h-[400px] text-sm text-gray-800 dark:text-gray-300 font-serif">
                            <h2 className="text-xl font-bold mb-4 text-center">Chapel Attendance Warning</h2>
                            <p className="mb-2"><strong>Date:</strong> {format(new Date(), 'PPP')}</p>
                            <p className="mb-2"><strong>To:</strong> {selectedStudent.student_name}</p>
                            <p className="mb-4"><strong>Student ID:</strong> {selectedStudent.student_id}</p>
                            
                            <p className="mb-4">Dear {selectedStudent.student_name.split(' ')[0]},</p>
                            
                            <p className="mb-4">This letter serves as a formal warning regarding your attendance at required chapel services. Our records indicate that you have missed <strong>{selectedStudent.miss_count}</strong> services for the week of <strong>{format(selectedStudent.week_start, 'PPP')}</strong>.</p>
                            
                            <p className="mb-2">The dates of the missed services are as follows:</p>
                            <ul className="list-disc list-inside mb-4">
                                {selectedStudent.missed_service_dates.map(date => (
                                    <li key={date.toISOString()}>{format(date, 'PPP')}</li>
                                ))}
                            </ul>

                            <p className="mb-4">Consistent attendance is a vital part of our community ethos. Please ensure you attend all future services. If you believe this is an error, or if there are extenuating circumstances, please contact the administrative office immediately.</p>

                            <p>Sincerely,</p>
                            <p className="mt-2 font-semibold">The Chapel Administration</p>
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted bg-muted/50 p-8 text-center min-h-[400px]">
                            <div className="rounded-full bg-background p-3">
                                <FileText className="size-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground">
                                Select a student to preview their letter.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </AppShell>
  );
}
