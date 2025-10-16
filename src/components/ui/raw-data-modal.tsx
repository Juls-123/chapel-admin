// src/components/ui/raw-data-modal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy } from "lucide-react";
import { useState } from "react";
import { ParsedRawData } from "@/lib/utils/parse-raw-data";

interface RawDataModalProps {
  data: ParsedRawData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RawDataModal({ data, isOpen, onClose }: RawDataModalProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (!data) return;

    const text = data.data
      .map(({ key, value }) => `${key}: ${value}`)
      .join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>{data.title}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              disabled={copied}
            >
              <Copy className="h-4 w-4 mr-2" />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {data.data.map(({ key, value }) => (
              <div key={key} className="space-y-1">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {key}
                </h4>
                <pre className="p-4 bg-muted/50 rounded-md text-sm overflow-x-auto">
                  {value}
                </pre>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
