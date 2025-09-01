
"use client";

import { useState } from 'react';
import { UploadCloud, File, X, CheckCircle, ChevronsUpDown, Check, CalendarIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { students, services } from '@/lib/mock-data';
import type { Service, Student } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ParsedRecord {
  matricNumber: string;
  studentName: string;
  serviceId: string;
  serviceName: string;
  status: 'matched' | 'unmatched';
}

const attendanceUploadSchema = z.object({
    serviceId: z.string({ required_error: 'Please select a service.' }),
    date: z.date(),
});

type AttendanceUploadFormValues = z.infer<typeof attendanceUploadSchema>;

const getFullName = (student: Student) => `${student.first_name} ${student.middle_name} ${student.last_name}`;

export default function AttendanceUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<ParsedRecord[]>([]);
  const { toast } = useToast();

  const form = useForm<AttendanceUploadFormValues>({
    resolver: zodResolver(attendanceUploadSchema),
    defaultValues: {
      date: new Date(),
    }
  });

  const selectedDate = form.watch('date');
  const selectedServiceId = form.watch('serviceId');
  const selectedService = services.find(s => s.id === selectedServiceId);

  const onDrop = (acceptedFiles: File[]) => {
    if (!selectedServiceId) {
        toast({
            title: 'No Service Selected',
            description: 'Please select a service before uploading a file.',
            variant: 'destructive',
        });
        return;
    }
    const service = services.find(s => s.id === selectedServiceId);
    if (service?.status === 'cancelled') {
        toast({
            title: 'Service Cancelled',
            description: 'You cannot upload attendance for a cancelled service.',
            variant: 'destructive',
        });
        return;
    }

    setFiles(acceptedFiles);
    // Mock parsing logic
    const mockParsed: ParsedRecord[] = acceptedFiles.flatMap(f => 
      students.slice(0, 5).map((s, i) => ({
        matricNumber: s.matric_number,
        studentName: getFullName(s),
        serviceId: service!.id,
        serviceName: service!.name || service!.type,
        status: i % 4 === 0 ? 'unmatched' : 'matched',
      }))
    );
    setParsedData(mockParsed);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
      onDrop, 
      accept: {'text/csv': ['.csv'], 'application/json': ['.json']},
      disabled: !selectedServiceId || selectedService?.status === 'cancelled'
  });
  
  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter(file => file !== fileToRemove));
    if (files.length === 1) {
        setParsedData([]);
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
        form.setValue('date', date);
        form.setValue('serviceId', '');
    }
  }

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    form.setValue('serviceId', serviceId);
    if (service?.status === 'cancelled') {
        toast({
            title: 'Service Cancelled',
            description: 'You cannot upload attendance for a cancelled service.',
            variant: 'destructive',
        });
    }
    // If a file is already uploaded, re-parse with new service context
    if(files.length > 0) {
      onDrop(files);
    }
  };
  
  const servicesOnDate = selectedDate ? services.filter(service => new Date(service.date).toDateString() === selectedDate.toDateString()) : [];

  const onSubmit = () => {
    if(!selectedService) {
        toast({
            title: 'Error',
            description: 'Please select a service first.',
            variant: 'destructive'
        });
        return;
    }
    console.log({
        service_id: selectedService.id,
        records: parsedData
    });
    toast({
        title: 'Batch Ingested',
        description: `Attendance for ${selectedService.name || selectedService.type} has been confirmed.`
    });
    setFiles([]);
    setParsedData([]);
    form.reset();
  }

  return (
    <AppShell>
      <PageHeader
        title="Attendance Upload"
        description="Upload attendance data via CSV or JSON files."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
            <Form {...form}>
                <Card className="shadow-sm">
                    <CardHeader>
                    <CardTitle>1. Select Service</CardTitle>
                    <CardDescription>Choose the service for this attendance batch.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
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
                                                        variant={"outline"}
                                                        className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={handleDateChange}
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
                                            onValueChange={handleServiceChange} 
                                            value={field.value} 
                                            disabled={!selectedDate || servicesOnDate.length === 0}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a service" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {servicesOnDate.length > 0 ? (
                                                    servicesOnDate.map(service => (
                                                        <SelectItem key={service.id} value={service.id} disabled={service.status === 'cancelled'}>
                                                            {service.name || `${service.type.charAt(0).toUpperCase() + service.type.slice(1)} Service`}
                                                            {service.status === 'cancelled' && <span className="text-destructive ml-2"> (Cancelled)</span>}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="none" disabled>No services on this date</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>
            </Form>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>2. Upload File</CardTitle>
                    <CardDescription>Drag & drop or click to select a file.</CardDescription>
                </CardHeader>
                <CardContent>
                <div
                    {...getRootProps()}
                    className={cn(
                    'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                    isDragActive ? 'border-primary bg-primary/10' : 'border-muted',
                    !selectedServiceId || selectedService?.status === 'cancelled' ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary/50'
                    )}
                >
                    <input {...getInputProps()} />
                    <UploadCloud className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-center text-muted-foreground">
                    {!selectedServiceId 
                        ? 'Please select a service first' 
                        : selectedService?.status === 'cancelled' 
                        ? 'Cannot upload to a cancelled service' 
                        : isDragActive 
                        ? 'Drop the files here...' 
                        : 'Drag & drop files here, or click to select'}
                    </p>
                    <p className="text-xs text-muted-foreground">Supports: CSV, JSON</p>
                </div>
                {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Selected file:</h4>
                    {files.map(file => (
                        <div key={file.name} className="flex items-center justify-between p-2 rounded-md bg-muted">
                            <div className="flex items-center gap-2">
                                <File className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm">{file.name}</span>
                            </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(file)}>
                            <X className="h-4 w-4" />
                        </Button>
                        </div>
                    ))}
                    </div>
                )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>3. Batch Preview</CardTitle>
              <CardDescription>Review the parsed attendance records before ingesting.</CardDescription>
            </CardHeader>
            <CardContent>
              {parsedData.length > 0 && selectedService ? (
                <div className="space-y-4">
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-lg">{selectedService.name || `${selectedService.type.charAt(0).toUpperCase() + selectedService.type.slice(1)} Service`}</CardTitle>
                      <CardDescription>{new Date(selectedService.date).toLocaleString()}</CardDescription>
                    </CardHeader>
                  </Card>
                  <div className="max-h-80 overflow-auto rounded-md border">
                    <ul className="divide-y">
                      {parsedData.map((record, index) => (
                        <li key={index} className="flex items-center justify-between p-3">
                          <div>
                            <p className="font-medium">{record.studentName}</p>
                            <p className="text-sm text-muted-foreground">
                              Matric Number: {record.matricNumber}
                            </p>
                          </div>
                          {record.status === 'matched' ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="h-4 w-4" /> Matched
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <X className="h-4 w-4" /> Unmatched Scan
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {setFiles([]); setParsedData([])}}>Cancel</Button>
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={onSubmit}>
                      Confirm & Ingest Batch
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted bg-muted/50 p-8 text-center min-h-[400px]">
                    <div className="rounded-full bg-background p-3">
                      <File className="size-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                        { !selectedServiceId ? "Select a service and upload a file to see the preview." : "Upload a file to see the preview."}
                    </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}