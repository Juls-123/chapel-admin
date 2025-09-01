
'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { format } from 'date-fns';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { services, attendanceRecords } from '@/lib/mock-data';
import { AttendanceTable } from './data-table';

export default function ServiceAttendancePage({ params }: { params: { serviceId: string } }) {
  const service = services.find((s) => s.id === params.serviceId);
  const records = attendanceRecords.filter((r) => r.service_id === params.serviceId);

  if (!service) {
    notFound();
  }
  
  const serviceName = service.name || `${service.type.charAt(0).toUpperCase() + service.type.slice(1)} Service`;
  const serviceDate = format(new Date(service.date), "EEEE, MMMM d, yyyy 'at' p");

  return (
    <AppShell>
      <PageHeader
        title={serviceName}
        description={`Attendance records for the service held on ${serviceDate}.`}
      >
        <div className="flex gap-2">
            <Link href="/services">
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Services
                </Button>
            </Link>
            <Button>
                <Download className="mr-2 h-4 w-4" />
                Export List
            </Button>
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
            <CardTitle>All Attendees ({records.length})</CardTitle>
            <CardDescription>A complete log of all students for this service.</CardDescription>
        </CardHeader>
        <CardContent>
            <AttendanceTable data={records} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
