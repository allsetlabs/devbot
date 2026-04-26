import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Copy, Check } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { toast } from 'sonner';
import { getOcrDocument, saveOcrText } from '../lib/api';
import { VITE_BACKEND_PORT } from '../lib/env';

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:${VITE_BACKEND_PORT}`;

function buildImageUrl(imagePath: string) {
  // Convert absolute filesystem path to a URL served by the backend
  // image_path = /some/dir/.tmp/ocr-uploads/{id}/filename.png
  const match = imagePath.match(/ocr-uploads\/(.+)$/);
  if (match) return `${BACKEND_URL}/ocr-uploads/${match[1]}`;
  return imagePath;
}

export function OcrView() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [ocrProgress, setOcrProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['ocr-document', docId],
    queryFn: () => getOcrDocument(docId!),
    enabled: !!docId,
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => saveOcrText(id, text),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ocr-documents'] });
      void queryClient.invalidateQueries({ queryKey: ['ocr-document', docId] });
    },
    onError: () => toast.error('Failed to save extracted text'),
  });

  const runOcr = async () => {
    if (!doc) return;
    setIsProcessing(true);
    setOcrProgress(0);

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round((m.progress ?? 0) * 100));
          }
        },
      });

      const imageUrl = buildImageUrl(doc.image_path);
      const { data } = await worker.recognize(imageUrl);
      await worker.terminate();

      saveMutation.mutate({ id: doc.id, text: data.text });
    } catch (err) {
      console.error('[OCR] Error:', err);
      toast.error('OCR processing failed');
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  // Auto-run OCR on first load when doc is pending
  useEffect(() => {
    if (doc && doc.status === 'pending' && !isProcessing) {
      void runOcr();
    }
  // Only trigger on initial doc load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, doc?.status]);

  const handleCopy = () => {
    if (!doc?.extracted_text) return;
    navigator.clipboard.writeText(doc.extracted_text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isLoading || !doc) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const imageUrl = buildImageUrl(doc.image_path);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ocr')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="max-w-[200px] truncate text-base font-semibold text-foreground">
            {doc.original_name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {doc.extracted_text && (
            <Button variant="ghost" size="icon" title="Copy text" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            title="Re-run OCR"
            disabled={isProcessing}
            onClick={() => void runOcr()}
          >
            <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Image preview */}
        <div className="border-b border-border bg-muted/30 p-4">
          <img
            src={imageUrl}
            alt={doc.original_name}
            className="mx-auto max-h-64 w-auto rounded-lg object-contain shadow-sm"
          />
        </div>

        {/* OCR progress */}
        {isProcessing && (
          <div className="border-b border-border px-4 py-3">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Extracting text…</span>
              <span>{ocrProgress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Extracted text */}
        <div className="p-4">
          {doc.extracted_text ? (
            <>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Extracted Text
              </p>
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-3 font-mono text-sm text-foreground">
                {doc.extracted_text}
              </pre>
              {doc.txt_path && (
                <p className="mt-2 truncate text-xs text-muted-foreground/60">
                  Saved: {doc.txt_path}
                </p>
              )}
            </>
          ) : !isProcessing ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">No text extracted yet</p>
              <Button onClick={() => void runOcr()} disabled={isProcessing}>
                <RefreshCw className="mr-1 h-4 w-4" />
                Extract Text
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
