"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isSameDay } from "date-fns";
import { useGlobalContext } from "@/contexts/GlobalContext";
import {
  Check,
  ChevronRight,
  User as UserIcon,
  Calendar as CalendarIcon,
  CalendarDays,
  Search,
  RefreshCw,
  X,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToastExt } from "@/hooks/useToastExt";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Import your hooks following established patterns
import {
  useServicesByDate,
  useAbsentStudents,
  useClearStudents,
  type AbsentStudent,
} from "@/hooks/useManualClearance";
import { useOverrideReasons } from "@/hooks/useOverrideReasons";
import { useLevels } from "@/hooks/useLevels";
import { useQueryClient } from "@tanstack/react-query";

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
  studentIds: z.array(z.string()).default([]),
});

type ManualClearFormValues = z.infer<typeof manualClearSchema>;

function ManualClearPageContent() {
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToastExt();
  const { user: currentUser } = useGlobalContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [showStudentsList, setShowStudentsList] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMatricNumbers, setSelectedMatricNumbers] = useState<string[]>(
    []
  );
  const [fetchCriteria, setFetchCriteria] = useState<{
    date: string;
    serviceId: string;
    levelId: string;
  } | null>(null);

  // Pagination settings
  const ITEMS_PER_PAGE = 10;

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

  const selectedDate = form.watch("date");

  // Fetch levels using your established pattern
  const {
    data: levels,
    isLoading: levelsLoading,
    isError: levelsError,
  } = useLevels();

  // Fetch services for the selected date
  const servicesQuery = useServicesByDate(
    selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""
  );

  // Fetch absent students only when fetch criteria is set
  const studentsQuery = useAbsentStudents(
    fetchCriteria?.serviceId || "",
    fetchCriteria?.levelId || "",
    fetchCriteria?.date || ""
  );

  // Debug: Log the actual data received
  useEffect(() => {
    if (studentsQuery.data) {
      console.log("Students data received:", studentsQuery.data);
      console.log("First student:", studentsQuery.data[0]);
    }
  }, [studentsQuery.data]);

  // Fetch override reasons following your pattern
  const {
    overrideReasons,
    isLoading: reasonsLoading,
    isError: reasonsError,
  } = useOverrideReasons(true);

  // Clear students mutation
  const clearStudentsMutation = useClearStudents();

  // Filtered students based on search query
  const filteredStudents = useMemo(() => {
    const students = studentsQuery.data || [];
    if (!searchQuery.trim()) return students;

    const query = searchQuery.toLowerCase();
    return students.filter(
      (student: AbsentStudent) =>
        student.student_name?.toLowerCase().includes(query) ||
        student.matric_number?.toLowerCase().includes(query)
    );
  }, [studentsQuery.data, searchQuery]);

  // Paginated students
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage]);

  // Pagination info
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Reset pagination when search or data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, studentsQuery.data]);

  // Show error notifications following your pattern
  useEffect(() => {
    if (servicesQuery.error) {
      showError(
        "Error Loading Services",
        "Failed to load services for the selected date."
      );
    }
  }, [servicesQuery.error, showError]);

  useEffect(() => {
    if (studentsQuery.error) {
      showError("Error Loading Students", "Failed to load absent students.");
    }
  }, [studentsQuery.error, showError]);

  useEffect(() => {
    if (reasonsError) {
      showError("Error Loading Reasons", "Failed to load override reasons.");
    }
  }, [reasonsError, showError]);

  useEffect(() => {
    if (levelsError) {
      showError("Error Loading Levels", "Failed to load level information.");
    }
  }, [levelsError, showError]);

  function handleFetchAttendance() {
    const currentValues = form.getValues();

    if (
      !currentValues.date ||
      !currentValues.serviceId ||
      !currentValues.levelId
    ) {
      showError(
        "Missing Information",
        "Please select date, service, and level."
      );
      return;
    }

    const criteria = {
      date: format(currentValues.date, "yyyy-MM-dd"),
      serviceId: currentValues.serviceId,
      levelId: currentValues.levelId,
    };

    setFetchCriteria(criteria);
    setShowStudentsList(true);
    setCurrentPage(1);
    setSelectedMatricNumbers([]);
    form.setValue("studentIds", []);

    showSuccess(
      "Attendance Fetched",
      "Showing attendance for selected criteria."
    );
  }

  const handleResetForm = () => {
    form.reset({
      date: new Date(),
      serviceId: "",
      levelId: "",
      reasonId: "",
      comments: "",
      studentIds: [],
    });
    setFetchCriteria(null);
    setShowStudentsList(false);
    setSelectedMatricNumbers([]);
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleClearSelections = () => {
    setSelectedMatricNumbers([]);
    form.setValue("studentIds", []);
  };

  // Fixed student selection handler
  const handleStudentToggle = (matricNumber: string) => {
    setSelectedMatricNumbers((prev) => {
      const newIds = prev.includes(matricNumber)
        ? prev.filter((id) => id !== matricNumber)
        : [...prev, matricNumber];

      form.setValue("studentIds", newIds, { shouldValidate: true });
      return newIds;
    });
  };

  async function onSubmit(data: ManualClearFormValues) {
    if (!currentUser) {
      showError(
        "Authentication Required",
        "Please log in to perform this action."
      );
      return;
    }

    if (!data.studentIds || data.studentIds.length === 0) {
      showError(
        "No Students Selected",
        "Please select at least one student to clear their absence."
      );
      return;
    }

    // Find the selected reason to check if it requires a note
    const selectedReason = overrideReasons.find((r) => r.id === data.reasonId);
    if (selectedReason?.requires_note && !data.comments?.trim()) {
      showError(
        "Comments Required",
        "This reason requires additional comments. Please provide details."
      );
      return;
    }

    try {
      // Map form data to the expected API format
      const clearanceData = {
        studentIds: data.studentIds, // These will be matric numbers now
        serviceId: data.serviceId,
        level: data.levelId,
        date: format(data.date, "yyyy-MM-dd"),
        reasonId: data.reasonId,
        clearedBy: currentUser.id,
        comments: data.comments,
      };

      await clearStudentsMutation.mutateAsync(clearanceData);

      // Refresh the student list after successful clearance
      studentsQuery.refetch();

      // Clear selections and reset form fields
      setSelectedMatricNumbers([]);
      form.setValue("studentIds", []);
      form.setValue("reasonId", "");
      form.setValue("comments", "");

      showSuccess(
        "Absence Cleared",
        `Successfully cleared absence for ${data.studentIds.length} student${
          data.studentIds.length > 1 ? "s" : ""
        }.`
      );
    } catch (error) {
      // Error handling is managed by the mutation hook
      console.error("Clearance error:", error);
    }
  }

  // Helper function to get level name from ID
  const getLevelName = (levelId: string) => {
    const level = levels.find((l) => l.id === levelId);
    return level
      ? level.name || `${level.code} Level`
      : `Level ${levelId.substring(0, 8)}...`;
  };

  // Form validation for fetch button
  const canFetchAttendance =
    selectedDate && form.watch("serviceId") && form.watch("levelId");

  // Get selected level name for display
  const selectedLevel = levels.find(
    (level) => level.id === form.watch("levelId")
  );
  const selectedService = servicesQuery.data?.find(
    (service) => service.id === form.watch("serviceId")
  );

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <CalendarDays className="h-5 w-5 mr-2" />
                Clear Absence
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetForm}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Form
              </Button>
            </div>

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
                            onSelect={field.onChange}
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
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={servicesQuery.isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  servicesQuery.isLoading
                                    ? "Loading..."
                                    : "Select service"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(servicesQuery.data || []).map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name}
                              </SelectItem>
                            ))}
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
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={levelsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  levelsLoading ? "Loading..." : "Select level"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {levels.map((level) => (
                              <SelectItem key={level.id} value={level.id}>
                                {level.name || `${level.code} Level`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!showStudentsList ? (
                  <Button
                    type="button"
                    className="w-full mt-6"
                    onClick={handleFetchAttendance}
                    disabled={!canFetchAttendance}
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
                            disabled={reasonsLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    reasonsLoading
                                      ? "Loading..."
                                      : "Select a reason"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {overrideReasons.map((reason) => (
                                <SelectItem key={reason.id} value={reason.id}>
                                  {reason.display_name}
                                  {reason.requires_note && " *"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="comments"
                      render={({ field }) => {
                        const selectedReason = overrideReasons.find(
                          (r) => r.id === form.watch("reasonId")
                        );
                        const isRequired = selectedReason?.requires_note;

                        return (
                          <FormItem>
                            <FormLabel>
                              Comments {isRequired ? "*" : "(Optional)"}
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={
                                  isRequired
                                    ? "Please provide details (required for this reason)"
                                    : "Add any relevant notes or details here."
                                }
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                            {isRequired && (
                              <p className="text-xs text-muted-foreground">
                                * Required for the selected reason
                              </p>
                            )}
                          </FormItem>
                        );
                      }}
                    />

                    <div className="flex space-x-4 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={handleClearSelections}
                      >
                        Clear Selections
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={
                          clearStudentsMutation.isPending ||
                          selectedMatricNumbers.length === 0
                        }
                      >
                        {clearStudentsMutation.isPending
                          ? "Clearing..."
                          : `Clear ${selectedMatricNumbers.length} Student${
                              selectedMatricNumbers.length !== 1 ? "s" : ""
                            }`}
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
                <UserIcon className="h-5 w-5 mr-2" />
                Students with Absences
              </h2>
              <p className="text-sm text-muted-foreground">
                {!showStudentsList
                  ? "Select date, service, and level to view absences"
                  : studentsQuery.isLoading
                  ? "Loading students..."
                  : `${filteredStudents.length} student${
                      filteredStudents.length !== 1 ? "s" : ""
                    } found`}
              </p>
              {showStudentsList && selectedService && selectedLevel && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedService.name} •{" "}
                  {selectedLevel.name || selectedLevel.code} Level •{" "}
                  {format(selectedDate!, "MMM dd, yyyy")}
                </p>
              )}
            </div>

            {showStudentsList && (
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
                    // Reset the absent students query to initial state
                    queryClient.resetQueries({
                      queryKey: ["manual-clearance", "absentees"],
                    });
                    setSearchQuery("");
                    setCurrentPage(1);
                    setSelectedMatricNumbers([]);
                  }}
                  disabled={studentsQuery.isLoading}
                  title="Reset list"
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4",
                      studentsQuery.isLoading && "animate-spin"
                    )}
                  />
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto border rounded-lg">
            {!showStudentsList ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <CalendarDays className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg">Select filters</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Choose a date, service, and level to view absences
                </p>
              </div>
            ) : studentsQuery.isLoading ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
                <h3 className="font-medium text-lg">Loading students...</h3>
              </div>
            ) : filteredStudents.length > 0 ? (
              <>
                <div className="space-y-0">
                  {paginatedStudents.map((student) => {
                    const isSelected = selectedMatricNumbers.includes(
                      student.matric_number
                    );
                    return (
                      <div
                        key={student.matric_number}
                        className={cn(
                          "p-4 border-b cursor-pointer transition-colors flex items-center justify-between hover:bg-accent/50",
                          isSelected &&
                            "bg-primary/5 border-l-4 border-l-primary"
                        )}
                        onClick={() =>
                          handleStudentToggle(student.matric_number)
                        }
                      >
                        <div className="flex items-center space-x-3 w-full">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handleStudentToggle(student.matric_number)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {student.student_name || "Unknown Student"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {student.matric_number || "No Matric Number"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                <div className="border-t px-4 py-3 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {selectedMatricNumbers.length > 0 ? (
                      <span className="font-medium text-primary">
                        {selectedMatricNumbers.length} selected
                      </span>
                    ) : (
                      <>
                        Showing{" "}
                        <span className="font-medium">
                          {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">
                          {Math.min(
                            currentPage * ITEMS_PER_PAGE,
                            filteredStudents.length
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {filteredStudents.length}
                        </span>{" "}
                        students
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {selectedMatricNumbers.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearSelections}
                      >
                        <X className="h-4 w-4 mr-1" /> Clear Selections
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={!hasPrevPage}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>

                    <span className="text-sm text-muted-foreground px-2">
                      Page {currentPage} of {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!hasNextPage}
                    >
                      Next <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <UserIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg">No students found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {searchQuery
                    ? "No students match your search."
                    : "No absences found for the selected criteria."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// Wrap with ErrorBoundary following your pattern
export default function ManualClearPage() {
  return (
    <ErrorBoundary>
      <ManualClearPageContent />
    </ErrorBoundary>
  );
}
