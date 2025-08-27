
"use client";

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { currentAdmin } from '@/lib/mock-data';

export default function ProfilePage() {

  const isSuperAdmin = currentAdmin.role === 'superadmin';

  return (
    <AppShell>
      <PageHeader
        title="My Profile"
        description="View and manage your account details."
      />
      <Card className="shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            {isSuperAdmin
              ? "You can edit your profile information below."
              : "Your profile is managed by a superadmin. Please contact them to make changes."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="https://placehold.co/80x80.png" data-ai-hint="admin user" />
              <AvatarFallback>
                {currentAdmin.first_name[0]}{currentAdmin.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" disabled={!isSuperAdmin}>Change Photo</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" defaultValue={currentAdmin.first_name} readOnly={!isSuperAdmin} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input id="middleName" defaultValue={currentAdmin.middle_name} readOnly={!isSuperAdmin} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" defaultValue={currentAdmin.last_name} readOnly={!isSuperAdmin} />
            </div>
          </div>
           <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={currentAdmin.email} readOnly />
            </div>
           <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" defaultValue={currentAdmin.role} readOnly className="capitalize" />
            </div>
             <div className="flex justify-end">
                <Button disabled={!isSuperAdmin}>Save Changes</Button>
            </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
