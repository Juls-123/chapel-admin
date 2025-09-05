'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Clock, FileText, Users, AlertTriangle, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface UploadProgressData {
  uploadId?: string;
  fileName: string;
  totalRecords: number;
  processedRecords: number;
  status: 'processing' | 'completed' | 'failed' | 'partial';
  errors?: Array<{
    row_number: number;
    field_name: string;
    error_message: string;
    raw_value: string;
  }>;
  startTime: Date;
  endTime?: Date;
}

interface UploadProgressProps {
  uploadData: UploadProgressData | null;
  isVisible: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export function UploadProgress({ uploadData, isVisible, onClose, onRetry }: UploadProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!uploadData) return;

    const calculatedProgress = uploadData.totalRecords > 0 
      ? Math.round((uploadData.processedRecords / uploadData.totalRecords) * 100)
      : 0;
    
    setProgress(calculatedProgress);
  }, [uploadData]);

  if (!isVisible || !uploadData) return null;

  const getStatusConfig = () => {
    switch (uploadData.status) {
      case 'processing':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Processing...',
          variant: 'secondary' as const
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Completed',
          variant: 'default' as const
        };
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Failed',
          variant: 'destructive' as const
        };
      case 'partial':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Partial Success',
          variant: 'secondary' as const
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown',
          variant: 'outline' as const
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const errorCount = uploadData.errors?.length || 0;
  const successRate = uploadData.totalRecords > 0 
    ? Math.round((uploadData.processedRecords / uploadData.totalRecords) * 100)
    : 0;

  const getDuration = () => {
    if (uploadData.endTime) {
      return formatDistanceToNow(uploadData.startTime, { addSuffix: false });
    }
    return formatDistanceToNow(uploadData.startTime, { addSuffix: true });
  };

  return (
    <Card className={`fixed bottom-4 right-4 w-96 shadow-lg border-2 ${statusConfig.borderColor} ${statusConfig.bgColor} z-[110]`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
            Upload Progress
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* File Info */}
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="font-medium truncate">{uploadData.fileName}</span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge variant={statusConfig.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
          <span className="text-xs text-gray-500">
            {getDuration()}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span>{uploadData.processedRecords} / {uploadData.totalRecords}</span>
          </div>
          <Progress 
            value={progress} 
            className="h-2"
          />
          <div className="text-xs text-gray-500 text-center">
            {progress}% complete
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-green-600" />
            <span>Success: {uploadData.processedRecords}</span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-600" />
              <span>Errors: {errorCount}</span>
            </div>
          )}
        </div>

        {/* Success Rate */}
        {uploadData.status !== 'processing' && (
          <div className="text-xs">
            <span className="font-medium">Success Rate: </span>
            <span className={successRate === 100 ? 'text-green-600' : successRate > 50 ? 'text-yellow-600' : 'text-red-600'}>
              {successRate}%
            </span>
          </div>
        )}

        {/* Error Summary */}
        {errorCount > 0 && uploadData.status !== 'processing' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-xs text-red-800">
              {errorCount} error{errorCount > 1 ? 's' : ''} found. 
              {errorCount <= 3 ? (
                <div className="mt-1 space-y-1">
                  {uploadData.errors?.slice(0, 3).map((error, index) => (
                    <div key={index} className="text-xs">
                      Row {error.row_number}: {error.error_message}
                    </div>
                  ))}
                </div>
              ) : (
                <span> Check the Issues tab for details.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {uploadData.status !== 'processing' && (
          <div className="flex gap-2 pt-2">
            {uploadData.status === 'failed' && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="flex-1 text-xs"
              >
                Retry Upload
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="flex-1 text-xs"
            >
              {uploadData.status === 'completed' ? 'Done' : 'Close'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
