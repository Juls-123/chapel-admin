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
import type { StudentWithRecords } from '@/lib/types';
import { cn } from '@/lib/utils';
import { attendanceRecords as allAttendance } from '@/lib/mock-data';

interface StudentProfileModalProps {
  student: StudentWithRecords | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentProfileModal({ student, open, onOpenChange }: StudentProfileModalProps) {
  if (!student) return null;

  const getStatusBadge = (status: 'present' | 'absent' | 'exempted') => {
    switch (status) {
      case 'present':
        return <Badge variant="default" className="bg-green-100 text-green-800">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'exempted':
        return <Badge variant="secondary">Exempted</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback>{student.full_name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl">{student.full_name}</DialogTitle>
              <DialogDescription>
                {student.matric_number} &middot; {student.email}
              </DialogDescription>
               <div className="text-sm text-muted-foreground mt-1 space-x-2">
                <span>Level: {student.level}</span>
                <span>&middot;</span>
                <span>Parent's Tel: {student.parents_phone_number}</span>
              </div>
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
                  {student.attendance.length > 0 ? (
                    student.attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.service_name}</TableCell>
                        <TableCell>{format(new Date(record.scanned_at), 'PPP')}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">
                        No attendance records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
