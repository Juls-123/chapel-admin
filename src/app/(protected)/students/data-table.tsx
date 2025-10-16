"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useStudents, StudentRecord as Student } from "@/hooks/useStudents";
import { useLevels } from "@/hooks/useLevels";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  MoreHorizontal,
  ArrowUpDown,
  PauseCircle,
  PlayCircle,
  Eye,
  Pencil,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { StudentWithRecords } from "@/lib/types";
import { attendanceRecords } from "@/lib/mock-data";
import { StudentProfileModal } from "@/components/StudentProfileModal";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface StudentTableProps {
  data: Student[];
  onSearch?: (query: string, matricFilter?: string) => void;
  isSuperAdmin?: boolean;
  isLoading?: boolean;
}

// Define a proper edit form data type to handle nullability
interface EditFormData {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  parent_email?: string; // Non-nullable for form
  parent_phone?: string;
  gender?: "male" | "female";
  department?: string;
  level?: number;
  status?: "active" | "inactive";
}

export function StudentTable({
  data,
  onSearch,
  isSuperAdmin = false,
  isLoading = false,
}: StudentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [matricFilter, setMatricFilter] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({});
  const [selectedStudent, setSelectedStudent] =
    useState<StudentWithRecords | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedForAction, setSelectedForAction] = useState<Student | null>(
    null
  );
  const { toast } = useToast();
  const { deleteStudent, isDeleting, updateStudent, isUpdating } =
    useStudents();
  const { data: levels } = useLevels();

  // Debounce refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const matricTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getFullName = (student: Student) =>
    `${student.first_name} ${student.last_name}`;

  const handleViewProfile = (student: Student) => {
    const records = attendanceRecords.filter(
      (r) => r.matric_number === student.matric_number
    );

    // Create a proper StudentWithRecords object with all required fields
    const studentWithRecords: StudentWithRecords = {
      ...student,
      attendance: records,
      level_id: student.level_id || "", // Ensure level_id is provided
      upload_batch_id: student.upload_batch_id || null, // Ensure upload_batch_id is provided
      level: student.level ?? undefined,
      level_name: student.level_name ?? undefined,
    };

    setSelectedStudent(studentWithRecords);
    setIsModalOpen(true);
  };

  const handleView = (student: Student) => {
    setSelectedForAction(student);
    setViewDialogOpen(true);
  };

  const handleDelete = (student: Student) => {
    setSelectedForAction(student);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (student: Student) => {
    setSelectedForAction(student);
    setEditFormData({
      first_name: student.first_name,
      middle_name: student.middle_name || "",
      last_name: student.last_name,
      email: student.email || "",
      parent_email: student.parent_email || "", // Convert null to empty string
      parent_phone: student.parent_phone || "",
      gender: student.gender as "male" | "female",
      department: student.department || "",
      level: student.level ?? undefined,
      status: student.status,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedForAction || !editFormData) return;

    try {
      // Prepare update data, ensuring non-nullable fields are handled properly
      const updateData = {
        ...editFormData,
        // Ensure parent_email is never null for the update
        parent_email: editFormData.parent_email || "",
      };

      updateStudent({
        id: selectedForAction.id,
        data: updateData,
      });
      setEditDialogOpen(false);
      setSelectedForAction(null);
      setEditFormData({});
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setSelectedForAction(null);
    setEditFormData({});
  };

  const confirmDelete = () => {
    if (selectedForAction) {
      deleteStudent(selectedForAction.id);
      setDeleteDialogOpen(false);
      setSelectedForAction(null);
    }
  };

  const handleTogglePause = async (student: Student) => {
    const newStatus = student.status === "active" ? "inactive" : "active";
    try {
      await updateStudent({
        id: student.id,
        data: { status: newStatus },
      });
      toast({
        title: `Student ${newStatus === "active" ? "Resumed" : "Paused"}`,
        description: `${getFullName(student)} has been ${
          newStatus === "active" ? "activated" : "paused"
        }.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update student status.",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "full_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Student
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const student = row.original;
        const fullName = getFullName(student);
        const initials = `${student.first_name[0]}${student.last_name[0]}`;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{fullName}</span>
              <span className="text-sm text-muted-foreground">
                {student.matric_number}
              </span>
              <span className="text-xs text-muted-foreground">
                {student.email}
              </span>
            </div>
          </div>
        );
      },
      accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    },
    {
      accessorKey: "matric_number",
      header: "Matric Number",
      cell: ({ row }) => row.original.matric_number,
      enableColumnFilter: true,
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => row.original.department || "N/A",
    },
    {
      accessorKey: "level",
      header: "Level",
      cell: ({ row }) => `${row.original.level}L`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as Student["status"];
        if (!status) return null;
        const variant = status === "active" ? "default" : "secondary";
        const colorClass =
          status === "active"
            ? "bg-green-100 text-green-800"
            : "bg-yellow-100 text-yellow-800";
        return (
          <Badge variant={variant} className={cn(colorClass, "border-0")}>
            {status === "inactive"
              ? "Paused"
              : status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleViewProfile(student)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Profile
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => handleEdit(student)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Student
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleTogglePause(student)}
                    >
                      {student.status === "active" ? (
                        <>
                          <PauseCircle className="mr-2 h-4 w-4" /> Pause Student
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" /> Resume Student
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Memoize columns to prevent re-creation on every render
  const memoizedColumns = useMemo(() => columns, [isSuperAdmin]);

  // Client-side filtering and pagination
  const table = useReactTable({
    data: data || [],
    columns: memoizedColumns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    globalFilterFn: "includesString",
  });

  // Client-side search handlers
  const handleSearch = useCallback(
    (value: string) => {
      setGlobalFilter(value);
      // Also call the parent onSearch if provided for any external tracking
      onSearch?.(value, matricFilter);
    },
    [onSearch, matricFilter]
  );

  const handleMatricSearch = useCallback(
    (value: string) => {
      setMatricFilter(value);
      // Set column filter for matric_number column
      table.getColumn("matric_number")?.setFilterValue(value);
      // Also call the parent onSearch if provided for any external tracking
      onSearch?.(globalFilter, value);
    },
    [onSearch, globalFilter, table]
  );

  const handleClearFilters = useCallback(() => {
    setGlobalFilter("");
    setMatricFilter("");
    table.resetColumnFilters();
    table.resetGlobalFilter();
    onSearch?.("", "");
  }, [onSearch, table]);

  // Client-side pagination component
  const PaginationComponent = () => {
    const totalRows = table.getFilteredRowModel().rows.length;
    const currentPage = table.getState().pagination.pageIndex + 1;
    const pageSize = table.getState().pagination.pageSize;
    const totalPages = table.getPageCount();

    if (totalPages <= 1) return null;

    const startRow = (currentPage - 1) * pageSize + 1;
    const endRow = Math.min(currentPage * pageSize, totalRows);

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {startRow} to {endRow} of {totalRows} students
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
          >
            Previous
          </Button>
          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
              )
              .map((page, index, array) => (
                <div key={page} className="flex items-center">
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="px-2 text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => table.setPageIndex(page - 1)}
                    disabled={isLoading}
                    className="h-8 w-8 p-0"
                  >
                    {page}
                  </Button>
                </div>
              ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <StudentProfileModal
        studentId={selectedStudent?.id || ""}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedForAction?.first_name}{" "}
              {selectedForAction?.last_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Edit details for {selectedForAction?.first_name}{" "}
              {selectedForAction?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={editFormData.first_name || ""}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input
                  id="middle_name"
                  value={editFormData.middle_name || ""}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      middle_name: e.target.value,
                    }))
                  }
                  placeholder="Middle name (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={editFormData.last_name || ""}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={editFormData.email || ""}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="student@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_email">Parent Email *</Label>
                <Input
                  id="parent_email"
                  type="email"
                  value={editFormData.parent_email || ""}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      parent_email: e.target.value,
                    }))
                  }
                  placeholder="parent@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_phone">Parent Phone *</Label>
              <Input
                id="parent_phone"
                value={editFormData.parent_phone || ""}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    parent_phone: e.target.value,
                  }))
                }
                placeholder="Parent phone number"
              />
            </div>

            {/* Academic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={editFormData.department || ""}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }))
                  }
                  placeholder="Department"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level *</Label>
                <Select
                  value={editFormData.level?.toString() || ""}
                  onValueChange={(value) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      level: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level.id} value={level.code}>
                        {level.name} ({level.code}L)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={editFormData.gender || ""}
                  onValueChange={(value: "male" | "female") =>
                    setEditFormData((prev) => ({ ...prev, gender: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editFormData.status || "active"}
                onValueChange={(value: "active" | "inactive") =>
                  setEditFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive (Paused)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={
                isUpdating ||
                !editFormData.first_name ||
                !editFormData.last_name ||
                !editFormData.email
              }
            >
              {isUpdating ? "Updating..." : "Update Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Student Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {selectedForAction && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">
                  {selectedForAction.first_name} {selectedForAction.middle_name}{" "}
                  {selectedForAction.last_name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {selectedForAction.email}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Matric Number:</span>
                  <p>{selectedForAction.matric_number}</p>
                </div>
                <div>
                  <span className="font-medium">Level:</span>
                  <p>{selectedForAction.level} Level</p>
                </div>
                <div>
                  <span className="font-medium">Department:</span>
                  <p>{selectedForAction.department || "N/A"}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <p>
                    {selectedForAction.status === "inactive"
                      ? "Paused"
                      : selectedForAction.status}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Table Card */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Search Students
                </h3>
                {(globalFilter || matricFilter) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {table.getFilteredRowModel().rows.length} students found
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </div>

              {/* Search Inputs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    General Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, department..."
                      value={globalFilter}
                      onChange={(event) => handleSearch(event.target.value)}
                      className="pl-8"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="sm:w-64">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Matric Number
                  </label>
                  <Input
                    placeholder="Filter by matric number..."
                    value={matricFilter}
                    onChange={(event) => handleMatricSearch(event.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={memoizedColumns.length}
                        className="h-24 text-center"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                          Loading students...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={memoizedColumns.length}
                        className="h-24 text-center"
                      >
                        {globalFilter || matricFilter ? (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-muted-foreground">
                              No students match your search
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleClearFilters}
                            >
                              Clear filters
                            </Button>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">
                            No students found
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <PaginationComponent />
    </>
  );
}
