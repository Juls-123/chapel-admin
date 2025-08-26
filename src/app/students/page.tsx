
"use client";

import { useState } from 'react';
import { PlusCircle, UploadCloud, File, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { students } from '@/lib/mock-data';
import { StudentTable } from './data-table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Student } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const studentFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  middleName: z.string().min(1, 'Middle name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  matricNumber: z.string().min(1, 'Matriculation number is required.'),
  email: z.string().email('Invalid email address.'),
  parentsEmail: z.string().email('Invalid email address.'),
  level: z.coerce.number().min(100).max(500),
  parentsPhoneNumber: z.string().min(10, 'Please enter a valid phone number.'),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface ParsedStudent {
  matricNumber: string;
  fullName: string; // Keep for preview, can be constructed
  email: string;
  level: number;
  parents_phone_number: string;
  parents_email: string;
}

export default function StudentManagementPage() {
    const [open, setOpen] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
    const { toast } = useToast();
    
    const form = useForm<StudentFormValues>({
        resolver: zodResolver(studentFormSchema),
    });

    const onDrop = (acceptedFiles: File[]) => {
      setFiles(acceptedFiles);
      // Mock parsing logic
      const mockParsed: ParsedStudent[] = acceptedFiles.flatMap(f => 
        [...Array(5)].map((_, i) => ({
          matricNumber: `NEW-STU-00${i + 1}`,
          fullName: `New Student ${i + 1}`,
          email: `new.student${i+1}@example.com`,
          level: 100,
          parents_phone_number: '08012345678',
          parents_email: `parent.new${i+1}@example.com`,
        }))
      );
      setParsedData(mockParsed);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {'text/csv': ['.csv']} });

    const removeFile = (fileToRemove: File) => {
        setFiles(files.filter(file => file !== fileToRemove));
        if (files.length === 1) {
            setParsedData([]);
        }
    }

    const onIndividualSubmit = (data: StudentFormValues) => {
        console.log("Creating student:", data);
        toast({
            title: "Student Added",
            description: `${data.firstName} ${data.lastName} has been successfully registered.`,
        });
        setOpen(false);
        form.reset();
    }

    const onBulkSubmit = () => {
        console.log("Registering students:", parsedData);
        toast({
            title: 'Batch Registered',
            description: `${parsedData.length} new students have been registered.`
        });
        setFiles([]);
        setParsedData([]);
    }

  return (
    <AppShell>
      <PageHeader
        title="Student Management"
        description="Add, view, and manage all registered students."
      >
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle />
                    Add Student
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                    <DialogDescription>Manually register a single student.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onIndividualSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-1">
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. John" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="middleName"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-1">
                                        <FormLabel>Middle Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Chukwudi" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-1">
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                              control={form.control}
                              name="matricNumber"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Matriculation Number</FormLabel>
                                      <FormControl>
                                          <Input placeholder="e.g. STU-123" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name="level"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Level</FormLabel>
                                  <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                                      <FormControl>
                                          <SelectTrigger>
                                              <SelectValue placeholder="Select a level" />
                                          </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                          <SelectItem value="100">100 Level</SelectItem>
                                          <SelectItem value="200">200 Level</SelectItem>
                                          <SelectItem value="300">300 Level</SelectItem>
                                          <SelectItem value="400">400 Level</SelectItem>
                                          <SelectItem value="500">500 Level</SelectItem>
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                        </div>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Student Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="e.g. john.doe@mtu.edu.ng" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <FormField
                            control={form.control}
                            name="parentsEmail"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Parent's Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="e.g. parent@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                          />
                         <FormField
                            control={form.control}
                            name="parentsPhoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Parent's Phone Number</FormLabel>
                                    <FormControl>
                                        <Input type="tel" placeholder="e.g. 08012345678" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Add Student</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Bulk Registration</CardTitle>
                    <CardDescription>Upload a CSV file to register multiple students at once.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div
                        {...getRootProps()}
                        className={cn(
                        'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                        isDragActive ? 'border-primary bg-primary/10' : 'border-muted',
                        'hover:border-primary/50'
                        )}
                    >
                        <input {...getInputProps()} />
                        <UploadCloud className="h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-center text-muted-foreground">
                            {isDragActive ? 'Drop the file here...' : 'Drag & drop a CSV file, or click to select'}
                        </p>
                    </div>
                    {files.length > 0 && (
                        <div className="space-y-2">
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
                    {parsedData.length > 0 && (
                         <div>
                            <h4 className="font-medium mb-2">File Preview:</h4>
                            <div className="max-h-40 overflow-auto rounded-md border">
                                <ul className="divide-y">
                                {parsedData.map((student, index) => (
                                    <li key={index} className="p-2 text-sm">
                                        <p className="font-medium">{student.fullName}</p>
                                        <p className="text-muted-foreground">{student.matricNumber} - {student.email}</p>
                                    </li>
                                ))}
                                </ul>
                            </div>
                            <Button className="w-full mt-4" onClick={onBulkSubmit}>Register {parsedData.length} Students</Button>
                         </div>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-3">
             <StudentTable data={students} />
        </div>
      </div>
    </AppShell>
  );
}
