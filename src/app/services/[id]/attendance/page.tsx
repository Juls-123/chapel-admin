"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Search,
  X,
  FileText,
} from "lucide-react";
import { UIStateWrapper } from "@/components/ui-states/UIStateWrapper";
import { api } from "@/lib/requestFactory";
import type { Database } from "@/lib/types/generated";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

interface AttendanceRecord {
  unique_id: string;
  level: string | number;
  gender: string;
  student_id: string;
  matric_number: string;
  student_name: string;
  status: "present" | "absent" | "exempted";
  reason?: string; // For exempted students
}

interface AttendanceData {
  service_id: string;
  level_code: string;
  level_name: string;
  upload_id?: string;
  upload_date?: string;
  attendance: AttendanceRecord[];
  summary: {
    total_students: number;
    present: number;
    absent: number;
    exempted: number;
    percentage: number;
  };
  batches_processed?: number;
}

interface AttendancePageProps {
  params: Promise<{ id: string }>;
}

const LEVEL_CONFIGS = [
  { id: "100", name: "100 Level" },
  { id: "200", name: "200 Level" },
  { id: "300", name: "300 Level" },
  { id: "400", name: "400 Level" },
  { id: "500", name: "500 Level" },
];

const ITEMS_PER_PAGE = 20;

export default function AttendancePage({ params }: AttendancePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const serviceId = resolvedParams.id;
  const [activeLevel, setActiveLevel] = useState("100");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "present" | "absent" | "exempted"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportLevel, setExportLevel] = useState("100");
  const [exportType, setExportType] = useState<
    "attendees" | "absentees" | "full"
  >("full");

  // Fetch service details
  const { data: service, isLoading: serviceLoading } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: async () => {
      const result = await api.get<
        Database["public"]["Tables"]["services"]["Row"] & {
          service_levels?: Array<{
            level: { code: string; name: string };
          }>;
        }
      >(`/api/services/${serviceId}`);
      return result;
    },
  });

  // Fetch attendance data for current level using consolidated API
  const {
    data: attendanceResponse,
    isLoading: attendanceLoading,
    refetch: refetchAttendance,
    error: attendanceError,
  } = useQuery({
    queryKey: ["service-attendance", serviceId, activeLevel],
    queryFn: async (): Promise<AttendanceData> => {
      const result = await api.get<AttendanceData>(
        `/api/services/${serviceId}/attendance?level_code=${activeLevel}`
      );
      return result;
    },
    enabled: !!serviceId && !!activeLevel,
  });

  const attendanceData = attendanceResponse?.attendance || [];
  const stats = attendanceResponse?.summary || {
    present: 0,
    absent: 0,
    exempted: 0,
    total_students: 0,
    percentage: 0,
  };

  // Filter attendance based on status and search query
  const filteredAttendance = (attendanceData || []).filter((record) => {
    const matchesSearch = searchQuery
      ? record.matric_number
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        record.student_name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesStatus =
      statusFilter === "all" || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Get counts for each status
  const presentCount =
    attendanceData?.filter((r) => r.status === "present").length || 0;
  const absentCount =
    attendanceData?.filter((r) => r.status === "absent").length || 0;
  const exemptedCount =
    attendanceData?.filter((r) => r.status === "exempted").length || 0;

  // Pagination logic
  const totalPages = Math.ceil(filteredAttendance.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredAttendance.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleFilterChange = (
    newStatusFilter: "all" | "present" | "absent" | "exempted"
  ) => {
    setStatusFilter(newStatusFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleExport = async () => {
    if (!attendanceData || attendanceData.length === 0) return;

    const csvContent = [
      ["Matric Number", "Student Name", "Level", "Gender", "Status"].join(","),
      ...attendanceData.map((record) =>
        [
          record.matric_number,
          record.student_name,
          record.level,
          record.gender,
          record.status,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${service?.name || "service"}-${activeLevel}L.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePDFExport = async () => {
    const exportData = await api.get<AttendanceData>(
      `/api/services/${serviceId}/attendance?level_code=${exportLevel}`
    );

    let dataToExport = exportData?.attendance || [];

    if (exportType === "attendees") {
      dataToExport = dataToExport.filter(
        (record: { status: string }) => record.status === "present"
      );
    } else if (exportType === "absentees") {
      dataToExport = dataToExport.filter(
        (record: { status: string }) => record.status === "absent"
      );
    }

    const tableData = dataToExport.map((record: any) => [
      record.matric_number,
      record.student_name,
      record.level,
      record.gender,
      record.status,
    ]);

    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text("Attendance Report", 20, 20);
    pdf.setFontSize(12);
    pdf.text(`Service: ${service?.name || "Service"}`, 20, 30);
    pdf.text(`Level: ${exportLevel}L`, 20, 35);

    autoTable(pdf, {
      head: [["Matric Number", "Student Name", "Level", "Gender", "Status"]],
      body: tableData,
      startY: 40,
    });

    pdf.save(`attendance-${service?.name || "service"}-${exportLevel}L.pdf`);
  };

  const getServiceLevels = () => {
    if (!service?.service_levels) return "All Levels";

    return service.service_levels.map((sl) => `${sl.level.code}L`).join(", ");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={`Attendance - ${service?.name || "Service"}`}
          description={
            service?.service_date
              ? new Date(service.service_date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : undefined
          }
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAttendance()}
            disabled={attendanceLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${attendanceLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!attendanceData || attendanceData.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={!attendanceData || attendanceData.length === 0}
              >
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Attendance PDF</DialogTitle>
                <DialogDescription>
                  Choose the level and type of list to export as PDF.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Level</label>
                  <Select value={exportLevel} onValueChange={setExportLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVEL_CONFIGS.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">List Type</label>
                  <Select
                    value={exportType}
                    onValueChange={(
                      value: "attendees" | "absentees" | "full"
                    ) => setExportType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full List</SelectItem>
                      <SelectItem value="attendees">Attendees Only</SelectItem>
                      <SelectItem value="absentees">Absentees Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setExportModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handlePDFExport}>Export PDF</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Service Info */}
        {service && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Applicable Levels: {getServiceLevels()}
                  </p>
                </div>
                <Badge variant="outline">{service.status}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs
          value={activeLevel}
          onValueChange={(value) => {
            setActiveLevel(value);
            setCurrentPage(1);
            setStatusFilter("all");
            setSearchQuery("");
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-5">
            {LEVEL_CONFIGS.map((level) => (
              <TabsTrigger
                key={level.id}
                value={level.id}
                className="flex flex-col gap-1"
              >
                <span>{level.name}</span>
                {activeLevel === level.id && (
                  <span className="text-xs text-muted-foreground">
                    {stats.present}/{stats.total_students}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {LEVEL_CONFIGS.map((level) => (
            <TabsContent key={level.id} value={level.id} className="mt-6">
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <Card
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => handleFilterChange("all")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Students
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">
                        {stats.total_students}
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer transition-colors hover:bg-green-50"
                    onClick={() => handleFilterChange("present")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-600">
                        Present
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-green-600">
                        {stats.present}
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer transition-colors hover:bg-red-50"
                    onClick={() => handleFilterChange("absent")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-red-600">
                        Absent
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-red-600">
                        {stats.absent}
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer transition-colors hover:bg-yellow-50"
                    onClick={() => handleFilterChange("exempted")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-yellow-600">
                        Exempted
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-yellow-600">
                        {stats.exempted}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Search and Filters */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or matric number..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {(statusFilter !== "all" || searchQuery) && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>

                {/* Active Filters Display */}
                {(statusFilter !== "all" || searchQuery) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Active filters:
                    </span>
                    {statusFilter !== "all" && (
                      <Badge variant="secondary">Status: {statusFilter}</Badge>
                    )}
                    {searchQuery && (
                      <Badge variant="secondary">Search: "{searchQuery}"</Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      ({filteredAttendance.length} of {attendanceData.length}{" "}
                      records)
                    </span>
                  </div>
                )}

                {/* Attendance Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>{level.name} Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UIStateWrapper
                      isLoading={attendanceLoading || serviceLoading}
                      error={attendanceError}
                      data={paginatedData}
                      emptyTitle="No attendance data"
                      emptyMessage="No attendance records found for this service and level."
                      onRetry={refetchAttendance}
                      loadingMessage="Loading attendance data..."
                    >
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Matric Number</TableHead>
                              <TableHead>Student Name</TableHead>
                              <TableHead>Level</TableHead>
                              <TableHead>Gender</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedData.map((record) => (
                              <TableRow key={record.unique_id}>
                                <TableCell className="font-medium">
                                  {record.matric_number}
                                </TableCell>
                                <TableCell>{record.student_name}</TableCell>
                                <TableCell>{record.level}</TableCell>
                                <TableCell className="capitalize">
                                  {record.gender}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      record.status === "present"
                                        ? "default"
                                        : record.status === "absent"
                                        ? "destructive"
                                        : "outline"
                                    }
                                  >
                                    {record.status === "exempted"
                                      ? `Exempted${
                                          record.reason
                                            ? ` (${record.reason})`
                                            : ""
                                        }`
                                      : record.status === "present"
                                      ? "Present"
                                      : "Absent"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-muted-foreground">
                            Showing {startIndex + 1} to{" "}
                            {Math.min(
                              startIndex + ITEMS_PER_PAGE,
                              filteredAttendance.length
                            )}{" "}
                            of {filteredAttendance.length} records
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </Button>
                            <span className="text-sm">
                              Page {currentPage} of {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(currentPage + 1)}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </UIStateWrapper>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  );
}
