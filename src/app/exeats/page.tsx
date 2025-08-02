import { PlusCircle } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { exeats } from '@/lib/mock-data';
import { ExeatTable } from './data-table';

export default function ExeatManagerPage() {
  return (
    <AppShell>
      <PageHeader
        title="Exeat Manager"
        description="Manage student exeats and absences."
      >
        <Button>
          <PlusCircle />
          Add Exeat
        </Button>
      </PageHeader>
      <div className="grid gap-6">
        <ExeatTable data={exeats} />
      </div>
    </AppShell>
  );
}
