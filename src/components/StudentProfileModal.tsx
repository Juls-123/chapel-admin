// Example modal component consuming vw_student_profile schema with UIStateWrapper
// NOTE: This file is swap-ready for production Supabase Auth — replace with Supabase wrapper only. Do not change callsites.
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Student } from '@/lib/types';
import { useAttendance } from '@/hooks/useAttendance';
import { UIStateWrapper } from './ui-states/UIStateWrapper';
import { useToastExt } from '@/hooks/useToastExt';
import { ErrorHandler } from '@/utils/ErrorHandler';

interface StudentProfileModalProps {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentProfileModal({ studentId, open, onOpenChange }: StudentProfileModalProps) {
  const { error: showError } = useToastExt();
  const { data: attendanceData, isLoading, error, refetch } = useAttendance(studentId);

  // Get student info from first attendance record (contains student profile data)
  const studentProfile = attendanceData?.[0];

  const getStatusBadge = (present: number, absent: number, exempted: number) => {
    if (present > 0) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Present</Badge>;
    } else if (exempted > 0) {
      return <Badge variant="secondary">Exempted</Badge>;
    } else if (absent > 0) {
      return <Badge variant="destructive">Absent</Badge>;
    }
    return <Badge>Unknown</Badge>;
  };

  const handleError = (error: Error) => {
    ErrorHandler.logError(error, { component: 'StudentProfileModal', studentId });
    showError('Failed to load student data', error.message);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <UIStateWrapper
          isLoading={isLoading}
          error={error}
          data={attendanceData}
          emptyTitle="No attendance data"
          emptyMessage="This student has no attendance records yet."
          onRetry={() => refetch()}
        >
          {studentProfile && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback>
                      {studentProfile.first_name?.[0]}{studentProfile.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-2xl">
                      {studentProfile.full_name || `${studentProfile.first_name} ${studentProfile.last_name}`}
                    </DialogTitle>
                    <DialogDescription>
                      {studentProfile.matric_number}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Attendance History</h3>
                <ScrollArea className="h-72">
                  <div className="pr-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceData.map((record) => (
                          <TableRow key={`${record.service_id}-${record.student_id}`}>
                            <TableCell className="font-medium">
                              {record.service_name || 'Unknown Service'}
                            </TableCell>
                            <TableCell>
                              {record.service_date ? format(new Date(record.service_date), 'PPP') : 'Unknown Date'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(record.total_present, record.total_absent, record.total_exempted)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </UIStateWrapper>
      </DialogContent>
    </Dialog>
  );
}
