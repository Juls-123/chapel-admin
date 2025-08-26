
"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileText, Send, FileDown } from 'lucide-react';
import { format, startOfWeek, endOfWeek, add, sub } from 'date-fns';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { warningLetterSummaries as initialWarnings } from '@/lib/mock-data';
import type { WarningLetterSummary } from '@/lib/types';
import { WarningLettersTable } from './data-table';
import { useToast } from '@/hooks/use-toast';

export default function WarningLettersPage() {
  const [warnings, setWarnings] = useState<WarningLetterSummary[]>(initialWarnings);
  const [selectedStudent, setSelectedStudent] = useState<WarningLetterSummary | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Filter warnings based on the selected week
    const start = startOfWeek(add(new Date(), { weeks: weekOffset }), { weekStartsOn: 1 });
    const end = endOfWeek(add(new Date(), { weeks: weekOffset }), { weekStartsOn: 1 });
    
    const filtered = initialWarnings.filter(w => {
      const warningDate = new Date(w.week_start);
      return warningDate >= start && warningDate <= end;
    });

    setWarnings(filtered);
    setSelectedStudent(filtered.length > 0 ? filtered[0] : null);
  }, [weekOffset]);

  const handleSelectStudent = (student: WarningLetterSummary) => {
    setSelectedStudent(student);
  };
  
  const handleUpdateStatus = (matricNumber: string, status: WarningLetterSummary['status']) => {
    const updatedWarnings = warnings.map(w => 
        w.matric_number === matricNumber ? { ...w, status } : w
    );
    setWarnings(updatedWarnings);
    if(selectedStudent?.matric_number === matricNumber) {
        setSelectedStudent(prev => prev ? {...prev, status} : null);
    }
  };

  const handleSendAll = () => {
    const pendingCount = warnings.filter(w => w.status === 'pending' || w.status === 'failed').length;
    if(pendingCount === 0) {
        toast({ title: 'No letters to send', description: 'All warnings have already been sent or overridden.' });
        return;
    }

    const updatedWarnings = warnings.map(w => 
      (w.status === 'pending' || w.status === 'failed') ? { ...w, status: 'sent' as const } : w
    );
    setWarnings(updatedWarnings);
    if (selectedStudent) {
        const newSelected = updatedWarnings.find(w => w.matric_number === selectedStudent.matric_number);
        setSelectedStudent(newSelected || null);
    }
    toast({
        title: `${pendingCount} Letters Sent`,
        description: `All pending/failed warnings for this week have been sent.`
    })
  }

  const getWeekDisplay = (offset: number) => {
    const start = startOfWeek(add(new Date(), { weeks: offset }), { weekStartsOn: 1 });
    const end = endOfWeek(add(new Date(), { weeks: offset }), { weekStartsOn: 1 });
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  const getFirstName = (fullName: string) => {
      return fullName.split(' ')[0];
  }

  return (
    <AppShell>
      <PageHeader
        title="Warning Letters"
        description="Generate, review, and send warning letters to students."
      />
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
        <div className='flex items-center gap-2'>
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium text-center w-56">{getWeekDisplay(weekOffset)}</span>
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)} disabled={weekOffset >= 0}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
        <div className='flex items-center gap-2'>
            <Button onClick={handleSendAll}>
                <Send className="mr-2 h-4 w-4" />
                Send All Pending
            </Button>
            <Button variant="secondary">
                <FileDown className="mr-2 h-4 w-4" />
                Export as PDF
            </Button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <WarningLettersTable data={warnings} onRowSelect={handleSelectStudent} onUpdateStatus={handleUpdateStatus}/>
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
                            <p className="mb-4"><strong>Matric Number:</strong> {selectedStudent.matric_number}</p>
                            
                            <p className="mb-4">Dear {getFirstName(selectedStudent.student_name)},</p>
                            
                            <p className="mb-4">This letter serves as a formal warning regarding your attendance at required chapel services. Our records indicate that you have missed <strong>{selectedStudent.miss_count}</strong> services for the week of <strong>{format(new Date(selectedStudent.week_start), 'PPP')}</strong> to <strong>{format(endOfWeek(new Date(selectedStudent.week_start), { weekStartsOn: 1 }), 'PPP')}</strong>.</p>
                            
                            <p className="mb-2">The dates of the missed services are as follows:</p>
                            <ul className="list-disc list-inside mb-4">
                                {selectedStudent.missed_service_dates.map(date => (
                                    <li key={new Date(date).toISOString()}>{format(new Date(date), 'PPP')}</li>
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
                                Select a student to preview their letter, or adjust the week if none are shown.
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
