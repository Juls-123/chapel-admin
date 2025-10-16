"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ServiceTable } from "@/components/ServiceTable";
import {
  useServices,
  type Service,
  type CreateServiceData,
  type UpdateServiceData,
} from "@/hooks/useServices";
import { useLevels } from "@/hooks/useLevels";
import { cn } from "@/lib/utils";

const serviceFormSchema = z
  .object({
    service_type: z.enum(["devotion", "special", "seminar"], {
      required_error: "Please select a service type.",
    }),
    devotion_type: z.enum(["morning", "evening"]).optional(),
    name: z.string().optional(),
    date: z.date({ required_error: "A service date is required." }),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "Please enter a valid time in HH:mm format.",
    }),
    applicable_levels: z.array(z.string()).min(1, {
      message: "At least one level must be selected.",
    }),
    gender_constraint: z.enum(["male", "female", "both"], {
      required_error: "Please select a gender constraint.",
    }),
  })
  .refine(
    (data) => {
      if (data.service_type === "devotion") {
        return !!data.devotion_type;
      }
      return true;
    },
    {
      message: "Devotion type is required for devotion services.",
      path: ["devotion_type"],
    }
  )
  .refine(
    (data) => {
      if (data.service_type === "special" || data.service_type === "seminar") {
        return !!data.name && data.name.length > 0;
      }
      return true;
    },
    {
      message: "A name is required for special and seminar services.",
      path: ["name"],
    }
  );

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function ServiceManagementPage() {
  const [open, setOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const { toast } = useToast();
  const { data: levels = [] } = useLevels();

  const {
    services,
    isLoading,
    createService,
    updateService,
    deleteService,
    toggleLock,
    markCompleted,
    refetch,
  } = useServices();

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      service_type: "devotion",
      devotion_type: "morning",
      name: "",
      date: new Date(),
      time: "07:00",
      applicable_levels: [],
      gender_constraint: "both",
    },
  });

  const router = useRouter();

  const handleCreate = () => {
    setEditingService(null);
    form.reset({
      service_type: "devotion",
      devotion_type: "morning",
      name: "",
      date: new Date(),
      time: "07:00",
      applicable_levels: [],
      gender_constraint: "both",
    });
    setOpen(true);
  };

  const handleEdit = (service: Service) => {
    // DEBUG: Log the service data being edited
    console.log("📝 Editing Service - Full Data:", {
      id: service.id,
      name: service.name,
      type: service.type,
      applicable_levels: service.applicable_levels,
      levels: service.levels,
      allServiceData: service,
    });

    setEditingService(service);

    // Enhanced levels handling with debug
    const rawLevels = service.applicable_levels?.length
      ? service.applicable_levels
      : service.levels || [];

    console.log("📝 Raw levels from service:", rawLevels);

    // Normalize levels to always be an array of strings (IDs only)
    const normalizedLevels = rawLevels
      .map((level: any) => {
        // If it's an object with an id property, extract the id
        if (typeof level === "object" && level !== null && "id" in level) {
          console.log("📝 Converting object to ID:", level.id);
          return level.id;
        }
        // If it's already a string, use it as is
        if (typeof level === "string") {
          console.log("📝 Already a string ID:", level);
          return level;
        }
        console.warn("📝 Unexpected level format:", level);
        return null;
      })
      .filter(Boolean); // Remove any null values

    console.log("📝 Normalized levels (strings only):", normalizedLevels);

    // Convert service data to form format
    const formData: ServiceFormValues = {
      service_type:
        service.type === "morning" || service.type === "evening"
          ? "devotion"
          : (service.type as "special" | "seminar"),
      devotion_type:
        service.type === "morning" || service.type === "evening"
          ? service.type
          : undefined,
      name: service.name || "",
      date: new Date(service.date),
      time: format(new Date(service.date), "HH:mm"),
      applicable_levels: normalizedLevels,
      gender_constraint: "both",
    };

    console.log("📝 Form data being reset with:", formData);

    form.reset(formData);

    // DEBUG: Check form state after reset
    setTimeout(() => {
      console.log("📝 Form state after reset:", {
        values: form.getValues(),
        errors: form.formState.errors,
      });
    }, 100);

    setOpen(true);
  };

  const handleStatusChange = async (
    serviceId: string,
    status: Service["status"]
  ) => {
    try {
      if (status === "canceled") {
        await deleteService(serviceId);
      } else if (status === "completed") {
        await markCompleted(serviceId);
      }
      toast({
        title: "Success",
        description: `Service ${status} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${status} service`,
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleViewAttendance = (service: Service) => {
    router.push(`/services/${service.id}/attendance`);
  };

  const handleToggleLock = async (serviceId: string) => {
    try {
      await toggleLock(serviceId);
      toast({
        title: "Success",
        description: "Service lock status updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lock status",
        variant: "destructive",
      });
    }
  };

  const handleMarkCompleted = async (serviceId: string) => {
    try {
      await markCompleted(serviceId);
      toast({
        title: "Success",
        description: "Service marked as completed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark service as completed",
        variant: "destructive",
      });
    }
  };

  const handleCopyServiceId = (serviceId: string) => {
    navigator.clipboard.writeText(serviceId);
    toast({
      title: "Copied",
      description: "Service ID copied to clipboard",
    });
  };

  const onSubmit = async (values: ServiceFormValues) => {
    try {
      const serviceData: CreateServiceData = {
        service_type: values.service_type,
        devotion_type: values.devotion_type,
        name:
          values.name ||
          (values.service_type === "devotion"
            ? `${
                values.devotion_type === "morning" ? "Morning" : "Evening"
              } Devotion`
            : ""),
        date: format(values.date, "yyyy-MM-dd"),
        time: values.time,
        applicable_levels: values.applicable_levels,
        gender_constraint: values.gender_constraint,
      };

      if (editingService) {
        await updateService({
          id: editingService.id,
          data: serviceData as UpdateServiceData,
        });
        toast({
          title: "Success",
          description: "Service updated successfully",
        });
      } else {
        await createService(serviceData);
        toast({
          title: "Success",
          description: "Service created successfully",
        });
      }
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: editingService
          ? "Failed to update service"
          : "Failed to create service",
        variant: "destructive",
      });
    }
  };

  // Filter services by selected date
  const filteredServices = services;

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading services...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Service Management"
        description="View, create, and manage all chapel services including canceled ones, organized by date."
      >
        <div className="flex gap-2">
          <Button onClick={handleCreate}>
            <PlusCircle />
            Create Service
          </Button>
        </div>
      </PageHeader>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Create New Service"}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? "Update the service details below."
                : "Fill in the details to create a new service."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="service_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="devotion">Devotion</SelectItem>
                        <SelectItem value="special">Special Service</SelectItem>
                        <SelectItem value="seminar">Seminar</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("service_type") === "devotion" && (
                <FormField
                  control={form.control}
                  name="devotion_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Devotion Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select devotion type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="morning">Morning</SelectItem>
                          <SelectItem value="evening">Evening</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(form.watch("service_type") === "special" ||
                form.watch("service_type") === "seminar") && (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            form.watch("service_type") === "special"
                              ? "e.g. Founder's Day"
                              : "e.g. Leadership Seminar"
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
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
                              date < new Date(new Date().setHours(0, 0, 0, 0))
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
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" placeholder="HH:mm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="applicable_levels"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">
                        Applicable Levels
                      </FormLabel>
                      <FormDescription>
                        Select which student levels this service applies to.
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {levels.map((level) => (
                        <FormField
                          key={level.id}
                          control={form.control}
                          name="applicable_levels"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={level.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(level.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            level.id,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== level.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {level.name} ({level.code})
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender_constraint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender Constraint</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender constraint" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="both">Both</SelectItem>
                        <SelectItem value="male">Male Only</SelectItem>
                        <SelectItem value="female">Female Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingService ? "Update Service" : "Create Service"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <ServiceTable
          services={filteredServices}
          onEdit={handleEdit}
          onStatusChange={handleStatusChange}
          onRefresh={handleRefresh}
          onViewAttendance={handleViewAttendance}
          onToggleLock={handleToggleLock}
          onMarkCompleted={handleMarkCompleted}
          onCopyServiceId={handleCopyServiceId}
        />
      </div>
    </AppShell>
  );
}
