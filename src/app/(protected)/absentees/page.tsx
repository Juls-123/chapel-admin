"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AbsenteesTable } from "./data-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Filter, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useServicesWithCounts, useAbsentees } from "@/hooks/useAbsentees";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { exportAbsentees } from "@/lib/utils/absentees-export";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";

export default function AbsenteesPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedServiceId, setSelectedServiceId] = useState<
    string | undefined
  >();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Format date for API (YYYY-MM-DD)
  const formattedDate = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : null;

  // Fetch services for selected date
  const {
    data: services,
    isLoading: servicesLoading,
    error: servicesError,
  } = useServicesWithCounts(formattedDate);

  // Fetch absentees for selected service
  const {
    data: absenteesData,
    isLoading: absenteesLoading,
    error: absenteesError,
  } = useAbsentees(selectedServiceId || null, currentPage, pageSize);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedServiceId(undefined); // Reset service when date changes
    setCurrentPage(1); // Reset pagination
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setCurrentPage(1); // Reset to first page
  };

  const selectedService = services?.find((s) => s.id === selectedServiceId);

  // Calculate total absentees across all services
  const totalAbsenteesForDate = services?.reduce(
    (sum, service) => sum + service.absentee_counts.total,
    0
  );

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");

  const handleExport = () => {
    if (!absenteesData?.data?.length || !selectedService) return;

    const exportDate = format(selectedDate || new Date(), "yyyy-MM-dd");
    const serviceName = selectedService.name.toLowerCase().replace(/\s+/g, "-");

    if (exportFormat === "csv") {
      exportAbsentees.toCSV(absenteesData.data, serviceName, exportDate);
    } else {
      exportAbsentees.toPDF(absenteesData.data, serviceName, exportDate);
    }

    setExportOpen(false);
  };

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
              <CardTitle>Filter Absentees</CardTitle>
              <CardDescription>
                Choose a date and a service to view absentees.
                {totalAbsenteesForDate !== undefined &&
                  totalAbsenteesForDate > 0 && (
                    <span className="ml-2 text-primary font-semibold">
                      {totalAbsenteesForDate} total absentees on{" "}
                      {format(selectedDate!, "MMM d, yyyy")}
                    </span>
                  )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal md:w-[240px]",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Select
                onValueChange={handleServiceSelect}
                value={selectedServiceId}
                disabled={servicesLoading || !services || services.length === 0}
              >
                <SelectTrigger className="w-full md:w-[240px]">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {servicesLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading services...
                    </SelectItem>
                  ) : services && services.length > 0 ? (
                    services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{service.name}</span>
                          {service.absentee_counts.total > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({service.absentee_counts.total})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No services on this date
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!selectedServiceId || !absenteesData}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Absentees</DialogTitle>
                    <DialogDescription>
                      Choose a format to export the absentees list.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        Format
                      </label>
                      <select
                        value={exportFormat}
                        onChange={(e) =>
                          setExportFormat(e.target.value as "csv" | "pdf")
                        }
                        className="w-full p-2 border rounded"
                      >
                        <option value="csv">CSV (Excel)</option>
                        <option value="pdf">PDF</option>
                      </select>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setExportOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleExport}>Export</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Services Loading State */}
          {servicesLoading && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted bg-muted/50 p-8 text-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading services...</p>
            </div>
          )}

          {/* Services Error State */}
          {servicesError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load services: {servicesError.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Services Loaded - Show Service Cards */}
          {!servicesLoading &&
            !servicesError &&
            services &&
            services.length > 0 &&
            !selectedServiceId && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Select a service above to view detailed absentees list
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service.id)}
                      className="p-4 border rounded-lg text-left transition hover:border-primary hover:bg-accent"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-sm">
                            {service.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {service.service_time?.substring(0, 5)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {service.absentee_counts.total}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Absentees
                          </div>
                        </div>
                      </div>

                      {/* Level breakdown */}
                      {Object.keys(service.absentee_counts.by_level).length >
                        0 && (
                        <div className="flex gap-2 text-xs flex-wrap mt-3">
                          {Object.entries(service.absentee_counts.by_level).map(
                            ([level, count]) => (
                              <span
                                key={level}
                                className="px-2 py-1 bg-muted rounded"
                              >
                                {level}L: <strong>{count}</strong>
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Absentees Table */}
          {selectedServiceId && selectedService && (
            <>
              {/* Summary Banner */}
              {absenteesData && (
                <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {selectedService.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Total Absentees:{" "}
                        <span className="font-semibold text-primary">
                          {absenteesData.summary.totalAbsentees}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(absenteesData.summary.byLevel).map(
                        ([level, count]) => (
                          <span
                            key={level}
                            className="px-3 py-1 bg-background rounded-lg border text-sm"
                          >
                            {level}L: <strong>{count}</strong>
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Absentees Loading State */}
              {absenteesLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Absentees Error State */}
              {absenteesError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load absentees: {absenteesError.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Absentees Table */}
              {!absenteesLoading && !absenteesError && absenteesData && (
                <AbsenteesTable
                  data={absenteesData.data}
                  pagination={absenteesData.pagination}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}

          {/* Empty State - No Date or No Services */}
          {!servicesLoading &&
            !servicesError &&
            (!services || services.length === 0) &&
            selectedDate && (
              <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted bg-muted/50 p-8 text-center min-h-[300px]">
                <div className="rounded-full bg-background p-3">
                  <Filter className="size-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No services found for {format(selectedDate, "MMMM d, yyyy")}
                </p>
              </div>
            )}

          {/* Initial Empty State */}
          {!selectedDate && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted bg-muted/50 p-8 text-center min-h-[300px]">
              <div className="rounded-full bg-background p-3">
                <CalendarIcon className="size-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Please select a date to view services and absentees.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
