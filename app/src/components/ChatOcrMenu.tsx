import { useRef, useState } from 'react';
import { ScanLine, Loader2 } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { toast } from 'sonner';
// Vite resolves this at build time to a local asset URL — avoids CDN dependency
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// File types handled as plain text (read directly, no library)
const PLAIN_TEXT_EXTS = new Set([
  '.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html', '.htm',
  '.js', '.ts', '.tsx', '.jsx', '.css', '.scss', '.yaml', '.yml',
  '.toml', '.ini', '.log', '.sh', '.py', '.rb', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.sql',
]);

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.tif']);

function extOf(file: File) {
  return file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
}

async function extractText(file: File): Promise<string> {
  const ext = extOf(file);

  // Plain text — read directly
  if (PLAIN_TEXT_EXTS.has(ext)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Images — Tesseract OCR
  if (IMAGE_EXTS.has(ext) || file.type.startsWith('image/')) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(objectUrl);
      await worker.terminate();
      return data.text;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  // PDF — pdfjs-dist (worker resolved locally by Vite, not CDN)
  if (ext === '.pdf' || file.type === 'application/pdf') {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
    GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
      );
    }
    return pages.join('\n');
  }

  // DOCX — mammoth
  if (ext === '.docx') {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  // XLSX / XLS — SheetJS
  if (ext === '.xlsx' || ext === '.xls' || ext === '.ods') {
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    return workbook.SheetNames.map((name) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
      return `[${name}]\n${csv}`;
    }).join('\n\n');
  }

  throw new Error(`Unsupported file type: ${ext || file.type}`);
}

const ACCEPT = [
  'image/*',
  '.pdf',
  '.docx',
  '.xlsx', '.xls', '.ods',
  '.txt', '.md', '.markdown', '.csv', '.json', '.xml',
  '.html', '.htm', '.yaml', '.yml', '.toml', '.ini',
  '.log', '.sh', '.py', '.rb', '.go', '.rs', '.java',
  '.js', '.ts', '.tsx', '.jsx', '.css', '.scss', '.sql',
].join(',');

interface ChatOcrMenuProps {
  disabled?: boolean;
  onOcrText: (text: string) => void;
}

export function ChatOcrMenu({ disabled, onOcrText }: ChatOcrMenuProps) {
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setProcessing(true);
    try {
      const text = await extractText(file);
      onOcrText(`\n\nOCR\n----\n${text.trim()}\n----`);
    } catch (err) {
      console.error('[OCR]', err);
      toast.error(err instanceof Error ? err.message : 'Text extraction failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        disabled={disabled || processing}
        title="Extract text from file"
        // onPointerDown avoids the iOS double-tap-to-focus issue
        onPointerDown={(e) => {
          e.preventDefault();
          inputRef.current?.click();
        }}
      >
        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}
