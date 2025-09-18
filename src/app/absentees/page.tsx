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
import { services, attendanceRecords, exeats } from "@/lib/mock-data";
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
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Service } from "@/lib/types";

export default function AbsenteesPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedServiceId, setSelectedServiceId] = useState<
    string | undefined
  >();

  const isStudentOnExeat = (matricNumber: string, serviceDate: Date) => {
    return exeats.some(
      (exeat) =>
        exeat.matric_number === matricNumber &&
        serviceDate >= new Date(exeat.start_date) &&
        serviceDate <= new Date(exeat.end_date)
    );
  };

  const servicesOnDate = selectedDate
    ? services.filter(
        (service) =>
          new Date(service.date).toDateString() === selectedDate.toDateString()
      )
    : [];

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedServiceId(undefined); // Reset service when date changes
  };

  const absentees = attendanceRecords.filter((r) => {
    if (!selectedDate || !selectedServiceId) return false;
    const serviceDate = new Date(r.scanned_at);
    return (
      r.status === "absent" &&
      r.service_id === selectedServiceId &&
      new Date(r.scanned_at).toDateString() === selectedDate.toDateString() &&
      !isStudentOnExeat(r.matric_number, serviceDate)
    );
  });

  const selectedService = services.find((s) => s.id === selectedServiceId);

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
                onValueChange={setSelectedServiceId}
                value={selectedServiceId}
                disabled={servicesOnDate.length === 0}
              >
                <SelectTrigger className="w-full md:w-[240px]">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {servicesOnDate.length > 0 ? (
                    servicesOnDate.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name ||
                          `${
                            service.type.charAt(0).toUpperCase() +
                            service.type.slice(1)
                          } Service`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No services on this date
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button variant="secondary">Export List</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedServiceId && selectedService ? (
            <AbsenteesTable data={absentees} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted bg-muted/50 p-8 text-center min-h-[300px]">
              <div className="rounded-full bg-background p-3">
                <Filter className="size-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {selectedDate
                  ? "Please select a service to view absentees."
                  : "Please select a date first."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
