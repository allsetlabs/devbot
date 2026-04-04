import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { Button } from '@allsetlabs/reusable/components/ui/button';

export type ExportFormat = 'markdown' | 'json' | 'plaintext';

const FORMAT_LABELS: Record<ExportFormat, string> = {
  markdown: 'Markdown',
  json: 'JSON',
  plaintext: 'Plain Text',
};

interface ChatExportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFormat: ExportFormat;
  onExport: (format: ExportFormat) => void;
}

export function ChatExportDrawer({
  open,
  onOpenChange,
  selectedFormat,
  onExport,
}: ChatExportDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Export Format</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-2 px-4 pb-6">
          {(['markdown', 'json', 'plaintext'] as const).map((format) => (
            <Button
              key={format}
              variant="outline"
              onClick={() => onExport(format)}
              className={`h-auto w-full justify-start px-4 py-3 text-left ${
                selectedFormat === format ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <span className="text-sm font-medium text-foreground">{FORMAT_LABELS[format]}</span>
            </Button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
