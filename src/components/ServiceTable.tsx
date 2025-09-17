"use client";

import { useState, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import {
  Eye,
  CheckCircle,
  Lock,
  Unlock,
  Copy,
  MoreHorizontal,
  RefreshCw,
  Calendar,
  X,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { Service } from "@/hooks/useServices";

interface ServiceTableProps {
  services: Service[];
  onEdit: (service: Service) => void;
  onStatusChange: (serviceId: string, status: Service["status"]) => void;
  onRefresh: () => void;
  onViewAttendance: (service: Service) => void;
  onToggleLock: (serviceId: string) => void;
  onMarkCompleted: (serviceId: string) => void;
  onCopyServiceId: (serviceId: string) => void;
}

export function ServiceTable({
  services,
  onEdit,
  onStatusChange,
  onRefresh,
  onViewAttendance,
  onToggleLock,
  onMarkCompleted,
  onCopyServiceId,
}: ServiceTableProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Filter services by selected date
  const filteredServices = useMemo(() => {
    if (!selectedDate) return services;

    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
    return services.filter((service) => {
      try {
        const serviceDate = parseISO(service.date);
        const serviceDateStr = isValid(serviceDate)
          ? format(serviceDate, "yyyy-MM-dd")
          : null;
        return serviceDateStr === selectedDateStr;
      } catch {
        return false;
      }
    });
  }, [services, selectedDate]);

  // Group services by date
  const servicesByDate = useMemo(() => {
    const grouped = new Map<string, Service[]>();

    filteredServices.forEach((service) => {
      try {
        const serviceDate = parseISO(service.date);
        const dateKey = isValid(serviceDate)
          ? format(serviceDate, "yyyy-MM-dd")
          : "invalid-date";

        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(service);
      } catch (error) {
        // Handle invalid dates
        if (!grouped.has("invalid-date")) {
          grouped.set("invalid-date", []);
        }
        grouped.get("invalid-date")!.push(service);
      }
    });

    // Sort dates in descending order (most recent first)
    const sortedEntries = Array.from(grouped.entries()).sort(([a], [b]) => {
      if (a === "invalid-date") return 1;
      if (b === "invalid-date") return -1;
      return b.localeCompare(a);
    });

    return sortedEntries;
  }, [filteredServices]);

  const getStatusColor = (status: Service["status"]) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300";
      case "canceled":
        return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300";
    }
  };

  if (servicesByDate.length === 0) {
    return (
      <div className="space-y-4">
        {/* Filter Controls */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, "PPP")
                    : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
                {selectedDate && (
                  <div className="p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(undefined)}
                      className="w-full"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear filter
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {selectedDate
                ? "No services found for the selected date."
                : "No services found."}
            </p>
            {selectedDate && (
              <Button
                variant="outline"
                onClick={() => setSelectedDate(undefined)}
                className="mt-4"
              >
                Clear date filter
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Filter by date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
              {selectedDate && (
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(undefined)}
                    className="w-full"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredServices.length} services across{" "}
            {servicesByDate.length}{" "}
            {servicesByDate.length === 1 ? "date" : "dates"}
          </p>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Services by Date */}
      {servicesByDate.map(([dateKey, dateServices]) => {
        const displayDate =
          dateKey === "invalid-date"
            ? "Invalid Date"
            : format(parseISO(dateKey), "EEEE, MMMM d, yyyy");

        return (
          <Card key={dateKey} className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                {displayDate}
                <Badge variant="outline" className="ml-2">
                  {dateServices.length} service
                  {dateServices.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {dateServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">
                            {service.name ||
                              `${
                                service.type.charAt(0).toUpperCase() +
                                service.type.slice(1)
                              } Service`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(service.date), "h:mm a")} •{" "}
                            {Array.isArray(service.levels) &&
                            service.levels.length > 0
                              ? service.levels
                                  .map((level: any) =>
                                    typeof level === "string"
                                      ? level
                                      : level?.code || level
                                  )
                                  .join(", ")
                              : "All levels"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-0 capitalize",
                          getStatusColor(service.status)
                        )}
                      >
                        {service.status}
                      </Badge>
                      <div className="flex gap-1">
                        {service.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onMarkCompleted(service.id)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark as Complete
                          </Button>
                        )}

                        {service.status === "scheduled" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onStatusChange(service.id, "canceled")
                            }
                          >
                            Cancel
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(service)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Service
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onViewAttendance(service)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Attendance
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onToggleLock(service.id)}
                            >
                              {service.locked_after_ingestion ? (
                                <>
                                  <Unlock className="mr-2 h-4 w-4" />
                                  Unlock Ingestion
                                </>
                              ) : (
                                <>
                                  <Lock className="mr-2 h-4 w-4" />
                                  Lock Ingestion
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onCopyServiceId(service.id)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Service ID
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
