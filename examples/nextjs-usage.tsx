/**
 * Example: Using API Scanner React Component in Next.js
 * 
 * This example shows how to integrate the ApiDocumentation component
 * into a Next.js project with proper data loading and error handling.
 */

import React, { useEffect, useState } from 'react';
import { ApiDocumentation } from 'api-scanner/client';
import type { ApiDocumentation as ApiDocumentationType } from 'api-scanner/client';

// Example 1: Basic usage in a dedicated docs page
export default function DocsPage() {
  const [apiData, setApiData] = useState<ApiDocumentationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadApiDocumentation() {
      try {
        // Option 1: Load pre-generated JSON documentation
        const response = await fetch('/api-documentation.json');
        if (!response.ok) throw new Error('Failed to load API documentation');
        const data = await response.json();
        setApiData(data);
      } catch (err) {
        console.error('Error loading API documentation:', err);
        setError('Failed to load API documentation');
      } finally {
        setLoading(false);
      }
    }

    loadApiDocumentation();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mb-4"></div>
          <p>Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (error || !apiData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-red-600">{error || 'Failed to load API documentation'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ApiDocumentation
        data={apiData}
        searchable={true}
        showStats={true}
        defaultExpanded={false}
        theme="system"
        onEndpointSelect={(endpoint) => {
          console.log('Selected endpoint:', endpoint);
          // Optional: Analytics tracking, URL updates, etc.
        }}
      />
    </div>
  );
}

// Example 2: Server-side generation with Next.js API route
export async function getStaticProps() {
  try {
    // Import server-side scanner (only works in Node.js)
    const { ApiScanner } = await import('api-scanner');
    
    // Generate documentation at build time
    const scanner = new ApiScanner({
      path: 'src/app/api',
      format: 'json',
      verbose: false
    });

    const documentation = await scanner.scan();

    return {
      props: {
        apiDocumentation: documentation,
      },
      // Regenerate at most once per hour
      revalidate: 3600,
    };
  } catch (error) {
    console.error('Failed to generate API documentation:', error);
    
    return {
      props: {
        apiDocumentation: null,
      },
    };
  }
}

// Example 3: Component with pre-loaded data
interface DocsPageWithDataProps {
  apiDocumentation: ApiDocumentationType | null;
}

export function DocsPageWithData({ apiDocumentation }: DocsPageWithDataProps) {
  if (!apiDocumentation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Documentation Unavailable</h2>
          <p>API documentation could not be generated.</p>
        </div>
      </div>
    );
  }

  return (
    <ApiDocumentation
      data={apiDocumentation}
      className="max-w-7xl mx-auto"
      searchable={true}
      showStats={true}
      defaultExpanded={true}
    />
  );
}

// Example 4: Custom styled component with Tailwind
export function CustomStyledDocs({ apiDocumentation }: DocsPageWithDataProps) {
  if (!apiDocumentation) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
          <p className="text-xl text-muted-foreground">
            Comprehensive guide to our REST API endpoints
          </p>
        </div>
        
        <ApiDocumentation
          data={apiDocumentation}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-xl"
          searchable={true}
          showStats={true}
          defaultExpanded={false}
          onEndpointSelect={(endpoint) => {
            // Custom analytics or behavior
            console.log('Viewed endpoint:', endpoint.url);
          }}
        />
      </div>
    </div>
  );
}
