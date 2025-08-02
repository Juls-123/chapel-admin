"use client";

import { useState } from 'react';
import { UploadCloud, File, X, CheckCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { students, services } from '@/lib/mock-data';

interface ParsedRecord {
  studentId: string;
  studentName: string;
  serviceId: string;
  serviceName: string;
  status: 'matched' | 'unmatched';
}

export default function AttendanceUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<ParsedRecord[]>([]);

  const onDrop = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    // Mock parsing logic
    const mockParsed: ParsedRecord[] = acceptedFiles.flatMap(f => 
      students.slice(0, 5).map((s, i) => ({
        studentId: s.student_number,
        studentName: s.full_name,
        serviceId: 'SVC001',
        serviceName: 'Morning Service',
        status: i % 4 === 0 ? 'unmatched' : 'matched',
      }))
    );
    setParsedData(mockParsed);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {'text/csv': ['.csv'], 'application/json': ['.json']} });
  
  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter(file => file !== fileToRemove));
    if (files.length === 1) {
        setParsedData([]);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Attendance Upload"
        description="Upload attendance data via CSV or JSON files."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>Drag & drop or click to select a file.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={cn(
                  'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                  isDragActive ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'
                )}
              >
                <input {...getInputProps()} />
                <UploadCloud className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-center text-muted-foreground">
                  {isDragActive ? 'Drop the files here...' : 'Drag & drop files here, or click to select'}
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
              <CardTitle>Batch Preview</CardTitle>
              <CardDescription>Review the parsed attendance records before ingesting.</CardDescription>
            </CardHeader>
            <CardContent>
              {parsedData.length > 0 ? (
                <div className="space-y-4">
                  <div className="max-h-96 overflow-auto rounded-md border">
                    <ul className="divide-y">
                      {parsedData.map((record, index) => (
                        <li key={index} className="flex items-center justify-between p-3">
                          <div>
                            <p className="font-medium">{record.studentName}</p>
                            <p className="text-sm text-muted-foreground">
                              ID: {record.studentId} | Service: {record.serviceName}
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
                    <Button variant="outline">Cancel</Button>
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      Confirm & Ingest Batch
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted bg-muted/50 p-8 text-center">
                    <div className="rounded-full bg-background p-3">
                      <File className="size-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                        Upload a file to see the preview.
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
