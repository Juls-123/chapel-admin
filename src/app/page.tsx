import {
  Activity,
  CalendarCheck,
  CalendarClock,
  UserCheck,
  Users,
  FileUp,
  MailWarning,
  PlusCircle,
  UserX,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { recentActions, services, students, attendanceRecords } from '@/lib/mock-data';
import type { Service, AttendanceRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AbsenteeSummary {
    matric_number: string;
    student_name: string;
    absences: number;
}

export default function DashboardPage() {
  const todayServices = services.filter(
    (service) =>
      new Date(service.date).toDateString() === new Date().toDateString()
  );

  const absenteeCounts = attendanceRecords
    .filter(record => record.status === 'absent')
    .reduce((acc, record) => {
        acc[record.matric_number] = (acc[record.matric_number] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

  const topAbsentees: AbsenteeSummary[] = Object.entries(absenteeCounts)
    .map(([matric_number, absences]) => ({
        matric_number,
        student_name: students.find(s => s.matric_number === matric_number)?.full_name || 'Unknown Student',
        absences,
    }))
    .sort((a, b) => b.absences - a.absences)
    .slice(0, 5);


  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description={`Welcome back! Here's a summary for ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`}
      />
      <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Scanned (Today)"
            value="1,203"
            icon={UserCheck}
            change="+15.2% from yesterday"
          />
          <StatCard
            title="Current Absentees"
            value="42"
            icon={UserX}
            change="-5 since last service"
          />
          <StatCard
            title="Pending Warnings"
            value="18"
            icon={MailWarning}
            change="3 new this week"
          />
          <StatCard
            title="Recent Exeats"
            value="7"
            icon={CalendarClock}
            change="2 ending today"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Today's Services</CardTitle>
                <CardDescription>
                  Status of services scheduled for today.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayServices.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {todayServices.map((service) => (
                      <ServiceCard key={service.id} service={service} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted bg-muted/50 p-8 text-center">
                    <div className="rounded-full bg-background p-3">
                      <CalendarCheck className="size-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                      No services scheduled for today.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/services">
                <Button className="w-full">
                  <PlusCircle />
                  Create Service
                </Button>
              </Link>
              <Link href="/exeats">
                <Button variant="secondary" className="w-full">
                  <Users />
                  Add Exeat
                </Button>
              </Link>
              <Link href="/attendance">
                <Button variant="secondary" className="w-full">
                  <FileUp />
                  Upload Attendance
                </Button>
              </Link>
              <Link href="/absentees">
                <Button variant="secondary" className="w-full">
                  <UserX />
                  Review Absentees
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Admin Actions</CardTitle>
              <CardDescription>An audit trail of recent activities.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium">
                        {action.admin_name}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{action.action}</span>{' '}
                        <span className="text-muted-foreground">{action.target}</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {new Date(action.date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>Absentee Alerts</CardTitle>
                <CardDescription>Top 5 students with the most absences this month.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {topAbsentees.map(student => (
                        <div key={student.matric_number} className="flex items-center">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback>{student.student_name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                            </Avatar>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">{student.student_name}</p>
                                <p className="text-sm text-muted-foreground">{student.matric_number}</p>
                            </div>
                            <div className="ml-auto font-medium">{student.absences} absences</div>
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
            {service.name ||
                service.type.charAt(0).toUpperCase() + service.type.slice(1)}{' '}
            Service
            </CardTitle>
            <Badge className={cn('capitalize', statusColors[service.status])}>
                {service.status}
            </Badge>
        </div>
        <CardDescription>
          {new Date(service.date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex -space-x-2 overflow-hidden">
          {students.slice(0, 5).map((student) => (
            <Avatar key={student.matric_number} className="border-2 border-background">
              <AvatarImage src={`https://placehold.co/40x40.png`} data-ai-hint="student portrait" />
              <AvatarFallback>
                {student.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">+1200 others attended</p>
      </CardContent>
    </Card>
  );
}
