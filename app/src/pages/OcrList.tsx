import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScanLine, Menu, Camera, Upload, Trash2, FileText } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { toast } from 'sonner';
import { useNav } from '../hooks/useNav';
import { listOcrDocuments, uploadOcrImage, deleteOcrDocument } from '../lib/api';
import { EmptyState } from '../components/EmptyState';
import type { OcrDocument } from '../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function OcrDocItem({
  doc,
  onSelect,
  onDelete,
}: {
  doc: OcrDocument;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <Button
      variant="ghost"
      className="h-auto w-full items-center gap-3 rounded-none border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
      onClick={onSelect}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{doc.original_name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {doc.status === 'completed' && doc.extracted_text
            ? doc.extracted_text.slice(0, 80).replace(/\s+/g, ' ').trim() + (doc.extracted_text.length > 80 ? '…' : '')
            : doc.status === 'pending'
              ? 'Not yet processed'
              : doc.status === 'processing'
                ? 'Processing…'
                : 'Failed'}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">{formatDate(doc.created_at)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </Button>
  );
}

export function OcrList() {
  const navigate = useNavigate();
  const { openNav } = useNav();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['ocr-documents'],
    queryFn: listOcrDocuments,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOcrDocument,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ocr-documents'] });
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const handleFileSelected = async (file: File | null | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { doc } = await uploadOcrImage(file);
      void queryClient.invalidateQueries({ queryKey: ['ocr-documents'] });
      navigate(`/ocr/${doc.id}`);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={openNav}>
            <Menu className="h-5 w-5" />
          </Button>
          <ScanLine className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">OCR</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            title="Upload image file"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-5 w-5" />
          </Button>
          <Button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="mr-1 h-4 w-4" />
            {uploading ? 'Uploading…' : 'Capture'}
          </Button>
        </div>
      </header>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFileSelected(e.target.files?.[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFileSelected(e.target.files?.[0])}
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Loading…</p>
          </div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={<ScanLine className="h-16 w-16 text-muted-foreground/50" />}
            title="No scanned documents"
            description="Capture an image or upload a file to extract text"
            actionLabel={uploading ? 'Uploading…' : 'Capture Image'}
            onAction={() => cameraInputRef.current?.click()}
            actionDisabled={uploading}
          />
        ) : (
          docs.map((doc) => (
            <OcrDocItem
              key={doc.id}
              doc={doc}
              onSelect={() => navigate(`/ocr/${doc.id}`)}
              onDelete={(e) => handleDelete(e, doc.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
