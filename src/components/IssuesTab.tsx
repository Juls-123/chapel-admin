'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw, Filter, Search, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/requestFactory';
import { UIStateWrapper } from '@/components/ui-states/UIStateWrapper';

export interface SystemIssue {
  id: string;
  type: 'error' | 'warning' | 'info' | 'resolved';
  category: string; // 'upload', 'validation', 'system', 'data_integrity', etc.
  title: string;
  description: string;
  affected_records?: number;
  related_entity_type?: string; // 'student', 'attendance', 'service', etc.
  related_entity_id?: string;
  metadata?: any; // Additional context data
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolved_by?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface IssuesTabProps {
  category?: string; // Filter by category (e.g., 'upload', 'validation')
  entityType?: string; // Filter by entity type (e.g., 'student', 'attendance')
  limit?: number;
  showActions?: boolean;
}

export function IssuesTab({ 
  category, 
  entityType, 
  limit = 100, 
  showActions = true 
}: IssuesTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch system issues
  const { data: issues, isLoading, error, refetch } = useQuery({
    queryKey: ['system-issues', category, entityType, statusFilter, typeFilter, searchQuery, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (entityType) params.append('entity_type', entityType);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', limit.toString());
      
      const response = await api.get(`/api/issues?${params}`);
      return response.data as SystemIssue[];
    },
  });

  const getTypeIcon = (type: string) => {
    const icons = {
      error: AlertCircle,
      warning: AlertTriangle,
      info: Info,
      resolved: CheckCircle,
    };
    return icons[type as keyof typeof icons] || AlertCircle;
  };

  const getTypeBadge = (type: string) => {
    const config = {
      error: { variant: 'destructive' as const, label: 'Error' },
      warning: { variant: 'secondary' as const, label: 'Warning' },
      info: { variant: 'outline' as const, label: 'Info' },
      resolved: { variant: 'default' as const, label: 'Resolved' },
    };

    const { variant, label } = config[type as keyof typeof config] || config.error;
    const Icon = getTypeIcon(type);
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      upload: 'bg-blue-100 text-blue-800',
      validation: 'bg-yellow-100 text-yellow-800',
      system: 'bg-red-100 text-red-800',
      data_integrity: 'bg-purple-100 text-purple-800',
      performance: 'bg-orange-100 text-orange-800',
    };

    return (
      <Badge 
        variant="outline" 
        className={`capitalize ${colors[category as keyof typeof colors] || ''}`}
      >
        {category.replace('_', ' ')}
      </Badge>
    );
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

  const getIssueStats = () => {
    if (!issues) return { total: 0, errors: 0, warnings: 0, resolved: 0 };
    
    return {
      total: issues.length,
      errors: issues.filter(i => i.type === 'error').length,
      warnings: issues.filter(i => i.type === 'warning').length,
      resolved: issues.filter(i => i.type === 'resolved').length,
    };
  };

  const stats = getIssueStats();

  if (isLoading || error || !issues || issues.length === 0) {
    return (
      <UIStateWrapper
        isLoading={isLoading}
        error={error}
        data={issues}
        emptyTitle="No issues found"
        emptyMessage="No system issues match your current filters"
        onRetry={refetch}
        loadingMessage="Loading system issues..."
      >
        <div /> {/* This won't render due to empty state */}
      </UIStateWrapper>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          System Issues
          {category && (
            <Badge variant="outline" className="ml-2 capitalize">
              {category.replace('_', ' ')}
            </Badge>
          )}
        </CardTitle>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
            <div className="text-sm text-muted-foreground">Errors</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
            <div className="text-sm text-muted-foreground">Warnings</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-muted-foreground">Resolved</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="warning">Warnings</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!issues || issues.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">No issues found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'System is running smoothly!'
              }
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Affected</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{issue.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {issue.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(issue.type)}
                    </TableCell>
                    <TableCell>
                      {getCategoryBadge(issue.category)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {issue.affected_records ? (
                          <div>
                            <div className="font-medium">{issue.affected_records} records</div>
                            {issue.related_entity_type && (
                              <div className="text-muted-foreground capitalize">
                                {issue.related_entity_type}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(issue.created_at)}
                    </TableCell>
                    <TableCell>
                      {issue.resolved_at ? (
                        <div>
                          <Badge variant="default" className="mb-1">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                          {issue.resolved_by && (
                            <div className="text-xs text-muted-foreground">
                              by {issue.resolved_by.first_name} {issue.resolved_by.last_name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">Open</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
