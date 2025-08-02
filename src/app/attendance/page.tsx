"use client";

import { useState } from 'react';
import { UploadCloud, File, X, CheckCircle, ChevronsUpDown, Check } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { students, services } from '@/lib/mock-data';
import type { Service } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ParsedRecord {
  studentId: string;
  studentName: string;
  serviceId: string;
  serviceName: string;
  status: 'matched' | 'unmatched';
}

const attendanceUploadSchema = z.object({
    serviceId: z.string({ required_error: 'Please select a service.' }),
});

type AttendanceUploadFormValues = z.infer<typeof attendanceUploadSchema>;

export default function AttendanceUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<ParsedRecord[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AttendanceUploadFormValues>({
    resolver: zodResolver(attendanceUploadSchema),
  });

  const onDrop = (acceptedFiles: File[]) => {
    const serviceId = form.getValues('serviceId');
    if (!serviceId) {
        toast({
            title: 'No Service Selected',
            description: 'Please select a service before uploading a file.',
            variant: 'destructive',
        });
        return;
    }
    const service = services.find(s => s.id === serviceId);
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
        studentId: s.student_number,
        studentName: s.full_name,
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
      disabled: !selectedService || selectedService.status === 'cancelled'
  });
  
  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter(file => file !== fileToRemove));
    if (files.length === 1) {
        setParsedData([]);
    }
  }

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      if(service.status === 'cancelled') {
        toast({
          title: 'Service Cancelled',
          description: 'This service has been cancelled. You cannot upload attendance for it.',
          variant: 'destructive'
        });
        setSelectedService(service);
      } else {
        setSelectedService(service);
      }
      form.setValue('serviceId', serviceId);
      // If a file is already uploaded, re-parse with new service context
      if(files.length > 0) {
        onDrop(files);
      }
    }
  };

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
    setSelectedService(null);
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
            <Card className="shadow-sm">
                <CardHeader>
                <CardTitle>1. Select Service</CardTitle>
                <CardDescription>Choose the service for this attendance batch.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form>
                            <FormField
                                control={form.control}
                                name="serviceId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service</FormLabel>
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
                                                        {selectedService 
                                                            ? `${selectedService.name || selectedService.type.charAt(0).toUpperCase() + selectedService.type.slice(1)} - ${new Date(selectedService.date).toLocaleDateString()}` 
                                                            : "Select a service"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search service..." />
                                                    <CommandList>
                                                        <CommandEmpty>No service found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {services.map((service) => (
                                                                <CommandItem
                                                                    value={service.id}
                                                                    key={service.id}
                                                                    onSelect={() => {
                                                                        handleServiceChange(service.id);
                                                                        setOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            service.id === field.value ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <span>
                                                                        {service.name || service.type.charAt(0).toUpperCase() + service.type.slice(1)} ({new Date(service.date).toLocaleDateString()})
                                                                        {service.status === 'cancelled' && <span className="text-destructive ml-2">(Cancelled)</span>}
                                                                    </span>
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
                        </form>
                    </Form>
                </CardContent>
            </Card>

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
                    !selectedService || selectedService.status === 'cancelled' ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary/50'
                    )}
                >
                    <input {...getInputProps()} />
                    <UploadCloud className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-center text-muted-foreground">
                    {!selectedService 
                        ? 'Please select a service first' 
                        : selectedService.status === 'cancelled' 
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
                              ID: {record.studentId}
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
                        { !selectedService ? "Select a service and upload a file to see the preview." : "Upload a file to see the preview."}
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

    