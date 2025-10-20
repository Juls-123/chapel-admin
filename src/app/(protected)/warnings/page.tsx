"use client";

import { useState } from "react";
import {
  Calendar,
  FileText,
  CalendarRange,
  MoreHorizontal,
  ArrowLeft,
  Send,
  Download,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";

// Types
type Mode = "single" | "batch" | "weekly";

type ModeContext = {
  mode: Mode;
  selection: {
    date?: string;
    dates?: string[];
    serviceId?: string;
    serviceIds?: string[];
  };
};

type ActivityReport = {
  serviceId: string;
  serviceName: string;
  date: string;
  warningsSent: number;
  warningsPending: number;
  status: "pending" | "complete" | "in-progress";
};

type WarningLetterSummary = {
  matric_number: string;
  student_name: string;
  miss_count: number;
  status: "none" | "pending" | "sent";
};

// Mock data
const mockServices = [
  { id: "CS101", name: "Computer Science 101" },
  { id: "CS201", name: "Data Structures" },
  { id: "MTH101", name: "Calculus I" },
  { id: "PHY101", name: "Physics I" },
];

const mockActivityReports: ActivityReport[] = [
  {
    serviceId: "CS101",
    serviceName: "Computer Science 101",
    date: "2025-10-15",
    warningsSent: 5,
    warningsPending: 2,
    status: "complete",
  },
  {
    serviceId: "CS201",
    serviceName: "Data Structures",
    date: "2025-10-14",
    warningsSent: 3,
    warningsPending: 1,
    status: "in-progress",
  },
];

const mockWarningLetters: WarningLetterSummary[] = [
  {
    matric_number: "2020/001",
    student_name: "John Doe",
    miss_count: 3,
    status: "pending",
  },
  {
    matric_number: "2020/002",
    student_name: "Jane Smith",
    miss_count: 4,
    status: "pending",
  },
  {
    matric_number: "2020/003",
    student_name: "Bob Johnson",
    miss_count: 5,
    status: "sent",
  },
];

// Mode Selection Cards Component
function ModeSelectionCards({
  onModeSelect,
}: {
  onModeSelect: (mode: Mode) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card
        className="cursor-pointer transition-all hover:shadow-md hover:border-primary"
        onClick={() => onModeSelect("single")}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <Calendar className="h-8 w-8 text-primary" />
            <Badge variant="outline">Quick</Badge>
          </div>
          <CardTitle className="text-xl">Single Mode</CardTitle>
          <CardDescription>
            Generate warning letters for a specific service on a specific date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">Start Single Mode</Button>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer transition-all hover:shadow-md hover:border-primary"
        onClick={() => onModeSelect("batch")}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <FileText className="h-8 w-8 text-primary" />
            <Badge variant="outline">Flexible</Badge>
          </div>
          <CardTitle className="text-xl">Batch Mode</CardTitle>
          <CardDescription>
            Select multiple services and dates for bulk processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">Start Batch Mode</Button>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer transition-all hover:shadow-md hover:border-primary"
        onClick={() => onModeSelect("weekly")}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CalendarRange className="h-8 w-8 text-primary" />
            <Badge variant="outline">Automated</Badge>
          </div>
          <CardTitle className="text-xl">Weekly Mode</CardTitle>
          <CardDescription>
            Process all services for the current week automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">Start Weekly Mode</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Activity Report Table Component
function ActivityReportTable({ reports }: { reports: ActivityReport[] }) {
  const statusConfig = {
    pending: {
      label: "Pending",
      color:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    },
    complete: {
      label: "Complete",
      color:
        "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    },
    "in-progress": {
      label: "In Progress",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    },
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Activity Report</CardTitle>
        <CardDescription>
          Recent warning letter actions across all services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Warnings Sent</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length ? (
                reports.map((report) => (
                  <TableRow key={`${report.serviceId}-${report.date}`}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{report.serviceName}</div>
                        <div className="text-sm text-muted-foreground">
                          {report.serviceId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{report.date}</TableCell>
                    <TableCell>{report.warningsSent}</TableCell>
                    <TableCell>{report.warningsPending}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-0",
                          statusConfig[report.status].color
                        )}
                      >
                        {statusConfig[report.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No activity reports yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Single Mode Modal
function SingleModeModal({
  open,
  onOpenChange,
  onLockIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLockIn: (context: ModeContext) => void;
}) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedService, setSelectedService] = useState("");

  const handleLockIn = () => {
    if (selectedDate && selectedService) {
      onLockIn({
        mode: "single",
        selection: {
          date: selectedDate,
          serviceId: selectedService,
        },
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Single Mode Setup</DialogTitle>
          <DialogDescription>
            Select a date and service to generate warning letters
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date</label>
            <input
              type="date"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Service</label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a service" />
              </SelectTrigger>
              <SelectContent>
                {mockServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLockIn}
            disabled={!selectedDate || !selectedService}
          >
            Lock In & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Batch Mode Modal
function BatchModeModal({
  open,
  onOpenChange,
  onLockIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLockIn: (context: ModeContext) => void;
}) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState("");

  const addDate = () => {
    if (currentDate && !selectedDates.includes(currentDate)) {
      setSelectedDates([...selectedDates, currentDate]);
      setCurrentDate("");
    }
  };

  const removeDate = (date: string) => {
    setSelectedDates(selectedDates.filter((d) => d !== date));
  };

  const toggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter((id) => id !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const handleLockIn = () => {
    if (selectedDates.length && selectedServices.length) {
      onLockIn({
        mode: "batch",
        selection: {
          dates: selectedDates,
          serviceIds: selectedServices,
        },
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Batch Mode Setup</DialogTitle>
          <DialogDescription>
            Select multiple dates and services for bulk processing
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Add Dates</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
              />
              <Button onClick={addDate}>Add</Button>
            </div>
            {selectedDates.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedDates.map((date) => (
                  <Badge
                    key={date}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeDate(date)}
                  >
                    {date} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Services</label>
            <div className="space-y-2">
              {mockServices.map((service) => (
                <div key={service.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={service.id}
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => toggleService(service.id)}
                  />
                  <label
                    htmlFor={service.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {service.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {selectedDates.length > 0 && selectedServices.length > 0 && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                Will process <strong>{selectedServices.length}</strong> services
                across <strong>{selectedDates.length}</strong> dates
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLockIn}
            disabled={!selectedDates.length || !selectedServices.length}
          >
            Lock In & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Business View Component
function BusinessView({
  context,
  onBack,
}: {
  context: ModeContext;
  onBack: () => void;
}) {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(
    mockWarningLetters[0]?.matric_number || null
  );

  const toggleRowSelection = (matricNumber: string) => {
    if (selectedRows.includes(matricNumber)) {
      setSelectedRows(selectedRows.filter((id) => id !== matricNumber));
    } else {
      setSelectedRows([...selectedRows, matricNumber]);
    }
  };

  const getContextDisplay = () => {
    if (context.mode === "single") {
      const service = mockServices.find(
        (s) => s.id === context.selection.serviceId
      );
      return `${service?.name} | ${context.selection.date}`;
    } else if (context.mode === "batch") {
      return `${context.selection.serviceIds?.length} services | ${context.selection.dates?.length} dates`;
    } else {
      return "Current Week";
    }
  };

  const selectedStudentData = mockWarningLetters.find(
    (s) => s.matric_number === selectedStudent
  );

  return (
    <AppShell>
      <div className="space-y-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {context.mode.charAt(0).toUpperCase() +
                      context.mode.slice(1)}{" "}
                    Mode
                  </p>
                  <p className="font-medium">{getContextDisplay()}</p>
                </div>
              </div>
              <Badge variant="outline">
                {mockWarningLetters.length} students
              </Badge>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-wrap gap-2">
              <Button size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate All
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedRows.length === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Selected ({selectedRows.length})
              </Button>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedRows.length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark as Sent
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Warning Letters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Miss Count</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockWarningLetters.map((letter) => (
                      <TableRow
                        key={letter.matric_number}
                        className={cn(
                          "cursor-pointer",
                          selectedStudent === letter.matric_number &&
                            "bg-muted/50"
                        )}
                        onClick={() => setSelectedStudent(letter.matric_number)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRows.includes(
                              letter.matric_number
                            )}
                            onCheckedChange={() =>
                              toggleRowSelection(letter.matric_number)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {letter.student_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {letter.matric_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{letter.miss_count}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-0 capitalize",
                              letter.status === "sent" &&
                                "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
                              letter.status === "pending" &&
                                "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"
                            )}
                          >
                            {letter.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Warning Letter Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedStudentData ? (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 bg-white dark:bg-gray-950 min-h-[400px]">
                    <div className="text-center mb-6">
                      <h3 className="font-bold text-lg">WARNING LETTER</h3>
                      <p className="text-sm text-muted-foreground">
                        Chapel Attendance Violation Notice
                      </p>
                    </div>

                    <div className="space-y-4 text-sm">
                      <p>Date: {new Date().toLocaleDateString()}</p>
                      <p>
                        To: <strong>{selectedStudentData.student_name}</strong>
                      </p>
                      <p>Matric No: {selectedStudentData.matric_number}</p>

                      <div className="my-4">
                        <p className="font-semibold">
                          Subject: Warning for Absence from Chapel Services
                        </p>
                      </div>

                      <p>Dear {selectedStudentData.student_name},</p>

                      <p>
                        This letter serves as a formal warning from the
                        Chaplaincy Unit of Mountain Top University regarding
                        your chapel attendance record. Our records indicate that
                        you have missed{" "}
                        <strong>{selectedStudentData.miss_count}</strong> chapel
                        service(s), which exceeds the permitted limit.
                      </p>

                      <p>
                        Regular participation in chapel services is an essential
                        part of spiritual growth and community life at Mountain
                        Top University. Your continued absence is therefore a
                        matter of concern.
                      </p>

                      <p>
                        You are strongly advised to take immediate steps to
                        improve your attendance. Further absences may lead to
                        disciplinary action in line with the university’s chapel
                        attendance regulations.
                      </p>

                      <p className="mt-4">Sincerely,</p>
                      <p className="font-semibold">The Chaplaincy Unit</p>
                      <p>Mountain Top University</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Print
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Select a student to preview their warning letter
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

// Main Component
export default function WarningLettersManagement() {
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [modeContext, setModeContext] = useState<ModeContext | null>(null);
  const [isBusinessViewOpen, setIsBusinessViewOpen] = useState(false);

  const handleModeSelect = (mode: Mode) => {
    setActiveMode(mode);
    if (mode === "weekly") {
      setModeContext({
        mode: "weekly",
        selection: {},
      });
      setIsBusinessViewOpen(true);
    }
  };

  const handleModalLockIn = (context: ModeContext) => {
    setModeContext(context);
    setIsBusinessViewOpen(true);
  };

  const handleBack = () => {
    setIsBusinessViewOpen(false);
    setActiveMode(null);
    setModeContext(null);
  };

  if (isBusinessViewOpen && modeContext) {
    return <BusinessView context={modeContext} onBack={handleBack} />;
  }

  return (
    <AppShell>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Warning Letters Management
          </h1>
          <p className="text-muted-foreground">
            Generate and manage student warning letters across multiple modes
          </p>
        </div>

        <ModeSelectionCards onModeSelect={handleModeSelect} />

        <ActivityReportTable reports={mockActivityReports} />

        <SingleModeModal
          open={activeMode === "single"}
          onOpenChange={(open) => !open && setActiveMode(null)}
          onLockIn={handleModalLockIn}
        />

        <BatchModeModal
          open={activeMode === "batch"}
          onOpenChange={(open) => !open && setActiveMode(null)}
          onLockIn={handleModalLockIn}
        />
      </div>
    </AppShell>
  );
}
