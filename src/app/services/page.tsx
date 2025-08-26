
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

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
        <Link href="#">
            <Button>
            <PlusCircle />
            Create Service
            </Button>
        </Link>
      </PageHeader>
      <div className="grid gap-6">
        <ServiceTable data={services} />
      </div>
    </AppShell>
  );
}
