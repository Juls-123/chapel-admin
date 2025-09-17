"use client";

import {
  LayoutDashboard,
  CalendarCheck,
  UserMinus,
  FileUp,
  UserX,
  MailWarning,
  ChevronRight,
  Users,
  Shield,
  ClipboardCheck,
  Settings,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState, useMemo } from "react";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { AccountSwitcher } from "./AccountSwitcher";

import { getCurrentUser } from "@/lib/auth"; // ✅ async
import { initDevTools } from "@/lib/auth/dev-auth"; // ✅ Import the init function

// Define type so TS knows what to expect
type User = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/services", label: "Services", icon: CalendarCheck },
  { href: "/students", label: "Students", icon: Users },
  { href: "/exeats", label: "Exeat Manager", icon: UserMinus },
  { href: "/attendance", label: "Attendance Upload", icon: FileUp },
  { href: "/manual-clear", label: "Manual Clear", icon: ClipboardCheck },
  { href: "/absentees", label: "Absentees", icon: UserX },
  { href: "/warnings", label: "Warning Letters", icon: MailWarning },
];

const settingsItems = [
  { href: "/admins", label: "Admins", icon: Shield },
  { href: "/definitions", label: "Definitions", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);

  // ✅ Fetch async user once on mount
  useEffect(() => {
    const fetchUser = async () => {
      const u = await getCurrentUser();
      setUser(u);
    };
    fetchUser();
  }, []);

  // ✅ Initialize dev tools on client side
  useEffect(() => {
    initDevTools();
  }, []);

  // Memoize active states to prevent infinite re-renders
  const activeStates = useMemo(() => {
    const navStates = navItems.reduce((acc, item) => {
      acc[item.href] =
        pathname.startsWith(item.href) &&
        (item.href === "/" ? pathname === "/" : true);
      return acc;
    }, {} as Record<string, boolean>);

    const settingsStates = settingsItems.reduce((acc, item) => {
      acc[item.href] = pathname.startsWith(item.href);
      return acc;
    }, {} as Record<string, boolean>);

    return { ...navStates, ...settingsStates };
  }, [pathname]);

  // Memoize tooltip objects to prevent infinite re-renders
  const tooltipObjects = useMemo(() => {
    return navItems.reduce((acc, item) => {
      acc[item.href] = { children: item.label, side: "right" as const };
      return acc;
    }, {} as Record<string, { children: string; side: "right" }>);
  }, []);

  // Memoize icon components to prevent infinite re-renders
  const iconComponents = useMemo(() => {
    return navItems.reduce((acc, item) => {
      acc[item.href] = <item.icon />;
      return acc;
    }, {} as Record<string, JSX.Element>);
  }, []);

  // Memoize settings tooltips and icons
  const settingsTooltips = useMemo(() => {
    return settingsItems.reduce((acc, item) => {
      acc[item.href] = { children: item.label, side: "right" as const };
      return acc;
    }, {} as Record<string, { children: string; side: "right" }>);
  }, []);

  const settingsIcons = useMemo(() => {
    return settingsItems.reduce((acc, item) => {
      acc[item.href] = <item.icon />;
      return acc;
    }, {} as Record<string, JSX.Element>);
  }, []);

  const getDisplayName = () => {
    if (user?.firstName || user?.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user?.email?.split("@")[0] || "User";
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <UserIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">Chapel Admin</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={activeStates[item.href]}
                    icon={iconComponents[item.href]}
                    tooltip={tooltipObjects[item.href]}
                  >
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
            <SidebarGroup>
              <SidebarGroupLabel>Settings</SidebarGroupLabel>
              <SidebarGroupContent>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                      <SidebarMenuButton
                        isActive={activeStates[item.href]}
                        icon={settingsIcons[item.href]}
                        tooltip={settingsTooltips[item.href]}
                      >
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setAccountSwitcherOpen(true)}
                    icon={<UserIcon />}
                    tooltip={{ children: "Switch Account", side: "right" }}
                  >
                    Switch Account
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <Separator className="my-2" />
          <Link href="/profile">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user?.firstName?.[0] || user?.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm">
                  <span className="font-semibold">{getDisplayName()}</span>
                  <span className="text-muted-foreground">{user?.email}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Link>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <SidebarTrigger />
          </div>
          <div className="flex-1" />
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </SidebarInset>

      <AccountSwitcher
        open={accountSwitcherOpen}
        onOpenChange={setAccountSwitcherOpen}
      />
    </SidebarProvider>
  );
}
