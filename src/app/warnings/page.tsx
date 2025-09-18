"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Send,
  FileDown,
  RefreshCw,
  Plus,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, add } from "date-fns";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WarningLettersTable } from "./data-table";
import { LoadingSpinner } from "@/components/ui-states/LoadingSpinner";
import type { WarningLetterSummary, WarningStatus } from "@/lib/types";

// Local type for UI state that extends the base WarningLetterSummary
interface WarningLetterUI extends Omit<WarningLetterSummary, 'status'> {
  status: WarningStatus | 'none';
  // Add any additional UI-specific properties here
  last_absence_date?: string; // Optional since it's UI-only
}

export default function WarningLettersPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<WarningLetterUI | null>(null);
  
  // Mock data
  const warnings: WarningLetterUI[] = [];
  const stats = {
    total: 0,
    pending: 0,
    sent: 0,
    delivered: 0,
    failed: 0
  };
  
  const isLoading = false;
  const error: Error | null = null;
  
  // Calculate current week start date
  const currentWeekStart = startOfWeek(add(new Date(), { weeks: weekOffset }), {
    weekStartsOn: 1,
  });
  
  const handleUpdateStatus = (matricNumber: string, status: WarningLetterSummary['status']) => {
    // Implementation will be added by the parent component
    console.log(`Update status for ${matricNumber} to ${status}`);
  };

  const handleGenerateWarnings = () => {
    // Implementation will be added by the parent component
  };

  const handleSendAll = () => {
    // Implementation will be added by the parent component
  };

  const getWeekDisplay = (offset: number) => {
    const start = startOfWeek(add(new Date(), { weeks: offset }), {
      weekStartsOn: 1,
    });
    const end = endOfWeek(add(new Date(), { weeks: offset }), {
      weekStartsOn: 1,
    });
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  const getFirstName = (fullName: string) => {
    return fullName.split(" ")[0];
  };

  // Loading state
  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppShell>
    );
  }

  // Error state
  if (error) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Alert>
            <AlertDescription>
              Error loading warning letters. Please try again later.
            </AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </AppShell>
    );
  }

  // Empty state
  if (warnings.length === 0) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No warning letters</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            No warning letters have been generated for this week.
          </p>
          <Button onClick={handleGenerateWarnings} className="mt-4">
            <FileText className="mr-2 h-4 w-4" />
            Generate Warnings
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Warning Letters</h1>
          <p className="text-muted-foreground">
            Manage warning letters for {getWeekDisplay(weekOffset)}
          </p>
          <div className="flex items-center space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-1">Previous</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>
              <span className="mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
              This Week
            </Button>
            <Button onClick={handleGenerateWarnings}>
              <FileText className="mr-2 h-4 w-4" />
              Generate Warnings
            </Button>
            <Button onClick={handleSendAll}>
              <Send className="mr-2 h-4 w-4" />
              Send All
            </Button>
            <Button variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Letters</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <RefreshCw className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting action</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
              <Send className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
              <p className="text-xs text-muted-foreground">Successfully sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <Alert className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Warning Letters</CardTitle>
                <CardDescription>
                  Review and manage warning letters for students with excessive absences
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WarningLettersTable
              data={warnings}
              onRowSelect={setSelectedStudent}
              onUpdateStatus={handleUpdateStatus}
            />
          </CardContent>
        </Card>

        {selectedStudent && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {getFirstName(selectedStudent.student_name)}'s Warning Letter
                  </CardTitle>
                  <CardDescription>
                    Review and manage this student's warning letter
                  </CardDescription>
                </div>
                <Badge variant={selectedStudent.status === 'pending' ? 'outline' : 'default'}>
                  {selectedStudent.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p>Dear {getFirstName(selectedStudent.student_name)},</p>
                <p>
                  This letter serves as a formal warning regarding your attendance at chapel services.
                  Our records indicate that you have accumulated {selectedStudent.miss_count} absences,
                  which exceeds the allowed limit.
                </p>
                {('last_absence_date' in selectedStudent && selectedStudent.last_absence_date) && (
                  <p>
                    Your most recent absence was on{' '}
                    {format(new Date(selectedStudent.last_absence_date), 'MMMM d, yyyy')}.
                  </p>
                )}
                <p>
                  Please be advised that further absences may result in additional disciplinary action
                  as outlined in the student handbook.
                </p>
                <p className="mt-4">Sincerely,</p>
                <p>Chapel Office</p>
              </div>
              <div className="mt-6 flex items-center justify-end space-x-2">
                <Button variant="outline">Print</Button>
                <Button>Send to Student</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
//         </div>
//       </AppShell>
//     );
//   }

//   // Error state
//   if (error) {
//     return (
//       <AppShell>
//         <PageHeader
//           title="Warning Letters"
//           description="Generate, review, and send warning letters to students."
//         />
//         <ErrorState
//           title="Failed to load warning letters"
//           message={error.message}
//           onRetry={() => refetch()}
//         />
//       </AppShell>
//     );
//   }

//   return (
//     <AppShell>
//       <PageHeader
//         title="Warning Letters"
//         description="Generate, review, and send warning letters to students."
//       />
//       <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
//         <div className="flex items-center gap-2">
//           <Button
//             variant="outline"
//             size="icon"
//             onClick={() => setWeekOffset(weekOffset - 1)}
//           >
//             <ChevronLeft className="h-4 w-4" />
//           </Button>
//           <span className="text-lg font-medium text-center w-56">
//             {getWeekDisplay(weekOffset)}
//           </span>
//           <Button
//             variant="outline"
//             size="icon"
//             onClick={() => setWeekOffset(weekOffset + 1)}
//             disabled={weekOffset >= 0}
//           >
//             <ChevronRight className="h-4 w-4" />
//           </Button>
//         </div>
//         <div className="flex gap-2">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={handleGenerateWarnings}
//             disabled={generateWarnings.isPending}
//           >
//             {generateWarnings.isPending ? (
//               <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
//             ) : (
//               <Plus className="h-4 w-4 mr-2" />
//             )}
//             Generate
//           </Button>
//           <Button
//             variant="default"
//             size="sm"
//             onClick={handleSendAll}
//             disabled={
//               warnings.filter((w: { status: string }) => w.status === "pending")
//                 .length === 0 || bulkUpdateWarnings.isPending
//             }
//           >
//             {bulkUpdateWarnings.isPending ? (
//               <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
//             ) : (
//               <Send className="h-4 w-4 mr-2" />
//             )}
//             Send All
//           </Button>
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={() => refetch()}
//             disabled={isLoading}
//           >
//             <RefreshCw
//               className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
//             />
//           </Button>
//         </div>
//       </div>

//       {/* Statistics Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">
//                   Total Warnings
//                 </p>
//                 <div className="text-2xl font-bold">
//                   {statsLoading ? (
//                     <Skeleton className="h-8 w-12" />
//                   ) : (
//                     stats.total
//                   )}
//                 </div>
//               </div>
//               <FileText className="h-8 w-8 text-muted-foreground" />
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">
//                   Pending
//                 </p>
//                 <div className="text-2xl font-bold text-orange-600">
//                   {statsLoading ? (
//                     <Skeleton className="h-8 w-12" />
//                   ) : (
//                     stats.pending
//                   )}
//                 </div>
//               </div>
//               <Badge
//                 variant="secondary"
//                 className="bg-orange-100 text-orange-800"
//               >
//                 {statsLoading ? "..." : stats.pending}
//               </Badge>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">
//                   Sent
//                 </p>
//                 <div className="text-2xl font-bold text-green-600">
//                   {statsLoading ? (
//                     <Skeleton className="h-8 w-12" />
//                   ) : (
//                     stats.sent
//                   )}
//                 </div>
//               </div>
//               <Badge
//                 variant="secondary"
//                 className="bg-green-100 text-green-800"
//               >
//                 {statsLoading ? "..." : stats.sent}
//               </Badge>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">
//                   High Risk
//                 </p>
//                 <div className="text-2xl font-bold text-red-600">
//                   {statsLoading ? (
//                     <Skeleton className="h-8 w-12" />
//                   ) : (
//                     stats.highRisk
//                   )}
//                 </div>
//               </div>
//               <Badge variant="destructive">
//                 {statsLoading ? "..." : `${stats.highRisk} (3+ absences)`}
//               </Badge>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//       {warnings.length === 0 ? (
//         <EmptyState
//           title="No warning letters found"
//           message={`No warning letters found for the week of ${getWeekDisplay(
//             weekOffset
//           )}. Generate warnings to get started.`}
//           actionLabel="Generate Warnings"
//           onAction={handleGenerateWarnings}
//         />
//       ) : (
//         <div className="grid gap-6 lg:grid-cols-5">
//           <div className="lg:col-span-3">
//             <WarningLettersTable
//               data={warnings}
//               onRowSelect={handleSelectStudent}
//               onUpdateStatus={handleUpdateStatus}
//             />
//           </div>
//           <div className="lg:col-span-2">
//             <Card className="shadow-sm sticky top-20">
//               <CardHeader>
//                 <CardTitle>Letter Preview</CardTitle>
//                 <CardDescription>
//                   A preview of the warning letter for the selected student.
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {selectedStudent ? (
//                   <div className="p-6 border rounded-lg bg-white dark:bg-background/50 min-h-[400px] text-sm text-gray-800 dark:text-gray-300 font-serif">
//                     <h2 className="text-xl font-bold mb-4 text-center">
//                       Chapel Attendance Warning
//                     </h2>
//                     <p className="mb-2">
//                       <strong>Date:</strong> {format(new Date(), "PPP")}
//                     </p>
//                     <p className="mb-2">
//                       <strong>To:</strong> {selectedStudent.student_name}
//                     </p>
//                     <p className="mb-4">
//                       <strong>Matric Number:</strong>{" "}
//                       {selectedStudent.matric_number}
//                     </p>

//                     <p className="mb-4">
//                       Dear {getFirstName(selectedStudent.student_name)},
//                     </p>

//                     <p className="mb-4">
//                       This letter serves as a formal warning regarding your
//                       attendance at required chapel services. Our records
//                       indicate that you have missed{" "}
//                       <strong>{selectedStudent.miss_count}</strong> services for
//                       the week of{" "}
//                       <strong>
//                         {format(new Date(selectedStudent.week_start), "PPP")}
//                       </strong>{" "}
//                       to{" "}
//                       <strong>
//                         {format(
//                           endOfWeek(new Date(selectedStudent.week_start), {
//                             weekStartsOn: 1,
//                           }),
//                           "PPP"
//                         )}
//                       </strong>
//                       .
//                     </p>

//                     <p className="mb-4">
//                       Chapel attendance is mandatory for all students as
//                       outlined in the Student Handbook. Consistent attendance is
//                       essential for your spiritual development and is a
//                       requirement for your continued enrollment.
//                     </p>

//                     <p className="mb-4">
//                       Consistent attendance is a vital part of our community
//                       ethos. Please ensure you attend all future services. If
//                       you believe this is an error, or if there are extenuating
//                       circumstances, please contact the administrative office
//                       immediately.
//                     </p>

//                     <p>Sincerely,</p>
//                     <p className="mt-2 font-semibold">
//                       The Chapel Administration
//                     </p>
//                   </div>
//                 ) : (
//                   <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted bg-muted/50 p-8 text-center min-h-[400px]">
//                     <div className="rounded-full bg-background p-3">
//                       <FileText className="size-8 text-muted-foreground" />
//                     </div>
//                     <p className="text-muted-foreground">
//                       Select a student to preview their letter, or adjust the
//                       week if none are shown.
//                     </p>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       )}
//     </AppShell>
//   );
// }
