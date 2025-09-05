'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { FileText, Download, Eye, AlertCircle, CheckCircle, Clock, Calendar, User, FileIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/requestFactory';
import { UIStateWrapper } from '@/components/ui-states/UIStateWrapper';

export interface UploadRecord {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  uploaded_by: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  upload_status: 'processing' | 'completed' | 'failed' | 'partial';
  records_processed: number;
  records_failed: number;
  records_total: number;
  processing_started_at: string;
  processing_completed_at: string;
  error_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface UploadError {
  id: string;
  upload_id: string;
  row_number: number;
  field_name?: string;
  error_type: string;
  error_message: string;
  raw_data?: any;
  created_at: string;
}

interface UploadHistoryProps {
  fileType?: string; // Filter by file type (e.g., 'students', 'attendance')
  limit?: number;
  showActions?: boolean;
}

export function UploadHistory({ 
  fileType, 
  limit = 50, 
  showActions = true 
}: UploadHistoryProps) {
  const [selectedUpload, setSelectedUpload] = useState<UploadRecord | null>(null);
  const [errorsDialogOpen, setErrorsDialogOpen] = useState(false);

  // Fetch upload history
  const { data: uploads, isLoading, error, refetch } = useQuery({
    queryKey: ['upload-history', fileType, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fileType) params.append('file_type', fileType);
      params.append('limit', limit.toString());
      
      const response = await api.get(`/api/uploads?${params}`);
      return response.data as UploadRecord[];
    },
  });

  // Fetch errors for selected upload
  const { data: uploadErrors, isLoading: errorsLoading } = useQuery({
    queryKey: ['upload-errors', selectedUpload?.id],
    queryFn: async () => {
      if (!selectedUpload?.id) return [];
      const response = await api.get(`/api/uploads/${selectedUpload.id}/errors`);
      return response.data as UploadError[];
    },
    enabled: !!selectedUpload?.id && errorsDialogOpen,
  });

  const getStatusBadge = (status: string) => {
    const config = {
      processing: { variant: 'secondary' as const, icon: Clock, label: 'Processing' },
      completed: { variant: 'default' as const, icon: CheckCircle, label: 'Completed' },
      failed: { variant: 'destructive' as const, icon: AlertCircle, label: 'Failed' },
      partial: { variant: 'secondary' as const, icon: AlertCircle, label: 'Partial' },
    };

    const { variant, icon: Icon, label } = config[status as keyof typeof config] || config.processing;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSuccessRate = (upload: UploadRecord) => {
    if (upload.records_total === 0) return 0;
    return Math.round((upload.records_processed / upload.records_total) * 100);
  };

  const handleViewErrors = (upload: UploadRecord) => {
    setSelectedUpload(upload);
    setErrorsDialogOpen(true);
  };

  if (isLoading || error || !uploads || uploads.length === 0) {
    return (
      <UIStateWrapper
        isLoading={isLoading}
        error={error}
        data={uploads}
        emptyTitle="No upload history found"
        emptyMessage="No files have been uploaded yet"
        onRetry={refetch}
        loadingMessage="Loading upload history..."
      >
        <div /> {/* This won't render due to empty state */}
      </UIStateWrapper>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload History
            {fileType && (
              <Badge variant="outline" className="ml-2">
                {fileType}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!uploads || uploads.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No upload history found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    {showActions && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads.map((upload) => (
                    <TableRow key={upload.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{upload.file_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatFileSize(upload.file_size)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {upload.file_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(upload.upload_status)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{upload.records_processed} / {upload.records_total}</span>
                            <span>{getSuccessRate(upload)}%</span>
                          </div>
                          <Progress value={getSuccessRate(upload)} className="h-2" />
                          {upload.records_failed > 0 && (
                            <div className="text-xs text-destructive">
                              {upload.records_failed} failed
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {upload.uploaded_by.first_name} {upload.uploaded_by.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {upload.uploaded_by.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(upload.created_at)}
                      </TableCell>
                      {showActions && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {upload.records_failed > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewErrors(upload)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Errors Dialog */}
      <Dialog open={errorsDialogOpen} onOpenChange={setErrorsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upload Errors</DialogTitle>
            <DialogDescription>
              Errors from {selectedUpload?.file_name} upload
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            {errorsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : !uploadErrors || uploadErrors.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No errors found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Error Type</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadErrors.map((error) => (
                    <TableRow key={error.id}>
                      <TableCell className="font-mono">{error.row_number}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {error.field_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {error.error_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={error.error_message}>
                          {error.error_message}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
