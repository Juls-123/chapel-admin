import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { UIStateWrapper } from "./ui-states/UIStateWrapper";
import { useToast } from "@/hooks/use-toast";

interface StudentProfileModalProps {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentProfileModal({
  studentId,
  open,
  onOpenChange,
}: StudentProfileModalProps) {
  const { toast } = useToast();
  const {
    data: student,
    isLoading,
    error,
    refetch,
  } = useStudentProfile(studentId);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <UIStateWrapper
          isLoading={isLoading}
          error={error}
          data={student}
          emptyTitle="Student not found"
          emptyMessage="Could not load student information."
          onRetry={refetch}
        >
          {student && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback>
                      {student.first_name?.[0]}
                      {student.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-2xl">
                      {student.full_name ||
                        `${student.first_name} ${student.last_name}`}
                    </DialogTitle>
                    <DialogDescription>
                      {student.matric_number}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="h-[400px] pr-4">
                <div className="grid gap-4">
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">
                            Matric Number
                          </h4>
                          <p className="font-medium">{student.matric_number}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">
                            Level
                          </h4>
                          <p className="font-medium">
                            {student.level_name ||
                              `Level ${student.level}` ||
                              "N/A"}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">
                            Department
                          </h4>
                          <p className="font-medium">
                            {student.department || "N/A"}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">
                            Gender
                          </h4>
                          <p className="font-medium capitalize">
                            {student.gender?.toLowerCase() || "N/A"}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">
                            Status
                          </h4>
                          <p className="font-medium capitalize">
                            {student.status?.toLowerCase() || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                          Contact Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground">
                              Email
                            </h5>
                            <p className="text-sm">{student.email || "N/A"}</p>
                          </div>
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground">
                              Parent Email
                            </h5>
                            <p className="text-sm">
                              {student.parent_email || "N/A"}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground">
                              Parent Phone
                            </h5>
                            <p className="text-sm">
                              {student.parent_phone || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </div>
          )}
        </UIStateWrapper>
      </DialogContent>
    </Dialog>
  );
}
