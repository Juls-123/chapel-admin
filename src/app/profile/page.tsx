
"use client";

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

export default function ProfilePage() {
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      const newFormData = {
        first_name: profile.first_name || '',
        middle_name: profile.middle_name || '',
        last_name: profile.last_name || '',
      };
      setFormData(newFormData);
    }
  }, [profile]);

  const isSuperAdmin = profile?.role === 'superadmin';

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Check if there are changes
    if (profile) {
      const hasChanged = 
        newFormData.first_name !== (profile.first_name || '') ||
        newFormData.middle_name !== (profile.middle_name || '') ||
        newFormData.last_name !== (profile.last_name || '');
      setHasChanges(hasChanged);
    }
  };

  const handleSave = () => {
    if (!hasChanges || !profile) return;
    
    const updateData: any = {};
    if (formData.first_name !== profile.first_name) updateData.first_name = formData.first_name;
    if (formData.middle_name !== profile.middle_name) updateData.middle_name = formData.middle_name;
    if (formData.last_name !== profile.last_name) updateData.last_name = formData.last_name;
    
    updateProfile(updateData);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <AppShell>
        <PageHeader
          title="My Profile"
          description="View and manage your account details."
        />
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <PageHeader
          title="My Profile"
          description="View and manage your account details."
        />
        <Card className="shadow-sm max-w-2xl">
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              Unable to load profile data. Please try again later.
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

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
              <AvatarFallback className="text-2xl">
                {profile.first_name?.[0] || ''}{profile.last_name?.[0] || ''}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" disabled={!isSuperAdmin}>Change Photo</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input 
                id="firstName" 
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                readOnly={!isSuperAdmin} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input 
                id="middleName" 
                value={formData.middle_name}
                onChange={(e) => handleInputChange('middle_name', e.target.value)}
                readOnly={!isSuperAdmin} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input 
                id="lastName" 
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                readOnly={!isSuperAdmin} 
              />
            </div>
          </div>
           <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={profile.email} readOnly />
            </div>
           <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={profile.role} readOnly className="capitalize" />
            </div>
             <div className="flex justify-end gap-2">
                {hasChanges && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFormData({
                        first_name: profile.first_name || '',
                        middle_name: profile.middle_name || '',
                        last_name: profile.last_name || '',
                      });
                      setHasChanges(false);
                    }}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                )}
                <Button 
                  onClick={handleSave}
                  disabled={!isSuperAdmin || !hasChanges || isUpdating}
                  className="min-w-[120px]"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
            </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
