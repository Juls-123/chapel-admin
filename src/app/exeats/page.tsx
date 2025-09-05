
"use client";

import { useState, useMemo, useCallback } from 'react';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';

import { ExeatTable } from './data-table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useExeats } from '@/hooks/useExeats';
import { useStudents } from '@/hooks/useStudents';
import { ErrorState, EmptyState, LoadingState } from '@/components/ui-states';
import type { Student } from '@/lib/types';

const exeatFormSchema = z.object({
  student_id: z.string({ required_error: 'Please select a student.' }),
  startDate: z.date({ required_error: 'A start date is required.' }),
  endDate: z.date({ required_error: 'An end date is required.' }),
  reason: z.string().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date cannot be before start date.',
  path: ['endDate'],
});

type ExeatFormValues = z.infer<typeof exeatFormSchema>;

const getFullName = (student: Student) => `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim();

export default function ExeatManagerPage() {
  const [open, setOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: undefined as 'active' | 'ended' | 'canceled' | undefined,
  });
  
  const { toast } = useToast();
  
  // Fetch exeats data
  const { 
    exeats, 
    pagination, 
    isLoading: exeatsLoading, 
    error: exeatsError, 
    refetch: refetchExeats,
    createExeat,
    isCreating 
  } = useExeats(filters);

  // Fetch students for the dropdown
  const { 
    students, 
    isLoading: studentsLoading, 
    error: studentsError 
  } = useStudents({ 
    limit: 1000, // Get all students for dropdown
    status: 'active' 
  });
  
  const form = useForm<ExeatFormValues>({
    resolver: zodResolver(exeatFormSchema),
  });

  const onSubmit = useCallback((data: ExeatFormValues) => {
    const exeatData = {
      student_id: data.student_id,
      start_date: data.startDate.toISOString().split('T')[0],
      end_date: data.endDate.toISOString().split('T')[0],
      reason: data.reason,
    };

    createExeat(exeatData, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  }, [createExeat, form]);

  // Memoize callback functions to prevent infinite re-renders
  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const handleSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  }, []);

  const handleStatusFilter = useCallback((status: 'active' | 'ended' | 'canceled' | undefined) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  }, []);

  // Handle loading and error states
  if (exeatsError) {
    return (
      <AppShell>
        <PageHeader
          title="Exeat Manager"
          description="Manage student exeats and absences."
        />
        <ErrorState 
          message={exeatsError.message || 'An error occurred while loading exeats'}
          action={
            <Button onClick={() => refetchExeats()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Exeat Manager"
        description="Manage student exeats and absences."
      >
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetchExeats()}
            disabled={exeatsLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", exeatsLoading && "animate-spin")} />
            Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Exeat
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Exeat</DialogTitle>
                <DialogDescription>
                  Grant permission for a student to miss chapel services.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="student_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Student</FormLabel>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={studentsLoading}
                              >
                                {field.value && students
                                  ? (() => {
                                      const student = students.find(s => s.id === field.value);
                                      return student ? getFullName(student) : "Select student";
                                    })()
                                  : studentsLoading ? "Loading students..." : "Select student"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search students..." />
                              <CommandList>
                                <CommandEmpty>
                                  {studentsLoading ? "Loading..." : "No student found."}
                                </CommandEmpty>
                                <CommandGroup>
                                  {students?.map((student) => (
                                    <CommandItem
                                      value={getFullName(student)}
                                      key={student.id}
                                      onSelect={() => {
                                        form.setValue("student_id", student.id);
                                        setComboboxOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          student.id === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{getFullName(student)}</span>
                                        <span className="text-sm text-muted-foreground">
                                          {student.matric_number}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
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
                                  date < new Date() || date < new Date("1900-01-01")
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
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
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
                                  date < new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter reason for exeat..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide additional context for this exeat request.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Exeat"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>
      
      <div className="space-y-4">
        {exeatsLoading ? (
          <LoadingState />
        ) : !exeats || exeats.length === 0 ? (
          <EmptyState
            message="No exeats have been created yet. Create your first exeat to get started."
            action={
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create First Exeat
                  </Button>
                </DialogTrigger>
              </Dialog>
            }
          />
        ) : (
          <ExeatTable 
            data={exeats} 
            pagination={pagination}
            onPageChange={handlePageChange}
            onSearch={handleSearch}
            onStatusFilter={handleStatusFilter}
          />
        )}
      </div>
    </AppShell>
  );
}
