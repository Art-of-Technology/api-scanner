'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { SearchInput } from './SearchInput';
import { StatsCards } from './StatsCards';
import { Editor } from '@monaco-editor/react';
import { 
  Folder, 
  FileText, 
  Save, 
  RefreshCw, 
  Search,
  ChevronRight,
  ChevronDown,
  Activity,
  FolderOpen,
  Tag,
  Calendar
} from 'lucide-react';
import { cn } from './lib/utils';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
}

interface EditInterfaceProps {
  className?: string;
}

export function EditInterface({ className }: EditInterfaceProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [parsedContent, setParsedContent] = useState<any>(null);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState<string>('');

  // Load file tree
  useEffect(() => {
    loadFileTree();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, fileContent]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Parse JSON content when file content changes
  useEffect(() => {
    if (fileContent) {
      try {
        const parsed = JSON.parse(fileContent);
        setParsedContent(parsed);
      } catch (error) {
        setParsedContent(null);
      }
    } else {
      setParsedContent(null);
    }
  }, [fileContent]);

  // Auto-save functionality
  useEffect(() => {
    if (selectedFile && fileContent) {
      // Clear existing timeout
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }

      // Set new timeout for auto-save (5 seconds delay)
      const timeout = setTimeout(() => {
        autoSave();
      }, 5000);

      setAutoSaveTimeout(timeout);

      // Cleanup timeout on unmount
      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }
  }, [fileContent, selectedFile]);

  const autoSave = async () => {
    if (!selectedFile) return;

    // Only save if content has actually changed
    if (fileContent === lastSavedContent) {
      return;
    }

    try {
      const cleanPath = selectedFile.startsWith('/') ? selectedFile.slice(1) : selectedFile;
      const response = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: cleanPath, content: fileContent })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Auto-save failed: ${errorData.error || response.statusText}`);
      }

      // Update last saved content and show toast only if there was a change
      setLastSavedContent(fileContent);
      setToast({ message: 'Auto-saved', type: 'success' });
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Don't show error toast for auto-save failures to avoid spam
    }
  };

  const loadFileTree = async () => {
    try {
      const response = await fetch('/api/files');
      if (!response.ok) {
        throw new Error('Failed to load files');
      }
      const files = await response.json();
      setFileTree(files);
    } catch (error) {
      console.error('Failed to load file tree:', error);
    }
  };

  const loadFileContent = async (filePath: string) => {
    try {
      const response = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to load file: ${errorData.error || response.statusText}`);
      }
      const data = await response.json();
      setFileContent(data.content);
      setLastSavedContent(data.content);
      setSelectedFile(filePath);
    } catch (error) {
      console.error('Failed to load file content:', error);
      setToast({ message: `Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    
    try {
      // Remove leading slash if present
      const cleanPath = selectedFile.startsWith('/') ? selectedFile.slice(1) : selectedFile;
      const response = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: cleanPath, content: fileContent })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to save file: ${errorData.error || response.statusText}`);
      }
      
      setLastSavedContent(fileContent);
      setToast({ message: 'File saved successfully!', type: 'success' });
    } catch (error) {
      console.error('Failed to save file:', error);
      setToast({ message: `Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
    }
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const getMethodColor = (method: string): "get" | "post" | "put" | "delete" | "patch" | "head" | "options" => {
    return method.toLowerCase() as "get" | "post" | "put" | "delete" | "patch" | "head" | "options";
  };

  const renderMethodBadge = (method: string) => {
    const methodColor = getMethodColor(method);
    return (
      <Badge 
        variant={methodColor}
        className="text-xs font-mono"
      >
        {method}
      </Badge>
    );
  };

  // Filter file tree based on search query
  const filterFileTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query.trim()) return nodes;
    
    const filtered: FileNode[] = [];
    
    for (const node of nodes) {
      if (node.type === 'file') {
        // Check if file name or path matches search query
        if (node.name.toLowerCase().includes(query.toLowerCase()) || 
            node.path.toLowerCase().includes(query.toLowerCase())) {
          filtered.push(node);
        }
      } else if (node.type === 'folder') {
        // Recursively filter children
        const filteredChildren = filterFileTree(node.children || [], query);
        if (filteredChildren.length > 0) {
          filtered.push({
            ...node,
            children: filteredChildren
          });
        }
      }
    }
    
    return filtered;
  };

  const renderFileNode = (node: FileNode, level = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;

    if (node.type === 'folder') {
      return (
        <Collapsible
          key={node.path}
          open={isExpanded}
          onOpenChange={() => toggleFolder(node.path)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-2 h-auto font-medium hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span className="capitalize">{node.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {node.children?.length || 0}
                </Badge>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            <div className="ml-6 space-y-1">
              {node.children?.map(child => renderFileNode(child, level + 1))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Button
        key={node.path}
        variant="ghost"
        onClick={() => loadFileContent(node.path)}
        className={cn(
          "w-full justify-start p-2 h-auto text-left hover:bg-accent",
          isSelected && "bg-accent"
        )}
      >
        <div className="flex items-center gap-3 w-full min-w-0">
          <FileText className="h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium truncate" title={node.name}>
                {node.name}
              </div>
              {node.name.includes('--') && (
                <div className="flex-shrink-0">
                  {(() => {
                    const methodMatch = node.name.match(/^(get|post|put|delete|patch|head|options)--/i);
                    if (methodMatch) {
                      return renderMethodBadge(methodMatch[1].toUpperCase());
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono truncate" title={node.path}>
              {node.path}
            </div>
          </div>
        </div>
      </Button>
    );
  };

  // Calculate statistics for stats cards
  const stats = {
    totalEndpoints: fileTree.reduce((count, node) => {
      if (node.type === 'file') return count + 1;
      if (node.children) {
        return count + node.children.filter(child => child.type === 'file').length;
      }
      return count;
    }, 0),
    totalCategories: fileTree.filter(node => node.type === 'folder').length,
    version: 'v1.0.0',
    generatedAt: new Date().toISOString()
  };

  return (
    <div 
      className={cn('api-documentation w-full h-screen overflow-y-auto', className)} 
      data-theme="system"
      style={{ height: '100vh', overflowY: 'auto' }}
    >
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">API Documentation Editor</h1>
              <p className="text-muted-foreground mt-2">Edit and manage your API endpoint definitions</p>
            </div>
            <div className="w-full lg:w-80">
              <SearchInput
                onSearch={setSearchQuery}
                placeholder="Search files..."
              />
            </div>
          </div>
        </div>

        {/* Statistics Cards - Smaller */}
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Files</p>
                    <p className="text-lg font-bold">{stats.totalEndpoints}</p>
                  </div>
                  <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-950/30">
                    <FileText className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Folders</p>
                    <p className="text-lg font-bold">{stats.totalCategories}</p>
                  </div>
                  <div className="p-2 rounded-full bg-green-50 dark:bg-green-950/30">
                    <Folder className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Version</p>
                    <Badge variant="outline" className="text-xs font-medium">
                      {stats.version}
                    </Badge>
                  </div>
                  <div className="p-2 rounded-full bg-orange-50 dark:bg-orange-950/30 flex-shrink-0 ml-2">
                    <Tag className="h-4 w-4 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Updated</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                  <div className="p-2 rounded-full bg-purple-50 dark:bg-purple-950/30">
                    <Calendar className="h-4 w-4 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content - Vertical 3 Column Layout */}
        <div className="flex gap-6 h-[600px]">
          {/* Left Panel - File Tree */}
          <div className="w-80 flex-shrink-0">
            <Card className="w-full h-full flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Files
                </CardTitle>
                {searchQuery && (
                  <p className="text-sm text-muted-foreground">
                    Showing {filterFileTree(fileTree, searchQuery).length} result{filterFileTree(fileTree, searchQuery).length !== 1 ? 's' : ''}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0 flex-1 overflow-y-auto">
                <div className="space-y-2">
                  {filterFileTree(fileTree, searchQuery).map(node => renderFileNode(node))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Panel - JSON Editor */}
          <div className="flex-1">
            <Card className="w-full h-full flex flex-col">
              <CardHeader className="border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 flex-shrink-0" />
                    <span className="text-lg font-semibold truncate">
                      {selectedFile ? selectedFile.split('/').pop() : 'Select a file'}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveFile}
                      disabled={!selectedFile}
                      className="text-xs"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedFile && loadFileContent(selectedFile)}
                      disabled={!selectedFile}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reload
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-6 overflow-hidden">
                {selectedFile ? (
                  <div className="h-full border rounded overflow-hidden">
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      value={fileContent}
                      onChange={(value) => setFileContent(value || '')}
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: true,
                        fontSize: 14,
                        lineNumbers: 'on',
                        wordWrap: 'on',
                        automaticLayout: true,
                        tabSize: 2,
                        insertSpaces: true,
                        formatOnPaste: false,
                        formatOnType: false,
                        bracketPairColorization: { enabled: false },
                        scrollbar: {
                          vertical: 'auto',
                          horizontal: 'auto',
                          verticalScrollbarSize: 8,
                          horizontalScrollbarSize: 8
                        },
                        guides: {
                          indentation: false,
                          bracketPairs: false
                        },
                        suggest: {
                          showKeywords: false,
                          showSnippets: false
                        },
                        quickSuggestions: false,
                        parameterHints: { enabled: false },
                        hover: { enabled: false },
                        contextmenu: false,
                        folding: false,
                        renderWhitespace: 'none',
                        renderLineHighlight: 'none',
                        occurrencesHighlight: 'off',
                        selectionHighlight: false,
                        codeLens: false,
                        links: false,
                        colorDecorators: false,
                        find: { addExtraSpaceOnTop: false },
                        suggestOnTriggerCharacters: false,
                        acceptSuggestionOnEnter: 'off',
                        tabCompletion: 'off',
                        wordBasedSuggestions: 'off'
                      }}
                      theme="vs-dark"
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-start justify-center text-muted-foreground pt-8">
                    <div className="text-center">
                      <div className="text-4xl mb-4">📄</div>
                      <h3 className="text-lg font-semibold mb-2">Select a file to edit</h3>
                      <p>Choose a JSON file from the sidebar to start editing</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="w-80 flex-shrink-0">
            <Card className="w-full h-full flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex-1 overflow-y-auto">
                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="p-4 border rounded bg-muted/30">
                      <h3 className="font-semibold mb-2 text-sm">File Info</h3>
                      <div className="space-y-1 text-xs">
                        <div><strong>Description:</strong> {parsedContent?.description || 'No description'}</div>
                        <div><strong>Size:</strong> {fileContent.length} characters</div>
                        <div><strong>Type:</strong> JSON</div>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded bg-muted/30">
                      <h3 className="font-semibold mb-2 text-sm">JSON Structure</h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Method:</span>
                          {parsedContent?.method ? renderMethodBadge(parsedContent.method) : <Badge variant="outline">N/A</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">id</Badge>
                          <Badge variant="outline" className="text-xs">url</Badge>
                          <Badge variant="outline" className="text-xs">title</Badge>
                          <Badge variant="outline" className="text-xs">description</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  ) : (
                    <div className="h-full flex items-start justify-center text-muted-foreground pt-8">
                      <div className="text-center">
                        <div className="text-4xl mb-4">👁️</div>
                        <h3 className="text-lg font-semibold mb-2">Preview will appear here</h3>
                        <p>Select a file to see its preview</p>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-4 right-4 z-50">
            <div className={cn(
              "px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 max-w-sm",
              toast.type === 'success' 
                ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                toast.type === 'success' ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
