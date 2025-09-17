"use client";

import { useState, useEffect } from "react";
import { User, Loader2, Crown, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getDevUsers, switchAccount } from "@/lib/auth/dev-auth";
import { getCurrentUser } from "@/lib/auth";

interface AccountSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSwitcher({ open, onOpenChange }: AccountSwitcherProps) {
  const [switching, setSwitching] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const devUsers = getDevUsers();

  useEffect(() => {
    if (open) {
      getCurrentUser().then(setCurrentUser);
    }
  }, [open]);

  const handleSwitchAccount = async (userType: 'admin' | 'superadmin') => {
    setSwitching(userType);
    try {
      await switchAccount(userType);
      // Modal will close automatically on page reload
    } catch (error) {
      console.error('Failed to switch account:', error);
      setSwitching(null);
    }
  };

  const isCurrentUser = (userEmail: string) => {
    return currentUser?.email === userEmail;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Switch Account
          </DialogTitle>
          <DialogDescription>
            Choose which account to sign in as. The page will reload and redirect to dashboard.
          </DialogDescription>
        </DialogHeader>
        
        {currentUser && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">Currently signed in as:</div>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {currentUser.firstName?.[0] || currentUser.email?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{currentUser.email}</span>
              <Badge variant="secondary" className="text-xs">
                {currentUser.role || 'user'}
              </Badge>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          {devUsers.map((user) => {
            const isCurrent = isCurrentUser(user.email);
            return (
              <Button
                key={user.id}
                variant={isCurrent ? "default" : "outline"}
                className="w-full justify-start h-auto p-4 relative"
                onClick={() => handleSwitchAccount(user.id)}
                disabled={switching !== null || isCurrent}
              >
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-lg">
                      {user.displayName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 text-left">
                    <div className="font-semibold flex items-center gap-2">
                      {user.displayName}
                      {user.role === 'superadmin' ? (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <Shield className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <Badge 
                      variant={user.role === 'superadmin' ? 'default' : 'secondary'} 
                      className="text-xs mt-1"
                    >
                      {user.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </div>
                  
                  {switching === user.id && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                  
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={switching !== null}
          >
            Cancel
          </Button>
          
          <div className="text-xs text-muted-foreground">
            🔄 Account Switcher
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
