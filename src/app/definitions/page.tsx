
"use client";

import { useState } from 'react';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SemesterManagement } from '@/components/SemesterManagement';
import { useOverrideReasons } from '@/hooks/useOverrideReasons';
import { useServiceConstraints } from '@/hooks/useServiceConstraints';

export default function DefinitionsPage() {
  const { 
    overrideReasons, 
    isLoading: reasonsLoading, 
    createOverrideReason, 
    deleteOverrideReason,
    isCreating: creatingReason,
    isDeleting: deletingReason
  } = useOverrideReasons();
  
  const { 
    serviceConstraints, 
    isLoading: constraintsLoading, 
    createServiceConstraint, 
    deleteServiceConstraint,
    isCreating: creatingConstraint,
    isDeleting: deletingConstraint
  } = useServiceConstraints();

  const [open, setOpen] = useState(false);
  const [definitionType, setDefinitionType] = useState<'reason' | 'constraint' | null>(null);

  const handleAddDefinition = (type: 'reason' | 'constraint') => {
    setDefinitionType(type);
    setOpen(true);
  };

  const handleSaveDefinition = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    if (definitionType === 'reason') {
      const code = formData.get('code') as string;
      const displayName = formData.get('display_name') as string;
      const description = formData.get('description') as string;
      const requiresNote = formData.get('requires_note') === 'on';
      
      createOverrideReason({
        code,
        display_name: displayName,
        description: description || undefined,
        requires_note: requiresNote,
      });
    } else if (definitionType === 'constraint') {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const constraintRule = formData.get('constraint_rule') as string;
      
      try {
        const parsedRule = JSON.parse(constraintRule || '{}');
        createServiceConstraint({
          name,
          description: description || undefined,
          constraint_rule: parsedRule,
        });
      } catch (error) {
        console.error('Invalid constraint rule JSON:', error);
        return;
      }
    }
    
    setOpen(false);
    setDefinitionType(null);
  };

  const handleDeleteReason = (id: string) => {
    deleteOverrideReason(id);
  };

  const handleDeleteConstraint = (id: string) => {
    deleteServiceConstraint(id);
  };

  return (
    <AppShell>
      <PageHeader
        title="Definitions"
        description="Manage predefined reasons for manual clearances and constraints for special services."
      />

      {/* Semester Management Section */}
      <div className="mb-6">
        <SemesterManagement />
      </div>

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
            {reasonsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overrideReasons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No override reasons found. Add one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    overrideReasons.map((reason) => (
                      <TableRow key={reason.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{reason.display_name}</div>
                            {reason.description && (
                              <div className="text-sm text-muted-foreground">{reason.description}</div>
                            )}
                            {reason.requires_note && (
                              <div className="text-xs text-blue-600 mt-1">Requires note</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{reason.code}</TableCell>
                        <TableCell>{reason.created_by_name}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive h-8 w-8"
                            onClick={() => handleDeleteReason(reason.id)}
                            disabled={deletingReason}
                          >
                            {deletingReason ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
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
            {constraintsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Constraint</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceConstraints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No service constraints found. Add one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    serviceConstraints.map((constraint) => (
                      <TableRow key={constraint.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{constraint.name}</div>
                            {constraint.description && (
                              <div className="text-sm text-muted-foreground">{constraint.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {JSON.stringify(constraint.constraint_rule)}
                          </code>
                        </TableCell>
                        <TableCell>{constraint.created_by_name}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive h-8 w-8"
                            onClick={() => handleDeleteConstraint(constraint.id)}
                            disabled={deletingConstraint}
                          >
                            {deletingConstraint ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
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
                <>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input 
                      id="code" 
                      name="code" 
                      placeholder="e.g., late_exeat" 
                      required 
                      pattern="[a-z_]+"
                      title="Use lowercase letters and underscores only"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input 
                      id="display_name" 
                      name="display_name" 
                      placeholder="e.g., Late Exeat Submission" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea 
                      id="description" 
                      name="description" 
                      placeholder="Detailed explanation of when this reason applies"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="requires_note" name="requires_note" />
                    <Label htmlFor="requires_note">Requires admin to add a note</Label>
                  </div>
                </>
              )}
              {definitionType === 'constraint' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Constraint Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      placeholder="e.g., Male Students Only" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea 
                      id="description" 
                      name="description" 
                      placeholder="Explain when and how this constraint applies"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="constraint_rule">Constraint Rule (JSON)</Label>
                    <Textarea 
                      id="constraint_rule" 
                      name="constraint_rule" 
                      placeholder='{"gender": "male"} or {"level_codes": ["400"]}'
                      required
                      rows={3}
                      className="font-mono text-sm"
                    />
                    <div className="text-xs text-muted-foreground">
                      Examples: <code>{`{"gender": "male"}`}</code>, <code>{`{"level_codes": ["400"]}`}</code>, <code>{`{"exclude_level_codes": ["100"]}`}</code>
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={creatingReason || creatingConstraint}
                className="min-w-[120px]"
              >
                {(creatingReason || creatingConstraint) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Save Definition'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
