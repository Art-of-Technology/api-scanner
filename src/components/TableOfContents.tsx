import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Folder, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { TableOfContentsProps, ApiEndpoint } from './types';
import { cn } from './lib/utils';

interface GroupedEndpoints {
  [category: string]: { endpoint: ApiEndpoint; index: number }[];
}

export function TableOfContents({ 
  endpoints, 
  onEndpointSelect, 
  searchQuery,
  defaultExpanded = false
}: TableOfContentsProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    defaultExpanded ? new Set(['all']) : new Set()
  );

  // Group endpoints by category (extracted from URL path)
  const groupedEndpoints = useMemo(() => {
    const grouped: GroupedEndpoints = {};
    
    endpoints.forEach((endpoint, originalIndex) => {
      // Extract category from URL path (e.g., /api/users -> users)
      const urlPath = endpoint.url || '';
      const pathParts = urlPath.split('/');
      const category = pathParts[2] || 'General';
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      
      // Find the original index in the full endpoints array
      const globalIndex = originalIndex; // This should be the global index
      grouped[category].push({ endpoint, index: globalIndex });
    });
    
    return grouped;
  }, [endpoints]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getMethodColor = (method: string): "get" | "post" | "put" | "delete" | "patch" | "head" | "options" => {
    return method.toLowerCase() as "get" | "post" | "put" | "delete" | "patch" | "head" | "options";
  };

  const getEndpointDisplayName = (endpoint: ApiEndpoint) => {
    if (endpoint.title) return endpoint.title;
    
    const url = endpoint.url || '';
    const method = endpoint.method || 'GET';
    const path = url.replace('/api/', '').replace(/^\//, '');
    const action = method === 'GET' ? 'Get' : 
                 method === 'POST' ? 'Create' : 
                 method === 'PUT' ? 'Update' : 
                 method === 'DELETE' ? 'Delete' : method;
    
    const displayPath = path && path.length > 0 
      ? path.charAt(0).toUpperCase() + path.slice(1)
      : 'Endpoint';
    
    return `${action} ${displayPath}`;
  };

  return (
    <Card className="w-full h-full overflow-y-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Table of Contents
        </CardTitle>
        {searchQuery && (
          <p className="text-sm text-muted-foreground">
            Showing {endpoints.length} result{endpoints.length !== 1 ? 's' : ''}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {Object.entries(groupedEndpoints).map(([category, categoryEndpoints]) => {
            const isExpanded = expandedCategories.has(category) || Boolean(searchQuery?.trim());
            
            return (
              <Collapsible
                key={category}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto font-medium hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span className="capitalize">{category}</span>
                      <Badge variant="secondary" className="text-xs">
                        {categoryEndpoints.length}
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
                    {categoryEndpoints.map(({ endpoint, index }) => (
                      <Button
                        key={`${endpoint.method}-${endpoint.url}-${index}`}
                        variant="ghost"
                        onClick={() => onEndpointSelect(endpoint, index)}
                        className="w-full justify-start p-2 h-auto text-left hover:bg-accent"
                      >
                        <div className="flex items-center gap-3 w-full min-w-0">
                          <Badge 
                            variant={getMethodColor(endpoint.method || 'GET')}
                            className="text-xs font-mono shrink-0"
                          >
                            {endpoint.method || 'GET'}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">
                              {getEndpointDisplayName(endpoint)}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              {endpoint.url}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
        
        {Object.keys(groupedEndpoints).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No endpoints found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
