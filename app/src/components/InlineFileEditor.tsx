import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  X,
  Pencil,
  Save,
  Loader2,
  FileText,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import { api } from '../lib/api';

interface InlineFileEditorProps {
  filePath: string;
  workingDir?: string;
  onClose: () => void;
}

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  md: 'markdown',
  py: 'python',
  rs: 'rust',
  go: 'go',
  css: 'css',
  scss: 'scss',
  html: 'html',
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
  graphql: 'graphql',
  xml: 'xml',
  toml: 'toml',
  dockerfile: 'docker',
  makefile: 'makefile',
};

function getLanguage(filePath: string): string {
  const name = filePath.split('/').pop()?.toLowerCase() || '';
  if (name === 'dockerfile') return 'docker';
  if (name === 'makefile') return 'makefile';
  const ext = name.split('.').pop() || '';
  return EXT_TO_LANG[ext] || 'text';
}

export function InlineFileEditor({ filePath, workingDir, onClose }: InlineFileEditorProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['file-content', filePath, workingDir],
    queryFn: () => api.readFile(filePath, workingDir),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.writeFile(filePath, editContent, workingDir),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-content', filePath, workingDir] });
      setEditing(false);
    },
  });

  const startEditing = useCallback(() => {
    if (data) {
      setEditContent(data.content);
      setEditing(true);
    }
  }, [data]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setEditContent('');
  }, []);

  const handleCopy = useCallback(async () => {
    if (data) {
      await navigator.clipboard.writeText(data.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [data]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  const fileName = filePath.split('/').pop() || filePath;
  const language = getLanguage(filePath);

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
          {filePath}
        </span>
        <div className="flex items-center gap-1">
          {!editing && data && (
            <>
              <Button variant="ghost" size="icon-sm" onClick={handleCopy} title="Copy contents">
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={startEditing} title="Edit file">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {editing && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={cancelEditing}
                title="Cancel editing"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                title="Save file"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 text-green-500" />
                )}
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onClose} title="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="px-4 py-4 text-sm text-destructive">
            {(error as Error).message || 'Failed to load file'}
          </div>
        ) : editing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full resize-none bg-[#282c34] p-4 font-mono text-xs leading-relaxed text-[#abb2bf] outline-none"
            style={{ minHeight: '200px', height: `${Math.min(320, Math.max(200, editContent.split('\n').length * 18))}px` }}
            spellCheck={false}
          />
        ) : (
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            showLineNumbers
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: '0.75rem',
              lineHeight: '1.5',
            }}
            lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#636d83' }}
          >
            {data?.content || `// ${fileName} is empty`}
          </SyntaxHighlighter>
        )}
      </div>

      {/* Save error */}
      {saveMutation.isError && (
        <div className="border-t border-border bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          Save failed: {(saveMutation.error as Error).message || 'Unknown error'}
        </div>
      )}

      {/* Footer info */}
      {data && !editing && (
        <div className="border-t border-border px-3 py-1 text-xs text-muted-foreground">
          {data.content.split('\n').length} lines · {(data.size / 1024).toFixed(1)} KB · {language}
        </div>
      )}
    </div>
  );
}
