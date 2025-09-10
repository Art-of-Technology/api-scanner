import React, { useState, useMemo } from 'react';
import { ApiDocumentationProps, ApiEndpoint } from './types';
import { cn } from './lib/utils';
import { SearchInput } from './SearchInput';
import { TableOfContents } from './TableOfContents';
import { EndpointCard } from './EndpointCard';
import { StatsCards } from './StatsCards';

export function ApiDocumentation({
  data,
  className,
  searchable = true,
  showStats = true,
  defaultExpanded = false,
  theme = 'system',
  onEndpointSelect,
}: ApiDocumentationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Filter endpoints based on search query
  const filteredEndpoints = useMemo(() => {
    if (!searchQuery.trim()) return data.endpoints;

    const query = searchQuery.toLowerCase();
    return data.endpoints.filter(endpoint => {
      const url = (endpoint.url || '').toLowerCase();
      const method = (endpoint.method || '').toLowerCase();
      const description = (endpoint.description || '').toLowerCase();
      const title = (endpoint.title || '').toLowerCase();
      const file = (endpoint.file || '').toLowerCase();
      
      return url.includes(query) || 
             method.includes(query) || 
             description.includes(query) ||
             title.includes(query) ||
             file.includes(query);
    });
  }, [data.endpoints, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const categories = new Set();
    data.endpoints.forEach(endpoint => {
      const urlPath = endpoint.url || '';
      const category = urlPath.split('/')[2] || 'api';
      categories.add(category);
    });

    return {
      totalEndpoints: data.endpoints.length,
      totalCategories: categories.size,
      version: data.info?.version,
      generatedAt: data.generatedAt,
    };
  }, [data]);

  const handleEndpointSelect = (endpoint: ApiEndpoint, index: number) => {
    setSelectedEndpoint(endpoint);
    setSelectedIndex(index);
    onEndpointSelect?.(endpoint);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Clear selection when searching
    if (query.trim()) {
      setSelectedEndpoint(null);
      setSelectedIndex(null);
    }
  };

  return (
    <div 
      className={cn('api-documentation w-full min-h-screen overflow-y-auto', className)} 
      data-theme={theme}
      style={{ 
        height: '100%',
        maxHeight: '100vh',
        overflowY: 'auto'
      }}
    >
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{data.info.title}</h1>
              {data.info.description && (
                <p className="text-muted-foreground mt-2">{data.info.description}</p>
              )}
            </div>
            {searchable && (
              <div className="lg:w-96">
                <SearchInput
                  onSearch={handleSearch}
                  placeholder="Search endpoints..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {showStats && (
          <div className="mb-8">
            <StatsCards {...stats} />
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Table of Contents */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <TableOfContents
                endpoints={filteredEndpoints}
                onEndpointSelect={handleEndpointSelect}
                searchQuery={searchQuery}
                defaultExpanded={defaultExpanded}
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {selectedEndpoint && selectedIndex !== null ? (
              <EndpointCard
                endpoint={selectedEndpoint}
                index={selectedIndex}
                onSelect={onEndpointSelect}
              />
            ) : searchQuery.trim() && filteredEndpoints.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p>No endpoints match &quot;{searchQuery}&quot;</p>
                </div>
              </div>
            ) : searchQuery.trim() && filteredEndpoints.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    Found {filteredEndpoints.length} endpoint{filteredEndpoints.length > 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select an endpoint from the sidebar to view details
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  <div className="text-4xl mb-4">📚</div>
                  <h3 className="text-lg font-semibold mb-2">API Documentation</h3>
                  <p>Select an endpoint from the sidebar to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
