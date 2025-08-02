import { PlusCircle } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { services } from '@/lib/mock-data';
import { ServiceTable } from './data-table';

export default function ServiceManagementPage() {
  return (
    <AppShell>
      <PageHeader
        title="Service Management"
        description="View, create, and manage all chapel services."
      >
        <Button>
          <PlusCircle />
          Create Service
        </Button>
      </PageHeader>
      <div className="grid gap-6">
        <ServiceTable data={services} />
      </div>
    </AppShell>
  );
}
