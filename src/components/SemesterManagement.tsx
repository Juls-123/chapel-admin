// Semester management UI component for admins to define semester start and end dates
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

'use client';

import { useState } from 'react';
import { PlusCircle, Trash2, Calendar, Edit } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSemesters } from '@/hooks/useSemesters';
import { UIStateWrapper } from '@/components/ui-states/UIStateWrapper';
import { useToastExt } from '@/hooks/useToastExt';
import { Semester } from '@/lib/types/index';

export function SemesterManagement() {
  const [open, setOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const { data: semesters, isLoading, error, refetch } = useSemesters();
  const { success: showSuccess, error: showError } = useToastExt();

  const handleAddSemester = () => {
    setEditingSemester(null);
    setOpen(true);
  };

  const handleEditSemester = (semester: Semester) => {
    setEditingSemester(semester);
    setOpen(true);
  };

  const handleSaveSemester = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const semesterData = {
      name: formData.get('name') as string,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
    };

    try {
      // TODO: Implement API call when backend is ready
      if (editingSemester) {
        console.log('Updating semester:', { ...semesterData, id: editingSemester.id });
        showSuccess('Semester Updated', `"${semesterData.name}" has been updated.`);
      } else {
        console.log('Creating semester:', semesterData);
        showSuccess('Semester Created', `"${semesterData.name}" has been created.`);
      }
      
      setOpen(false);
      setEditingSemester(null);
      // TODO: Refetch data when API is implemented
      // refetch();
    } catch (error) {
      showError('Failed to save semester', 'Please try again.');
    }
  };

  const handleDeleteSemester = async (semester: Semester) => {
    if (confirm(`Are you sure you want to delete "${semester.name}"?`)) {
      try {
        // TODO: Implement API call when backend is ready
        console.log('Deleting semester:', semester.id);
        showSuccess('Semester Deleted', `"${semester.name}" has been deleted.`);
        // TODO: Refetch data when API is implemented
        // refetch();
      } catch (error) {
        showError('Failed to delete semester', 'Please try again.');
      }
    }
  };

  const getSemesterStatus = (semester: Semester): 'current' | 'upcoming' | 'past' => {
    const now = new Date();
    const startDate = new Date(semester.start_date);
    const endDate = new Date(semester.end_date);
    
    if (now >= startDate && now <= endDate) {
      return 'current';
    } else if (now < startDate) {
      return 'upcoming';
    } else {
      return 'past';
    }
  };

  const getStatusBadge = (status: 'current' | 'upcoming' | 'past') => {
    switch (status) {
      case 'current':
        return <Badge className="bg-green-100 text-green-800">Current</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>;
      case 'past':
        return <Badge variant="secondary">Past</Badge>;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Semester Management</CardTitle>
              <CardDescription>Define academic semester periods for attendance tracking.</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={handleAddSemester}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Semester
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <UIStateWrapper
          isLoading={isLoading}
          error={error}
          data={semesters}
          emptyTitle="No semesters defined"
          emptyMessage="Create your first semester to start tracking attendance."
          emptyActionLabel="Add Semester"
          onEmptyAction={handleAddSemester}
          onRetry={refetch}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Semester</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {semesters.map((semester) => {
                const status = getSemesterStatus(semester);
                return (
                  <TableRow key={semester.id}>
                    <TableCell className="font-medium">{semester.name}</TableCell>
                    <TableCell>{format(new Date(semester.start_date), 'PPP')}</TableCell>
                    <TableCell>{format(new Date(semester.end_date), 'PPP')}</TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEditSemester(semester)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive h-8 w-8"
                          onClick={() => handleDeleteSemester(semester)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </UIStateWrapper>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveSemester}>
            <DialogHeader>
              <DialogTitle>
                {editingSemester ? 'Edit Semester' : 'Add New Semester'}
              </DialogTitle>
              <DialogDescription>
                Define the academic semester period for attendance tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Semester Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="e.g., Fall 2024, Spring 2025"
                  defaultValue={editingSemester?.name || ''}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input 
                  id="start_date" 
                  name="start_date" 
                  type="date"
                  defaultValue={editingSemester?.start_date || ''}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input 
                  id="end_date" 
                  name="end_date" 
                  type="date"
                  defaultValue={editingSemester?.end_date || ''}
                  required 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSemester ? 'Update' : 'Create'} Semester
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
