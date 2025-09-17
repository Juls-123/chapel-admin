// "use client";

// import { useState, useEffect } from "react";
// import {
//   ChevronLeft,
//   ChevronRight,
//   FileText,
//   Send,
//   FileDown,
//   RefreshCw,
//   Plus,
// } from "lucide-react";
// import { format, startOfWeek, endOfWeek, add } from "date-fns";

// import { AppShell } from "@/components/AppShell";
// import { PageHeader } from "@/components/PageHeader";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription,
// } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Skeleton } from "@/components/ui/skeleton";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import type { WarningLetterSummary } from "@/lib/types";
// import { WarningLettersTable } from "./data-table";
// import { useToast } from "@/hooks/use-toast";
// import {
//   useWarnings,
//   useGenerateWarnings,
//   useBulkUpdateWarnings,
//   useWarningStats,
// } from "@/hooks/useWarnings";
// import { LoadingSpinner } from "@/components/ui-states/LoadingSpinner";
// import { ErrorState } from "@/components/ui-states/ErrorState";
// import { EmptyState } from "@/components/ui-states/EmptyState";

// export default function WarningLettersPage() {
//   const [selectedStudent, setSelectedStudent] =
//     useState<WarningLetterSummary | null>(null);
//   const [weekOffset, setWeekOffset] = useState(0);
//   const { toast } = useToast();

//   // Calculate current week start date
//   const currentWeekStart = startOfWeek(add(new Date(), { weeks: weekOffset }), {
//     weekStartsOn: 1,
//   });
//   const weekStartString = format(currentWeekStart, "yyyy-MM-dd");

//   // Fetch warnings data
//   const {
//     data: warningsData,
//     isLoading,
//     error,
//     refetch,
//   } = useWarnings({
//     week_start: weekStartString,
//     page: 1,
//     limit: 100,
//   });

//   const warnings = warningsData?.data || [];
//   const { stats, isLoading: statsLoading } = useWarningStats(weekStartString);

//   // Mutations
//   const generateWarnings = useGenerateWarnings();
//   const bulkUpdateWarnings = useBulkUpdateWarnings();

//   useEffect(() => {
//     if (warnings.length > 0 && !selectedStudent) {
//       setSelectedStudent(warnings[0]);
//     } else if (warnings.length === 0) {
//       setSelectedStudent(null);
//     }
//   }, [warnings, selectedStudent]);

//   const handleSelectStudent = (student: WarningLetterSummary) => {
//     setSelectedStudent(student);
//   };

//   const handleUpdateStatus = (
//     matricNumber: string,
//     status: WarningLetterSummary["status"]
//   ) => {
//     // This will be handled by the mutation hooks and automatic refetch
//     if (selectedStudent?.matric_number === matricNumber) {
//       setSelectedStudent((prev) => (prev ? { ...prev, status } : null));
//     }
//   };

//   const handleGenerateWarnings = async () => {
//     try {
//       await generateWarnings.mutateAsync({
//         week_start: weekStartString,
//         threshold: 2, // Default threshold of 2 absences
//       });
//       refetch(); // Refresh the data
//     } catch (error) {
//       // Error handling is done in the hook
//     }
//   };

//   const handleSendAll = async () => {
//     const pendingCount = warnings.filter(
//       (w: { status: string }) => w.status === "pending"
//     ).length;
//     if (pendingCount === 0) {
//       toast({
//         title: "No letters to send",
//         description: "All warnings have already been sent.",
//       });
//       return;
//     }

//     try {
//       await bulkUpdateWarnings.mutateAsync({
//         week_start: weekStartString,
//         status: "sent",
//       });
//       refetch(); // Refresh the data
//     } catch (error) {
//       // Error handling is done in the hook
//     }
//   };

//   const getWeekDisplay = (offset: number) => {
//     const start = startOfWeek(add(new Date(), { weeks: offset }), {
//       weekStartsOn: 1,
//     });
//     const end = endOfWeek(add(new Date(), { weeks: offset }), {
//       weekStartsOn: 1,
//     });
//     return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
//   };

//   const getFirstName = (fullName: string) => {
//     return fullName.split(" ")[0];
//   };

//   // Loading state
//   if (isLoading) {
//     return (
//       <AppShell>
//         <PageHeader
//           title="Warning Letters"
//           description="Generate, review, and send warning letters to students."
//         />
//         <div className="flex items-center justify-center min-h-[400px]">
//           <LoadingSpinner size="lg" />
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
