
"use client";

import { useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  manualClearReasons as initialReasons,
  serviceConstraints as initialConstraints,
  currentAdmin,
} from '@/lib/mock-data';
import type { ManualClearReason, ServiceConstraint } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function DefinitionsPage() {
  const [reasons, setReasons] = useState<ManualClearReason[]>(initialReasons);
  const [constraints, setConstraints] = useState<ServiceConstraint[]>(initialConstraints);
  const [open, setOpen] = useState(false);
  const [definitionType, setDefinitionType] = useState<'reason' | 'constraint' | null>(null);
  const { toast } = useToast();

  const handleAddDefinition = (type: 'reason' | 'constraint') => {
    setDefinitionType(type);
    setOpen(true);
  };

  const handleSaveDefinition = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    if (definitionType === 'reason') {
      const newReason = formData.get('reason') as string;
      console.log("Adding new reason:", newReason);
      toast({ title: "Reason Added", description: `"${newReason}" has been added.` });
    } else if (definitionType === 'constraint') {
      const newName = formData.get('name') as string;
      const newDescription = formData.get('description') as string;
      console.log("Adding new constraint:", { name: newName, description: newDescription });
      toast({ title: "Constraint Added", description: `"${newName}" has been added.` });
    }
    
    setOpen(false);
    setDefinitionType(null);
  };

  return (
    <AppShell>
      <PageHeader
        title="Definitions"
        description="Manage predefined reasons for manual clearances and constraints for special services."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Manual Clear Reasons</CardTitle>
                <CardDescription>Reasons admins can select when manually clearing a student.</CardDescription>
              </div>
              <Button size="sm" onClick={() => handleAddDefinition('reason')}>
                <PlusCircle />
                Add Reason
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reasons.map((reason) => (
                  <TableRow key={reason.id}>
                    <TableCell className="font-medium">{reason.reason}</TableCell>
                    <TableCell>{reason.created_by}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Service Constraints</CardTitle>
                    <CardDescription>Rules that can be applied to special services.</CardDescription>
                </div>
                <Button size="sm" onClick={() => handleAddDefinition('constraint')}>
                    <PlusCircle />
                    Add Constraint
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Constraint</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {constraints.map((constraint) => (
                  <TableRow key={constraint.id}>
                    <TableCell>
                        <p className="font-medium">{constraint.name}</p>
                        <p className="text-sm text-muted-foreground">{constraint.description}</p>
                    </TableCell>
                    <TableCell>{constraint.created_by}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveDefinition}>
            <DialogHeader>
              <DialogTitle>Add New {definitionType === 'reason' ? 'Reason' : 'Constraint'}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {definitionType === 'reason' && (
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input id="reason" name="reason" placeholder="e.g., Student not in registry" required />
                </div>
              )}
              {definitionType === 'constraint' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Constraint Name</Label>
                    <Input id="name" name="name" placeholder="e.g., All Levels Must Attend" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" placeholder="A short explanation of the rule." required />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="submit">Save Definition</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
