
"use client";

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { services, attendanceRecords, exeats } from '@/lib/mock-data';
import { AbsenteesTable } from './data-table';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


export default function AbsenteesPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const isStudentOnExeat = (matricNumber: string, serviceDate: Date) => {
    return exeats.some(exeat => 
      exeat.matric_number === matricNumber &&
      serviceDate >= new Date(exeat.start_date) &&
      serviceDate <= new Date(exeat.end_date)
    );
  };
  
  const servicesOnDate = selectedDate ? services.filter(service => new Date(service.date).toDateString() === selectedDate.toDateString()) : [];
  const serviceIdsOnDate = servicesOnDate.map(s => s.id);

  const absentees = attendanceRecords.filter(r => {
    if (!selectedDate) return false;
    const serviceDate = new Date(r.scanned_at);
    return r.status === 'absent' &&
      serviceIdsOnDate.includes(r.service_id) &&
      !isStudentOnExeat(r.matric_number, serviceDate);
  });

  return (
    <AppShell>
      <PageHeader
        title="Absentees Viewer"
        description="Review and manage students who were absent from a service."
      />
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Select a Date</CardTitle>
              <CardDescription>Choose a date to view absentees.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal md:w-[280px]",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="secondary">Export List</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AbsenteesTable data={absentees} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
