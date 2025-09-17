"use client";

import React, { useState, useCallback, useMemo } from "react";
import Papa from "papaparse";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CalendarIcon, UploadCloud, CheckCircle2, XCircle } from "lucide-react";
import { useLevels } from "@/hooks/useLevels";
import {
  useAttendanceServices,
  useAttendanceStudents,
} from "@/hooks/useAttendanceData";
import type { ServiceItem, StudentLite } from "@/hooks/useAttendanceData";

const uploadFormSchema = z.object({
  date: z.date({
    required_error: "Please select a date.",
  }),
  serviceId: z.string().min(1, "Please select a service."),
  levelId: z.string().min(1, "Please select a level."),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

export interface UploadState {
  uploadId?: string;
  status:
    | "idle"
    | "uploading"
    | "processing"
    | "preview"
    | "confirming"
    | "completed"
    | "error";
  error?: string;
  preview?: {
    matched: any[];
    unmatched: any[];
    summary: {
      total_records: number;
      matched_count: number;
      unmatched_count: number;
    };
  };
}

interface AttendanceUploadFormProps {
  uploadState: UploadState;
  onUploadStateChange: (state: UploadState) => void;
  onFileUpload: (
    file: File,
    serviceId: string,
    levelId: string
  ) => Promise<void>;
  onConfirmUpload: () => Promise<void>;
}

export function AttendanceUploadForm({
  uploadState,
  onUploadStateChange,
  onFileUpload,
  onConfirmUpload,
}: AttendanceUploadFormProps) {
  const { toast } = useToast();
  const { data: dbLevels } = useLevels();
  const [file, setFile] = useState<File | null>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      date: undefined,
      serviceId: "",
      levelId: "",
    },
  });

  const watchedDate = form.watch("date");
  const watchedServiceId = form.watch("serviceId");
  const watchedLevelId = form.watch("levelId");

  // Fetch services for selected date
  const { data: services = [], isLoading: isLoadingServices } =
    useAttendanceServices({
      service_date: watchedDate ? format(watchedDate, "yyyy-MM-dd") : undefined,
      status: ["scheduled", "active"],
    });

  // Fetch students for selected service and level
  const { data: students = [], isLoading: isLoadingStudents } =
    useAttendanceStudents({
      service_id: watchedServiceId || undefined,
      level_id: watchedLevelId || undefined,
    });

  const selectedService = useMemo(
    () => services.find((s) => s.id === watchedServiceId),
    [services, watchedServiceId]
  );

  const availableLevels = useMemo(() => {
    if (!selectedService || !dbLevels) return [];
    return dbLevels.filter((level) =>
      selectedService.levels.some(
        (serviceLevel) => serviceLevel.id === level.id
      )
    );
  }, [selectedService, dbLevels]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        onUploadStateChange({ status: "idle" });
      }
    },
    [onUploadStateChange]
  );

  const handleUpload = useCallback(async () => {
    if (!file || !watchedServiceId || !watchedLevelId) {
      toast({
        title: "Missing Information",
        description:
          "Please select a file, service, and level before uploading.",
        variant: "destructive",
      });
      return;
    }

    try {
      await onFileUpload(file, watchedServiceId, watchedLevelId);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  }, [file, watchedServiceId, watchedLevelId, onFileUpload, toast]);

  const handleConfirm = useCallback(async () => {
    try {
      await onConfirmUpload();
      setFile(null);
      form.reset();
    } catch (error) {
      console.error("Confirm failed:", error);
    }
  }, [onConfirmUpload, form]);

  const canUpload =
    file && watchedServiceId && watchedLevelId && uploadState.status === "idle";

  const canConfirm = uploadState.status === "preview" && uploadState.preview;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Attendance Data</CardTitle>
        <CardDescription>
          Select a service and level, then upload a CSV file with attendance
          records.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Service Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
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
                          date < new Date("1900-01-01") ||
                          date > new Date("2100-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!watchedDate || isLoadingServices}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !watchedDate
                              ? "Select date first"
                              : isLoadingServices
                              ? "Loading services..."
                              : "Select service"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name ||
                            (service.service_type === "devotion"
                              ? `${
                                  service.devotion_type === "evening"
                                    ? "Evening"
                                    : "Morning"
                                } Devotion`
                              : "Special Service")}
                        </SelectItem>
                      ))}
                      {services.length === 0 && !isLoadingServices && (
                        <SelectItem value="no-services" disabled>
                          No services available
                        </SelectItem>
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
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!watchedServiceId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !watchedServiceId
                              ? "Select service first"
                              : "Select level"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableLevels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.code} - {level.name}
                        </SelectItem>
                      ))}
                      {availableLevels.length === 0 && watchedServiceId && (
                        <SelectItem value="no-levels" disabled>
                          No levels available for this service
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>

        {/* File Upload Section */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="file-upload"
              className="block text-sm font-medium mb-2"
            >
              Attendance File (CSV)
            </label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={
                uploadState.status === "uploading" ||
                uploadState.status === "processing"
              }
            />
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UploadCloud className="h-4 w-4" />
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        {/* Upload Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!canUpload || uploadState.status === "uploading"}
            className="flex-1"
          >
            {uploadState.status === "uploading"
              ? "Uploading..."
              : "Upload & Preview"}
          </Button>

          {canConfirm && (
            <Button
              onClick={handleConfirm}
              disabled={uploadState.status === "confirming"}
              variant="default"
              className="flex-1"
            >
              {uploadState.status === "confirming"
                ? "Confirming..."
                : "Confirm Upload"}
            </Button>
          )}
        </div>

        {/* Upload Status */}
        {uploadState.status === "error" && uploadState.error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              {uploadState.error}
            </span>
          </div>
        )}

        {uploadState.status === "completed" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">
              Attendance data uploaded successfully!
            </span>
          </div>
        )}

        {/* Preview Summary */}
        {uploadState.preview && (
          <div className="space-y-4">
            <h4 className="font-medium">Upload Preview</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {uploadState.preview.summary.total_records}
                </div>
                <div className="text-muted-foreground">Total Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {uploadState.preview.summary.matched_count}
                </div>
                <div className="text-muted-foreground">Matched</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {uploadState.preview.summary.unmatched_count}
                </div>
                <div className="text-muted-foreground">Issues</div>
              </div>
            </div>

            {/* Issues Table */}
            {uploadState.preview.unmatched &&
              uploadState.preview.unmatched.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium text-orange-600">
                    Issues Found ({uploadState.preview.unmatched.length})
                  </h5>
                  <div className="border rounded-md">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-medium">
                              Unique ID
                            </th>
                            <th className="text-left p-2 font-medium">Level</th>
                            <th className="text-left p-2 font-medium">Issue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadState.preview.unmatched.map((issue, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2 font-mono text-xs">
                                {issue.unique_id || "N/A"}
                              </td>
                              <td className="p-2">{issue.level || "N/A"}</td>
                              <td className="p-2 text-orange-700">
                                {issue.reason}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Review these issues before confirming the upload. Only
                    matched records will be processed.
                  </p>
                </div>
              )}

            {uploadState.preview.unmatched &&
              uploadState.preview.unmatched.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    All records matched successfully! No issues found.
                  </span>
                </div>
              )}
          </div>
        )}

        {/* Student Count Info */}
        {students.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {students.length} students registered for this service and level.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
