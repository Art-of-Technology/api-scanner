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
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);
  const [endpoints, setEndpoints] = useState<any[]>([]);

  // Auto-select first endpoint
  useEffect(() => {
    if (endpoints.length > 0 && !selectedEndpoint) {
      setSelectedEndpoint(endpoints[0]);
    }
  }, [endpoints, selectedEndpoint]);

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
        
        // Extract endpoints from parsed content
        if (parsed && parsed.endpoints && Array.isArray(parsed.endpoints)) {
          setEndpoints(parsed.endpoints);
        } else if (parsed && (parsed.method || parsed.url || parsed.path)) {
          setEndpoints([parsed]);
        } else {
          setEndpoints([]);
        }
      } catch (error) {
        setParsedContent(null);
        setEndpoints([]);
      }
    } else {
      setParsedContent(null);
      setEndpoints([]);
    }
  }, [fileContent]);


  const loadFileTree = async () => {
    try {
      // Directly load from main JSON file (no API routes needed)
      const response = await fetch('/api-documentation.json');
      if (response.ok) {
        const content = await response.text();
        const parsed = JSON.parse(content);
        
        if (parsed && parsed.endpoints && Array.isArray(parsed.endpoints)) {
          // Create virtual file tree from JSON endpoints
          const virtualTree = createVirtualFileTree(parsed.endpoints);
          setFileTree(virtualTree);
          return;
        }
      }
      
      // Fallback: create empty tree
      setFileTree([]);
    } catch (error) {
      console.error('Failed to load file tree:', error);
      setFileTree([]);
    }
  };

  const createVirtualFileTree = (endpoints: any[]): FileNode[] => {
    const tree: FileNode[] = [];
    const categories: { [key: string]: any[] } = {};
    
    // Group endpoints by category (extract from URL)
    endpoints.forEach(endpoint => {
      const category = extractCategoryFromUrl(endpoint.url || endpoint.path || '');
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(endpoint);
    });
    
    // Create category folders
    Object.keys(categories).forEach(category => {
      const categoryEndpoints = categories[category];
      const children: FileNode[] = [];
      
      categoryEndpoints.forEach((endpoint, index) => {
        const method = endpoint.method || 'GET';
        const url = endpoint.url || endpoint.path || 'unknown';
        const filename = `${method.toLowerCase()}--${url.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
        
        children.push({
          name: filename,
          path: `${category}/${filename}`,
          type: 'file',
          content: JSON.stringify(endpoint, null, 2)
        });
      });
      
      tree.push({
        name: category,
        path: category,
        type: 'folder',
        children
      });
    });
    
    return tree;
  };

  const extractCategoryFromUrl = (url: string): string => {
    if (!url) return 'general';
    
    // Remove leading slash and split by slash
    const pathParts = url.replace(/^\//, '').split('/');
    
    // Get the first meaningful part after 'api'
    if (pathParts[0] === 'api' && pathParts.length > 1) {
      return pathParts[1]; // e.g., /api/posts -> posts
    }
    
    // If no 'api' prefix, use first part
    if (pathParts.length > 0) {
      return pathParts[0];
    }
    
    return 'general';
  };

  const loadFileContent = async (filePath: string) => {
    try {
      // First check if it's a virtual file (from our virtual tree)
      const virtualFile = findVirtualFile(fileTree, filePath);
      if (virtualFile && virtualFile.content) {
        // Parse the full content for endpoint details
        const fullEndpoint = JSON.parse(virtualFile.content);
        
        // Create clean version for JSON editor (only essential fields)
        const cleanEndpoint = {
          method: fullEndpoint.method,
          url: fullEndpoint.url || fullEndpoint.path,
          file: fullEndpoint.file,
          title: fullEndpoint.title,
          description: fullEndpoint.description,
          parameters: fullEndpoint.parameters || [],
          responses: fullEndpoint.responses || {},
          requestHeaders: fullEndpoint.requestHeaders || [],
          tags: fullEndpoint.tags || [],
          summary: fullEndpoint.summary
        };
        
        setFileContent(JSON.stringify(cleanEndpoint, null, 2));
        
        // Set the FULL endpoint for details panel
        setSelectedEndpoint(fullEndpoint);
        setSelectedFile(filePath);
        return;
      }
      
      // If virtual file not found, show error
      throw new Error(`File not found: ${filePath}`);
    } catch (error) {
      console.error('Failed to load file content:', error);
      setToast({ message: `Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
    }
  };

  const findVirtualFile = (nodes: FileNode[], targetPath: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === targetPath && node.type === 'file') {
        return node;
      }
      if (node.children) {
        const found = findVirtualFile(node.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    
    try {
      // For virtual files, we can't actually save individual files
      // This is a limitation of the virtual file system
      setToast({ message: 'Virtual files cannot be saved individually. Use the main JSON file for persistence.', type: 'error' });
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

  const handleEndpointSelect = (endpoint: any) => {
    setSelectedEndpoint(endpoint);
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
                        scrollBeyondLastLine: false,
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
                          verticalScrollbarSize: 6,
                          horizontalScrollbarSize: 6
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
                        wordBasedSuggestions: 'off',
                        theme: 'vs-dark'
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

          {/* Right Panel - Endpoint Details */}
          <div className="w-96 flex-shrink-0">
            <Card className="w-full h-full flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Endpoint Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex-1 overflow-y-auto">
                {selectedFile && endpoints.length > 0 ? (
                  <div className="space-y-4">
                    
                    {/* Endpoint List */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Available Endpoints</h3>
                      {endpoints.map((endpoint, index) => (
                        <div
                          key={index}
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedEndpoint === endpoint 
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleEndpointSelect(endpoint)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {renderMethodBadge(endpoint.method || 'GET')}
                            <span className="font-mono text-sm truncate">{endpoint.url || endpoint.path || 'N/A'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {endpoint.title || endpoint.description || 'No description'}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Selected Endpoint Details */}
                    {selectedEndpoint && (
                      <div className="space-y-4">
                        <div className="p-4 border rounded bg-muted/30">
                          <h3 className="font-semibold mb-3 text-sm">Selected Endpoint</h3>
                          
                          {/* Tab Structure */}
                          <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 mb-4">
                              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                              <TabsTrigger value="request" className="text-xs">Request</TabsTrigger>
                              <TabsTrigger value="response" className="text-xs">Response</TabsTrigger>
                              <TabsTrigger value="examples" className="text-xs">Examples</TabsTrigger>
                            </TabsList>
                            
                            {/* Overview Tab */}
                            <TabsContent value="overview" className="space-y-3">
                              <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Method:</span>
                              {renderMethodBadge(selectedEndpoint.method || 'GET')}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">URL:</span>
                              <span className="font-mono">{selectedEndpoint.url || selectedEndpoint.path || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Title:</span>
                              <span>{selectedEndpoint.title || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Description:</span>
                              <span>{selectedEndpoint.description || 'N/A'}</span>
                            </div>
                              </div>
                            </TabsContent>
                            
         {/* Request Tab */}
         <TabsContent value="request" className="space-y-3">
           <div className="space-y-3 text-xs">
             
             <div>
               <h4 className="font-medium mb-2">Parameters</h4>
               {selectedEndpoint.parameters && Array.isArray(selectedEndpoint.parameters) && selectedEndpoint.parameters.length > 0 ? (
                 <div className="space-y-2">
                   {selectedEndpoint.parameters.map((param: any, index: number) => (
                     <div key={index} className="p-2 border rounded bg-muted/50">
                       <div className="flex items-center gap-2 mb-1">
                         <span className="font-mono text-xs">{param.name}</span>
                         <Badge variant="outline" className="text-xs">{param.type || 'string'}</Badge>
                         {param.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                       </div>
                       <p className="text-muted-foreground">{param.description || 'No description'}</p>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="p-2 border rounded bg-muted/50">
                   <p className="text-muted-foreground text-sm">
                     {selectedEndpoint.parameters ? 
                       (Array.isArray(selectedEndpoint.parameters) ? 
                         'No parameters defined (empty array)' : 
                         'Parameters data exists but not in array format') : 
                       'No parameters defined'}
                   </p>
                   {selectedEndpoint.parameters && !Array.isArray(selectedEndpoint.parameters) && (
                     <div className="mt-2">
                       <span className="text-xs font-medium">Raw data:</span>
                       <pre className="text-xs mt-1 p-2 bg-background border rounded overflow-x-auto">
                         {JSON.stringify(selectedEndpoint.parameters, null, 2)}
                       </pre>
                     </div>
                   )}
                 </div>
               )}
             </div>
                                
             
             <div>
               <h4 className="font-medium mb-2">Request Body</h4>
               {selectedEndpoint.requestBody ? (
                 <div className="p-2 border rounded bg-muted/50">
                   <div className="flex items-center gap-2 mb-1">
                     <span className="text-muted-foreground">Type:</span>
                     <Badge variant="outline" className="text-xs">{selectedEndpoint.requestBody.type || 'application/json'}</Badge>
                   </div>
                   <p className="text-muted-foreground">{selectedEndpoint.requestBody.description || 'No description'}</p>
                 </div>
               ) : (
                 <p className="text-muted-foreground">No request body defined</p>
               )}
             </div>
                                
             
             <div>
               <h4 className="font-medium mb-2">Headers</h4>
               {selectedEndpoint.requestHeaders && Array.isArray(selectedEndpoint.requestHeaders) && selectedEndpoint.requestHeaders.length > 0 ? (
                 <div className="space-y-1">
                   {selectedEndpoint.requestHeaders.map((header: any, index: number) => (
                     <div key={index} className="flex items-center gap-2 p-1 border rounded">
                       <span className="font-mono text-xs">{header.name}</span>
                       <span className="text-muted-foreground text-xs">{header.description || 'No description'}</span>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="p-2 border rounded bg-muted/50">
                   <p className="text-muted-foreground text-sm">
                     {selectedEndpoint.requestHeaders ? 
                       (Array.isArray(selectedEndpoint.requestHeaders) ? 
                         'No headers defined (empty array)' : 
                         'Headers data exists but not in array format') : 
                       'No headers defined'}
                   </p>
                   {selectedEndpoint.requestHeaders && !Array.isArray(selectedEndpoint.requestHeaders) && (
                     <div className="mt-2">
                       <span className="text-xs font-medium">Raw data:</span>
                       <pre className="text-xs mt-1 p-2 bg-background border rounded overflow-x-auto">
                         {JSON.stringify(selectedEndpoint.requestHeaders, null, 2)}
                       </pre>
                     </div>
                   )}
                 </div>
               )}
             </div>
                              </div>
                            </TabsContent>
                            
         {/* Response Tab */}
         <TabsContent value="response" className="space-y-3">
           <div className="space-y-3 text-xs">
             <div>
               <h4 className="font-medium mb-2">Response Codes</h4>
               {selectedEndpoint.responses && Object.keys(selectedEndpoint.responses).length > 0 ? (
                 <div className="space-y-2">
                   {Object.entries(selectedEndpoint.responses).map(([code, response]: [string, any]) => (
                     <div key={code} className="p-2 border rounded bg-muted/50">
                       <div className="flex items-center gap-2 mb-1">
                         <Badge variant={code.startsWith('2') ? "default" : code.startsWith('4') ? "destructive" : "secondary"} className="text-xs">
                           {code}
                         </Badge>
                         <span className="font-medium">{response.description || 'No description'}</span>
                       </div>
                       {response.example && (
                         <div className="mt-2">
                           <span className="text-muted-foreground text-xs">Example:</span>
                           <div className="mt-1 p-2 bg-background border rounded">
                             <pre className="text-xs overflow-x-auto">
                               {JSON.stringify(response.example, null, 2)}
                             </pre>
                           </div>
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-muted-foreground">No response information available</p>
               )}
             </div>
             
             {selectedEndpoint.errorHandling && (
               <div>
                 <h4 className="font-medium mb-2">Error Responses</h4>
                 <div className="space-y-2">
                   {selectedEndpoint.errorHandling.commonErrors && selectedEndpoint.errorHandling.commonErrors.map((error: any, index: number) => (
                     <div key={index} className="p-2 border rounded bg-muted/50">
                       <div className="flex items-center gap-2 mb-1">
                         <Badge variant={error.statusCode.startsWith('4') ? "destructive" : error.statusCode.startsWith('5') ? "secondary" : "default"} className="text-xs">
                           {error.statusCode}
                         </Badge>
                         <span className="font-medium">{error.description}</span>
                       </div>
                       {error.handling && (
                         <div className="mt-2">
                           <span className="text-muted-foreground text-xs">Handling:</span>
                           <p className="text-xs mt-1">{error.handling}</p>
                         </div>
                       )}
                       {error.example && (
                         <div className="mt-2">
                           <span className="text-muted-foreground text-xs">Example:</span>
                           <div className="mt-1 p-2 bg-background border rounded">
                             <pre className="text-xs overflow-x-auto">
                               {JSON.stringify(error.example, null, 2)}
                             </pre>
                           </div>
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             )}
             
             {selectedEndpoint.responseSchema && (
               <div>
                 <h4 className="font-medium mb-2">Response Schema</h4>
                 <div className="p-2 border rounded bg-muted/50">
                   <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                     {JSON.stringify(selectedEndpoint.responseSchema, null, 2)}
                   </pre>
                 </div>
               </div>
             )}
                              </div>
                            </TabsContent>
                            
         {/* Examples Tab */}
         <TabsContent value="examples" className="space-y-3">
           <div className="space-y-3 text-xs">
             {selectedEndpoint.codeExamples && (Array.isArray(selectedEndpoint.codeExamples) ? selectedEndpoint.codeExamples.length > 0 : Object.keys(selectedEndpoint.codeExamples).length > 0) ? (
                                  <div>
                                    <h4 className="font-medium mb-2">Code Examples</h4>
                                    <div className="space-y-2">
                                      {Array.isArray(selectedEndpoint.codeExamples) ? selectedEndpoint.codeExamples.map((example: any, index: number) => (
                                        <div key={index} className="border rounded">
                                          <div className="p-2 border-b bg-muted/50">
                                            <span className="font-medium text-xs">{example.language || 'Code'}</span>
                                          </div>
                                          <div className="p-2">
                                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap bg-background border rounded p-2">
                                              {example.code || 'No code available'}
                                            </pre>
                                          </div>
                                        </div>
                                      )) : (
                                        <div className="border rounded">
                                          <div className="p-2 border-b bg-muted/50">
                                            <span className="font-medium text-xs">{selectedEndpoint.codeExamples.language || 'Code'}</span>
                                          </div>
                                          <div className="p-2">
                                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap bg-background border rounded p-2">
                                              {selectedEndpoint.codeExamples.example || selectedEndpoint.codeExamples.code || 'No code available'}
                                            </pre>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground">No code examples available</p>
                                )}
                                
                                
             
             <div>
               <h4 className="font-medium mb-2">Rate Limiting</h4>
               {selectedEndpoint.rateLimiting ? (
                 <div className="p-2 border rounded bg-muted/50">
                   <p className="text-sm">{selectedEndpoint.rateLimiting.description || 'Rate limiting information available'}</p>
                   
                   {selectedEndpoint.rateLimiting.enabled !== undefined && (
                     <div className="mt-2">
                       <span className="font-medium text-xs">Enabled:</span>
                       <span className="ml-2 text-xs">{selectedEndpoint.rateLimiting.enabled ? 'Yes' : 'No'}</span>
                     </div>
                   )}
                   
                   {selectedEndpoint.rateLimiting.limits && (
                     <div className="mt-2">
                       <span className="font-medium text-xs">Limits:</span>
                       <div className="mt-1 text-xs">
                         <pre className="text-xs overflow-x-auto">
                           {JSON.stringify(selectedEndpoint.rateLimiting.limits, null, 2)}
                         </pre>
                       </div>
                     </div>
                   )}
                   
                   {selectedEndpoint.rateLimiting.headers && (
                     <div className="mt-2">
                       <span className="font-medium text-xs">Headers:</span>
                       <div className="mt-1 text-xs">
                         <pre className="text-xs overflow-x-auto">
                           {JSON.stringify(selectedEndpoint.rateLimiting.headers, null, 2)}
                         </pre>
                       </div>
                     </div>
                   )}
                   
                   {selectedEndpoint.rateLimiting.handling && (
                     <div className="mt-2">
                       <span className="font-medium text-xs">Handling:</span>
                       <div className="mt-1 text-xs">
                         <pre className="text-xs overflow-x-auto">
                           {JSON.stringify(selectedEndpoint.rateLimiting.handling, null, 2)}
                         </pre>
                       </div>
                     </div>
                   )}
                 </div>
               ) : (
                 <p className="text-muted-foreground">No rate limiting information</p>
               )}
             </div>
                                
             
             <div>
               <h4 className="font-medium mb-2">Pagination</h4>
               {selectedEndpoint.pagination ? (
                 <div className="p-2 border rounded bg-muted/50">
                   <p className="text-sm">{selectedEndpoint.pagination.description || 'Pagination information available'}</p>
                   
                   {selectedEndpoint.pagination.supported !== undefined && (
                     <div className="mt-2">
                       <span className="font-medium text-xs">Supported:</span>
                       <span className="ml-2 text-xs">{selectedEndpoint.pagination.supported ? 'Yes' : 'No'}</span>
                     </div>
                   )}
                   
                   {selectedEndpoint.pagination.parameters && (
                     <div className="mt-2">
                       <span className="font-medium text-xs">Parameters:</span>
                       <div className="mt-1 text-xs">
                         <pre className="text-xs overflow-x-auto">
                           {JSON.stringify(selectedEndpoint.pagination.parameters, null, 2)}
                         </pre>
                       </div>
                     </div>
                   )}
                   
                   {selectedEndpoint.pagination.response && (
                     <div className="mt-2">
                       <span className="font-medium text-xs">Response:</span>
                       <div className="mt-1 text-xs">
                         <pre className="text-xs overflow-x-auto">
                           {JSON.stringify(selectedEndpoint.pagination.response, null, 2)}
                         </pre>
                       </div>
                     </div>
                   )}
                   
                   {selectedEndpoint.pagination.example && (
                     <div className="mt-2">
                       <span className="font-medium text-xs">Example:</span>
                       <div className="mt-1 text-xs">
                         <pre className="text-xs overflow-x-auto">
                           {JSON.stringify(selectedEndpoint.pagination.example, null, 2)}
                         </pre>
                       </div>
                     </div>
                   )}
                 </div>
               ) : (
                 <p className="text-muted-foreground">No pagination information</p>
               )}
             </div>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </div>
                    )}
                  </div>
                  ) : (
                    <div className="h-full flex items-start justify-center text-muted-foreground pt-8">
                      <div className="text-center">
                        <div className="text-4xl mb-4">👁️</div>
                        <h3 className="text-lg font-semibold mb-2">Endpoint details will appear here</h3>
                        <p>Select a file with endpoints to see details</p>
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
