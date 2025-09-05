"use client";

import { useState, useCallback, useEffect } from 'react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Upload, FileText, AlertCircle, CheckCircle, Users, Download, PlusCircle, UploadCloud, X, File as FileIcon } from 'lucide-react';
import { useStudents, CreateStudentData } from '@/hooks/useStudents';
import { useLevels } from '@/hooks/useLevels';

import { StudentTable } from './data-table';
import { UploadHistory } from '@/components/UploadHistory';
import { IssuesTab } from '@/components/IssuesTab';
import { UploadProgress, UploadProgressData } from '@/components/UploadProgress';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import * as ExcelJS from 'exceljs';
import { cn } from '@/lib/utils';
import { UIStateWrapper } from '@/components/ui-states/UIStateWrapper';
import { currentAdmin } from '@/lib/mock-data';
import { useDropzone } from 'react-dropzone';

const studentFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required.'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required.'),
  matric_number: z.string().min(1, 'Matriculation number is required.'),
  email: z.string().email('Invalid email address.'),
  parent_email: z.string().email('Invalid parent email address.'),
  parent_phone: z.string().min(10, 'Please enter a valid phone number.'),
  level: z.coerce.number().min(100).max(500),
  gender: z.enum(['male', 'female']),
  department: z.string().min(1, 'Department is required.'),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface ParsedStudent {
  matric_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  parent_email: string;
  parent_phone: string;
  level: number;
  gender: 'male' | 'female';
  department: string;
}

export default function StudentManagementPage() {
    const [open, setOpen] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [parsedData, setParsedData] = useState<CreateStudentData[]>([]);
    const [uploadProgress, setUploadProgress] = useState<UploadProgressData | null>(null);
    const [showUploadProgress, setShowUploadProgress] = useState(false);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [matricQuery, setMatricQuery] = useState('');
    
    const isSuperAdmin = currentAdmin.role === 'superadmin';
    
    const { 
        students, 
        isLoading, 
        error, 
        refetch,
        createStudent, 
        isCreating 
    } = useStudents({ 
        // Remove pagination for client-side sorting - fetch all data
        limit: 1000, // Large limit to get all students
        search: '', // Remove server-side search since we'll handle it client-side
        onUploadSuccess: (result: any, variables: any) => {
            if ('students' in variables && 'uploadMetadata' in variables) {
                handleUploadComplete(true, result);
            }
        },
        onUploadError: (error: any, variables: any) => {
            if ('students' in variables && 'uploadMetadata' in variables) {
                handleUploadComplete(false, null, error);
            }
        }
    });

    const { 
        data: levels, 
        isLoading: levelsLoading, 
        error: levelsError 
    } = useLevels();
    
    const form = useForm<StudentFormValues>({
        resolver: zodResolver(studentFormSchema),
        defaultValues: {
            first_name: '',
            middle_name: '',
            last_name: '',
            matric_number: '',
            email: '',
            parent_email: '',
            parent_phone: '',
            level: 100,
            gender: 'male',
            department: '',
        },
    });

    // Handle search with both general and matric filters
    const handleSearch = useCallback((query: string, matricFilter?: string) => {
        setSearchQuery(query);
        if (matricFilter !== undefined) {
            setMatricQuery(matricFilter);
        }
        
        // Reset to first page when searching
        setPage(1);
    }, []);

    // Handle page changes
    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

    const parseExcelFile = (file: File): Promise<ParsedStudent[]> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const buffer = e.target?.result as ArrayBuffer;
            const workbook = new ExcelJS.Workbook();
            
            await workbook.xlsx.load(buffer);
            
            console.log('📊 Excel parsing started');
            
            // Get the first worksheet
            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
              throw new Error('No worksheet found in the Excel file');
            }
            
            const rows: any[][] = [];
            
            // Convert worksheet to array format
            worksheet.eachRow((row, rowNumber) => {
              const values: any[] = [];
              row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                values[colNumber - 1] = cell.value;
              });
              rows.push(values);
            });
            
            console.log('Raw Excel data (first 3 rows):', rows.slice(0, 3));
            console.log('Total rows in Excel:', rows.length);
            
            // Skip header row and parse data
            const dataRows = rows.slice(1);
            console.log('Data rows after header removal:', dataRows.length);
            
            const parsed: ParsedStudent[] = dataRows
              .filter(row => row.length > 0 && row[0]) // Filter out empty rows
              .map((row, index) => {
                // Map Excel columns to our structure based on the provided data format
                // Expected columns: First Name, Middle Name, Last Name, Matriculation Number, Level, Gender, Student Email, Parent's Email, Parent's Phone Number, Department
                const student = {
                  first_name: String(row[0] || '').trim(),
                  middle_name: String(row[1] || '').trim(),
                  last_name: String(row[2] || '').trim(),
                  matric_number: String(row[3] || '').trim(),
                  level: parseInt(String(row[4])) || 100,
                  gender: (String(row[5] || '').toLowerCase().trim() === 'female' ? 'female' : 'male') as 'male' | 'female',
                  email: String(row[6] || '').trim(),
                  parent_email: String(row[7] || '').trim(),
                  parent_phone: String(row[8] || '').trim(),
                  department: String(row[9] || '').trim(),
                };
                
                // Debug log for first few students
                if (index < 3) {
                  console.log(`Student ${index + 1} parsed:`, student);
                }
                
                return student;
              })
              .filter(student => student.first_name && student.last_name && student.matric_number); // Filter out invalid entries
            
            console.log('✅ Parsed students count:', parsed.length);
            console.log('Sample parsed data (first 2):', parsed.slice(0, 2));
            
            // Validate each student record
            const validationErrors: any[] = [];
            parsed.forEach((student, index) => {
              const errors: string[] = [];
              
              // Check required fields
              if (!student.first_name) errors.push('Missing first name');
              if (!student.last_name) errors.push('Missing last name');
              if (!student.matric_number) errors.push('Missing matric number');
              if (!student.email) errors.push('Missing email');
              if (!student.parent_email) errors.push('Missing parent email');
              if (!student.parent_phone) errors.push('Missing parent phone');
              if (!student.department) errors.push('Missing department');
              
              // Check data types and formats
              if (student.level < 100 || student.level > 500) errors.push(`Invalid level: ${student.level}`);
              if (!['male', 'female'].includes(student.gender)) errors.push(`Invalid gender: ${student.gender}`);
              if (student.email && !student.email.includes('@')) errors.push(`Invalid email format: ${student.email}`);
              if (student.parent_email && !student.parent_email.includes('@')) errors.push(`Invalid parent email format: ${student.parent_email}`);
              if (student.parent_phone && student.parent_phone.length < 10) errors.push(`Invalid parent phone: ${student.parent_phone}`);
              
              if (errors.length > 0) {
                validationErrors.push({
                  row: index + 2, // +2 because we skip header and arrays are 0-indexed
                  student: student.first_name + ' ' + student.last_name,
                  matric: student.matric_number,
                  errors
                });
              }
            });
            
            if (validationErrors.length > 0) {
              console.error('❌ Validation errors found:', validationErrors.slice(0, 5));
              console.error('Total validation errors:', validationErrors.length);
            } else {
              console.log('✅ All records passed validation');
            }
            
            resolve(parsed);
          } catch (error) {
            console.error('💥 Excel parsing error:', error);
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });
    };

    const onDrop = async (acceptedFiles: File[]) => {
      setFiles(acceptedFiles);
      if (acceptedFiles.length > 0) {
        try {
          const file = acceptedFiles[0];
          const parsed = await parseExcelFile(file);
          setParsedData(parsed);
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          setParsedData([]);
        }
      }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
      onDrop, 
      accept: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.ms-excel': ['.xls']
      }
    });

    const removeFile = (fileToRemove: File) => {
        setFiles(files.filter(file => file !== fileToRemove));
        if (files.length === 1) {
            setParsedData([]);
        }
    }

    const onIndividualSubmit = (data: StudentFormValues) => {
        if (!isSuperAdmin) {
            return;
        }
        createStudent(data as CreateStudentData);
        setOpen(false);
        form.reset();
    }

    const onBulkSubmit = () => {
        if (!isSuperAdmin || parsedData.length === 0) {
            return;
        }
        
        // Initialize upload progress
        const progressData: UploadProgressData = {
            fileName: files[0]?.name || 'unknown.xlsx',
            totalRecords: parsedData.length,
            processedRecords: 0,
            status: 'processing',
            startTime: new Date(),
        };
        
        setUploadProgress(progressData);
        setShowUploadProgress(true);
        
        // Prepare payload with upload metadata
        const uploadPayload = {
            students: parsedData as CreateStudentData[],
            uploadMetadata: {
                fileName: files[0]?.name || 'unknown.xlsx',
                fileSize: files[0]?.size || 0,
                uploadDate: new Date().toISOString()
            }
        };
        
        console.log('🚀 Submitting bulk upload payload:');
        console.log('Payload structure:', Object.keys(uploadPayload));
        console.log('Students count:', uploadPayload.students.length);
        console.log('Upload metadata:', uploadPayload.uploadMetadata);
        console.log('First student sample:', uploadPayload.students[0]);
        console.log('Payload size (approx):', JSON.stringify(uploadPayload).length, 'characters');
        
        createStudent(uploadPayload);
        setFiles([]);
        setParsedData([]);
    }

    // Handle upload completion/failure
    const handleUploadComplete = (success: boolean, result?: any, error?: any) => {
        if (!uploadProgress) return;

        const updatedProgress: UploadProgressData = {
            ...uploadProgress,
            status: success ? 'completed' : 'failed',
            processedRecords: success ? uploadProgress.totalRecords : 0,
            endTime: new Date(),
            errors: error?.response?.data?.details || []
        };

        setUploadProgress(updatedProgress);
    };

    const handleCloseUploadProgress = () => {
        setShowUploadProgress(false);
        setUploadProgress(null);
    };

    const handleRetryUpload = () => {
        if (parsedData.length > 0) {
            onBulkSubmit();
        }
    };

    return (
        <AppShell>
          <PageHeader
            title="Student Management"
            description="Add, view, and manage all registered students."
          >
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button disabled={!isSuperAdmin}>
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
                                    name="first_name"
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
                                    name="middle_name"
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
                                    name="last_name"
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
                                  name="matric_number"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Matriculation Number</FormLabel>
                                          <FormControl>
                                              <Input placeholder="e.g. 22020401007" {...field} />
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
                                      <Select 
                             onValueChange={(value) => field.onChange(Number(value))} // Convert string to number for form
                             defaultValue={String(field.value)} // Convert number to string for display
                             disabled={levelsLoading}
    >
                                          <FormControl>
                                              <SelectTrigger>
                                                  <SelectValue placeholder={
                                                      levelsLoading ? "Loading levels..." : 
                                                      levelsError ? "Error loading levels" :
                                                      "Select a level"
                                                  } />
                                              </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                              {levels.map((level) => (
                                                 <SelectItem key={level.id} value={level.code}>
                                                 {level.code} Level {level.name && `- ${level.name}`}
                                             </SelectItem>
                                              ))}
                                              {levels.length === 0 && !levelsLoading && (
                                                  <SelectItem value="no-levels" disabled>
                                                      No levels available
                                                  </SelectItem>
                                              )}
                                          </SelectContent>
                                      </Select>
                                      <FormMessage />
                                      </FormItem>
                                  )}
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <FormField
                                  control={form.control}
                                  name="gender"
                                  render={({ field }) => (
                                      <FormItem>
                                      <FormLabel>Gender</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                              <SelectTrigger>
                                                  <SelectValue placeholder="Select gender" />
                                              </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                              <SelectItem value="male">Male</SelectItem>
                                              <SelectItem value="female">Female</SelectItem>
                                          </SelectContent>
                                      </Select>
                                      <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="department"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Department</FormLabel>
                                          <FormControl>
                                              <Input placeholder="e.g. ACCOUNTING & FINANCE" {...field} />
                                          </FormControl>
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
                                name="parent_email"
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
                                name="parent_phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Parent's Phone Number</FormLabel>
                                        <FormControl>
                                            <Input type="tel" placeholder="e.g. +2348012345678" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            </div>
                            <DialogFooter>
                                <Button 
                                    type="submit" 
                                    disabled={isCreating}
                                    className="min-w-[100px]"
                                >
                                    {isCreating ? 'Adding...' : 'Add Student'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
          </PageHeader>

          <Tabs defaultValue="students" className="space-y-6">
            <TabsList>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="upload-history">Upload History</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-5">
                <div className="lg:col-span-2">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Bulk Registration</CardTitle>
                            <CardDescription>Upload an Excel file to register multiple students at once.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div
                                {...getRootProps()}
                                className={cn(
                                'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                                isDragActive ? 'border-primary bg-primary/10' : 'border-muted',
                                'hover:border-primary/50',
                                !isSuperAdmin && 'opacity-50 cursor-not-allowed'
                                )}
                            >
                                <input {...getInputProps()} disabled={!isSuperAdmin} />
                                <UploadCloud className="h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 text-center text-muted-foreground">
                                    {!isSuperAdmin 
                                        ? 'Only superadmins can upload student data'
                                        : isDragActive 
                                        ? 'Drop the Excel file here...' 
                                        : 'Drag & drop an Excel file (.xlsx/.xls), or click to select'
                                    }
                                </p>
                            </div>
                            {files.length > 0 && (
                                <div className="space-y-2">
                                <h4 className="font-medium">Selected file:</h4>
                                {files.map(file => (
                                    <div key={file.name} className="flex items-center justify-between p-2 rounded-md bg-muted">
                                        <div className="flex items-center gap-2">
                                            <FileIcon className="h-5 w-5 text-muted-foreground" />
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
                                    <h4 className="font-medium mb-2">File Preview ({parsedData.length} students):</h4>
                                    <div className="max-h-40 overflow-auto rounded-md border">
                                        <ul className="divide-y">
                                        {parsedData.map((student, index) => (
                                            <li key={index} className="p-2 text-sm">
                                                <p className="font-medium">{student.first_name} {student.middle_name} {student.last_name}</p>
                                                <p className="text-muted-foreground">{student.matric_number} - {student.email}</p>
                                                <p className="text-xs text-muted-foreground">{student.department} • Level {student.level} • {student.gender}</p>
                                            </li>
                                        ))}
                                        </ul>
                                    </div>
                                    <Button 
                                        className="w-full mt-4" 
                                        onClick={onBulkSubmit}
                                        disabled={isCreating}
                                    >
                                        {isCreating ? 'Registering...' : `Register ${parsedData.length} Students`}
                                    </Button>
                                 </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-3">
                     <UIStateWrapper
                        isLoading={isLoading}
                        error={error}
                        data={students}
                        emptyTitle="No students found"
                        emptyMessage="No students have been registered yet."
                        emptyActionLabel="Add First Student"
                        onEmptyAction={() => setOpen(true)}
                        onRetry={refetch}
                     >
                        <StudentTable 
                            data={students} 
                            onSearch={handleSearch}
                            isSuperAdmin={isSuperAdmin}
                            isLoading={isLoading}
                        />
                     </UIStateWrapper>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload-history">
              <UploadHistory fileType="students" />
            </TabsContent>

            <TabsContent value="issues">
              <IssuesTab category="upload" entityType="student" />
            </TabsContent>
          </Tabs>
          
          {/* Upload Progress Component */}
          <UploadProgress
            uploadData={uploadProgress}
            isVisible={showUploadProgress}
            onClose={handleCloseUploadProgress}
            onRetry={handleRetryUpload}
          />
        </AppShell>
    );
}