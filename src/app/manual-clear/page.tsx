
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ChevronsUpDown } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { students, services, manualClearReasons, attendanceRecords } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import type { Student } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';


const manualClearSchema = z.object({
  matricNumber: z.string({ required_error: 'Please select a student.' }),
  serviceId: z.string({ required_error: 'Please select a service.' }),
  reasonId: z.string({ required_error: 'Please select a reason.' }),
  comments: z.string().optional(),
});

type ManualClearFormValues = z.infer<typeof manualClearSchema>;

const getFullName = (student: Student) => `${student.first_name} ${student.middle_name} ${student.last_name}`;

export default function ManualClearPage() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ManualClearFormValues>({
    resolver: zodResolver(manualClearSchema),
  });
  
  const selectedMatricNumber = form.watch('matricNumber');

  const absentServices = attendanceRecords.filter(r => r.matric_number === selectedMatricNumber && r.status === 'absent');

  function onSubmit(data: ManualClearFormValues) {
    console.log(data);
    toast({
      title: "Absence Cleared",
      description: `The student's absence has been manually cleared.`,
    });
    form.reset();
  }

  return (
    <AppShell>
      <PageHeader
        title="Manual Student Clearance"
        description="Manually override a student's absence for a specific service."
      />
      <Card className="shadow-sm max-w-2xl mx-auto">
        <CardHeader>
            <CardTitle>Clearance Form</CardTitle>
            <CardDescription>Select a student, service, and reason to clear an absence.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="matricNumber"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Student</FormLabel>
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                        "w-full justify-between",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value
                                        ? getFullName(students.find(
                                            (student) => student.matric_number === field.value
                                        )!)
                                        : "Select student"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search student..." />
                                    <CommandList>
                                    <CommandEmpty>No student found.</CommandEmpty>
                                    <CommandGroup>
                                        {students.map((student) => (
                                        <CommandItem
                                            value={getFullName(student)}
                                            key={student.id}
                                            onSelect={() => {
                                                form.setValue("matricNumber", student.matric_number);
                                                form.setValue("serviceId", ""); // Reset service on student change
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                student.matric_number === field.value
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                            />
                                            <div>
                                            <p>{getFullName(student)}</p>
                                            <p className="text-xs text-muted-foreground">{student.matric_number}</p>
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
                    <FormField
                        control={form.control}
                        name="serviceId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Absent Service</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedMatricNumber || absentServices.length === 0}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a service" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {absentServices.length > 0 ? (
                                        absentServices.map(record => (
                                            <SelectItem key={record.service_id} value={record.service_id}>
                                                {record.service_name} ({new Date(record.scanned_at).toLocaleDateString()})
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>
                                            {selectedMatricNumber ? "No recorded absences" : "Select a student first"}
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
                        name="reasonId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Reason for Clearance</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a reason" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {manualClearReasons.map(reason => (
                                        <SelectItem key={reason.id} value={reason.id}>
                                            {reason.reason}
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
                    <div className="flex justify-end">
                        <Button type="submit">Clear Absence</Button>
                    </div>
                </form>
            </Form>
        </CardContent>
      </Card>
    </AppShell>
  );
}

