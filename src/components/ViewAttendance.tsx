"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";

interface ViewAttendanceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    id: string;
    name?: string;
    type: string;
    date: string;
    levels: string[];
  } | null;
}

// Mock attendance data for demonstration
const mockAttendanceData = {
  "100": [
    {
      id: "1",
      name: "John Doe",
      matric: "20/1001",
      status: "present",
      time: "07:05",
    },
    {
      id: "2",
      name: "Jane Smith",
      matric: "20/1002",
      status: "absent",
      time: null,
    },
    {
      id: "3",
      name: "Mike Johnson",
      matric: "20/1003",
      status: "present",
      time: "07:03",
    },
    {
      id: "4",
      name: "Sarah Wilson",
      matric: "20/1004",
      status: "late",
      time: "07:15",
    },
    {
      id: "5",
      name: "David Brown",
      matric: "20/1005",
      status: "present",
      time: "07:01",
    },
  ],
  "200": [
    {
      id: "6",
      name: "Alice Cooper",
      matric: "19/2001",
      status: "present",
      time: "07:02",
    },
    {
      id: "7",
      name: "Bob Taylor",
      matric: "19/2002",
      status: "present",
      time: "07:04",
    },
    {
      id: "8",
      name: "Carol Davis",
      matric: "19/2003",
      status: "absent",
      time: null,
    },
    {
      id: "9",
      name: "Daniel Lee",
      matric: "19/2004",
      status: "present",
      time: "07:06",
    },
  ],
  "300": [
    {
      id: "10",
      name: "Emma Garcia",
      matric: "18/3001",
      status: "present",
      time: "07:01",
    },
    {
      id: "11",
      name: "Frank Miller",
      matric: "18/3002",
      status: "present",
      time: "07:03",
    },
    {
      id: "12",
      name: "Grace Chen",
      matric: "18/3003",
      status: "late",
      time: "07:12",
    },
  ],
  "400": [
    {
      id: "13",
      name: "Henry Wang",
      matric: "17/4001",
      status: "present",
      time: "07:02",
    },
    {
      id: "14",
      name: "Ivy Rodriguez",
      matric: "17/4002",
      status: "absent",
      time: null,
    },
  ],
};

const levelNames = {
  "100": "100 Level",
  "200": "200 Level",
  "300": "300 Level",
  "400": "400 Level",
};

export function ViewAttendance({
  open,
  onOpenChange,
  service,
}: ViewAttendanceProps) {
  const [activeTab, setActiveTab] = useState<string>("100");

  if (!service) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Present
          </Badge>
        );
      case "absent":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Absent
          </Badge>
        );
      case "late":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Late
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStats = (levelData: any[]) => {
    const present = levelData.filter((s) => s.status === "present").length;
    const absent = levelData.filter((s) => s.status === "absent").length;
    const late = levelData.filter((s) => s.status === "late").length;
    const total = levelData.length;

    return { present, absent, late, total };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Attendance - {service.name || `${service.type} Service`}
          </DialogTitle>
          <DialogDescription>
            {format(parseISO(service.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {Object.keys(levelNames).map((level) => {
              const levelData =
                mockAttendanceData[level as keyof typeof mockAttendanceData] ||
                [];
              const stats = getStats(levelData);

              return (
                <TabsTrigger
                  key={level}
                  value={level}
                  className="flex flex-col gap-1"
                >
                  <span>{levelNames[level as keyof typeof levelNames]}</span>
                  <span className="text-xs text-muted-foreground">
                    {stats.present}/{stats.total}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.keys(levelNames).map((level) => {
            const levelData =
              mockAttendanceData[level as keyof typeof mockAttendanceData] ||
              [];
            const stats = getStats(levelData);

            return (
              <TabsContent key={level} value={level} className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total Students
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-2xl font-bold">{stats.total}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600">
                          Present
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-2xl font-bold text-green-600">
                          {stats.present}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600">
                          Absent
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-2xl font-bold text-red-600">
                          {stats.absent}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-600">
                          Late
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-2xl font-bold text-yellow-600">
                          {stats.late}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {levelNames[level as keyof typeof levelNames]}{" "}
                        Attendance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Matric Number</TableHead>
                              <TableHead>Student Name</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Check-in Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {levelData.map((student) => (
                              <TableRow key={student.id}>
                                <TableCell className="font-medium">
                                  {student.matric}
                                </TableCell>
                                <TableCell>{student.name}</TableCell>
                                <TableCell>
                                  {getStatusBadge(student.status)}
                                </TableCell>
                                <TableCell>
                                  {student.time ? (
                                    <span className="text-sm">
                                      {student.time}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
