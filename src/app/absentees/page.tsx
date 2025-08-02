import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { services, attendanceRecords } from '@/lib/mock-data';
import { AbsenteesTable } from './data-table';
import { Button } from '@/components/ui/button';

export default function AbsenteesPage() {
  const absentees = attendanceRecords.filter(r => r.status === 'absent');

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
              <CardTitle>Select a Service</CardTitle>
              <CardDescription>Choose a service to view its absentees.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue={services[0].id}>
                <SelectTrigger className="w-full md:w-[280px]">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name || `${service.type.charAt(0).toUpperCase() + service.type.slice(1)} Service`} - {new Date(service.date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
