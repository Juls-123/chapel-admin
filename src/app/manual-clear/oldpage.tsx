"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, isSameDay } from "date-fns";
import {
  Check,
  ChevronRight,
  User,
  Calendar as CalendarIcon,
  Clock,
  CalendarDays,
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  X,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import {
  students,
  services,
  manualClearReasons,
  attendanceRecords,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Student } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const manualClearSchema = z.object({
  date: z.date({
    required_error: "Please select a date.",
  }),
  serviceId: z.string({
    required_error: "Please select a service.",
  }),
  levelId: z.string({
    required_error: "Please select a level.",
  }),
  reasonId: z.string({
    required_error: "Please select a reason.",
  }),
  comments: z.string().optional(),
  studentIds: z.array(z.string()).default([]), // For multiple student selection
});

type ManualClearFormValues = z.infer<typeof manualClearSchema>;

const getFullName = (student: Student) =>
  `${student.first_name} ${student.middle_name} ${student.last_name}`;

export default function ManualClearPage() {
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFetchButton, setShowFetchButton] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [initialValues, setInitialValues] = useState<{
    date: Date;
    serviceId: string;
    levelId: string;
  } | null>(null);

  const form = useForm<ManualClearFormValues>({
    resolver: zodResolver(manualClearSchema),
    defaultValues: {
      date: new Date(),
      serviceId: "",
      levelId: "",
      reasonId: "",
      comments: "",
      studentIds: [],
    },
  });

  const selectedStudentIds = form.watch("studentIds") || [];

  // Mock services and levels - replace with your actual data
  const serviceOptions = [
    { id: "morning", name: "Morning Service" },
    { id: "evening", name: "Evening Service" },
    { id: "special", name: "Special Service" },
  ];

  const levelOptions = [
    { id: "100", name: "100 Level" },
    { id: "200", name: "200 Level" },
    { id: "300", name: "300 Level" },
    { id: "400", name: "400 Level" },
    { id: "500", name: "500 Level" },
  ];

  const manualClearReasonOptions = [
    { id: "sick", reason: "Sick Leave" },
    { id: "official", reason: "Official Duty" },
    { id: "emergency", reason: "Family Emergency" },
    { id: "other", reason: "Other (Specify in Comments)" },
  ];

  // Get all students with absences (filtered by search)
  const studentsWithAbsences = useMemo(() => {
    // This will re-run when refreshKey changes
    return (students || [])
      .filter((student: any) => {
        if (!student) return false;
        const query = searchQuery.toLowerCase();
        return (
          student.first_name?.toLowerCase().includes(query) ||
          student.last_name?.toLowerCase().includes(query) ||
          student.matric_number?.toLowerCase().includes(query)
        );
      })
      .map((student: any) => {
        const absences = (attendanceRecords || []).filter(
          (r: any) =>
            r.matric_number === student.matric_number && r.status === "absent"
        );
        return { ...student, absences };
      });
  }, [searchQuery, refreshKey]);

  function handleFetchAttendance() {
    // In a real app, fetch attendance data based on date, service, and level
    const currentValues = {
      date: form.getValues("date"),
      serviceId: form.getValues("serviceId"),
      levelId: form.getValues("levelId"),
    };

    setInitialValues(currentValues);
    setShowFetchButton(false);
    toast({
      title: "Attendance Fetched",
      description: `Showing attendance for selected criteria.`,
    });
  }

  const handleClearForm = (clearSelections: boolean = true) => {
    form.reset({
      date: form.getValues("date"),
      serviceId: form.getValues("serviceId"),
      levelId: form.getValues("levelId"),
      reasonId: form.getValues("reasonId"),
      comments: "",
      studentIds: clearSelections ? [] : form.getValues("studentIds"),
    });
  };

  // Check if form values have changed from initial values
  const hasFormChanged = useMemo(() => {
    if (!initialValues) return false;

    return (
      !isSameDay(form.getValues("date"), initialValues.date) ||
      form.getValues("serviceId") !== initialValues.serviceId ||
      form.getValues("levelId") !== initialValues.levelId
    );
  }, [
    form.watch("date"),
    form.watch("serviceId"),
    form.watch("levelId"),
    initialValues,
  ]);

  const handleClearFormClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleClearForm(true);
  };

  function onSubmit(data: ManualClearFormValues) {
    if (!data.studentIds || data.studentIds.length === 0) {
      toast({
        title: "No Students Selected",
        description:
          "Please select at least one student to clear their absence.",
        variant: "destructive",
      });
      return;
    }

    console.log("Submitting:", data);

    // In a real app, you would submit this data to your API
    // For now, we'll just show a success message
    const studentCount = data.studentIds.length;
    toast({
      title: "Absence Cleared",
      description: (
        <div className="flex flex-col space-y-2">
          <p>
            Successfully cleared absence for {studentCount} student
            {studentCount > 1 ? "s" : ""}.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              setRefreshKey((prev) => prev + 1);
              handleClearForm(true);
              // The toast will be automatically replaced by the new one
            }}
          >
            Refresh List
          </Button>
        </div>
      ),
    });

    // Clear only the student selections
    handleClearForm(false);
  }

  return (
    <AppShell>
      <PageHeader
        title="Manual Student Clearance"
        description="Manually override a student's absence for a specific service."
      />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-200px)]">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-background p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CalendarDays className="h-5 w-5 mr-2" />
              Clear Absence
              {!showFetchButton && hasFormChanged && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={handleFetchAttendance}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refetch Attendance
                </Button>
              )}
            </h2>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setDate(date);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serviceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedService(value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select service" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {serviceOptions.map(
                              (service: { id: string; name: string }) => (
                                <SelectItem key={service.id} value={service.id}>
                                  {service.name}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="levelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedLevel(value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {levelOptions.map(
                              (level: { id: string; name: string }) => (
                                <SelectItem key={level.id} value={level.id}>
                                  {level.name}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {showFetchButton ? (
                  <Button
                    type="button"
                    className="w-full mt-6"
                    onClick={handleFetchAttendance}
                    disabled={!form.formState.isValid}
                  >
                    Fetch Attendance
                  </Button>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="reasonId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason for Clearance</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a reason" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {manualClearReasonOptions.map(
                                (reason: { id: string; reason: string }) => (
                                  <SelectItem key={reason.id} value={reason.id}>
                                    {reason.reason}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="comments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comments (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add any relevant notes or details here."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-4 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={handleClearFormClick}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1">
                        Clear Absence
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </Form>
          </div>
        </div>

        {/* Right Column - Absent Students List */}
        <div className="lg:col-span-3 space-y-6 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center">
                <User className="h-5 w-5 mr-2" />
                Students with Absences
              </h2>
              <p className="text-sm text-muted-foreground">
                {showFetchButton
                  ? "Select date, service, and level to view absences"
                  : `${studentsWithAbsences.length} student${
                      studentsWithAbsences.length !== 1 ? "s" : ""
                    } found`}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search students..."
                  className="pl-10 pr-4 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="px-2"
                onClick={() => {
                  setRefreshKey((prev) => prev + 1);
                  toast({
                    title: "List Refreshed",
                    description: "The student list has been updated.",
                  });
                }}
                title="Refresh list"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="px-2"
                onClick={() => {
                  handleClearForm(true);
                  toast({
                    title: "Selections Cleared",
                    description: "All student selections have been cleared.",
                  });
                }}
                disabled={selectedStudentIds.length === 0}
                title="Clear selections"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-lg">
            <div className="space-y-4">
              {!showFetchButton ? (
                studentsWithAbsences.length > 0 ? (
                  studentsWithAbsences.map((student) => (
                    <div
                      key={student.id}
                      className={`p-4 border-b cursor-pointer transition-colors flex items-center justify-between ${
                        selectedStudentIds.includes(student.id.toString())
                          ? "bg-primary/5 border-l-4 border-l-primary"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => {
                        const currentIds = form.getValues("studentIds") || [];
                        const newIds = currentIds.includes(
                          student.id.toString()
                        )
                          ? currentIds.filter(
                              (id: string) => id !== student.id.toString()
                            )
                          : [...currentIds, student.id.toString()];
                        form.setValue("studentIds", newIds);
                      }}
                    >
                      <div className="flex items-center space-x-4 w-full">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {student ? getFullName(student) : "Unknown Student"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {student?.matric_number || "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {selectedStudentIds.includes(
                            student.id.toString()
                          ) ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-lg">No students found</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {searchQuery
                        ? "No students match your search."
                        : "No absences found for the selected criteria."}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <CalendarDays className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg">Select filters</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Choose a date, service, and level to view absences
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedStudentIds.length > 0 ? (
                  <span>{selectedStudentIds.length} selected</span>
                ) : (
                  <>
                    Showing <span className="font-medium">1</span> to{" "}
                    <span className="font-medium">
                      {Math.min(10, studentsWithAbsences.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {studentsWithAbsences.length}
                    </span>{" "}
                    students
                  </>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClearForm(true)}
                  disabled={selectedStudentIds.length === 0}
                  className="mr-2"
                >
                  <X className="h-4 w-4 mr-1" /> Clear Selections
                </Button>
                <div className="flex-1" />
                <Button variant="outline" size="sm" disabled>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={studentsWithAbsences.length <= 10}
                >
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
