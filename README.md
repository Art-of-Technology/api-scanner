# API Scanner

[![npm version](https://badge.fury.io/js/api-scanner.svg)](https://badge.fury.io/js/api-scanner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)

Next.js API route scanner that automatically generates API documentation from your route files. Now with **React components** for seamless integration into your Next.js projects!

## Features

### Core Scanner
- 🔍 **Automatic Discovery**: Scans your `/api` directory for route files
- 📝 **Multiple Formats**: JSON, JSON-folder, Markdown, Swagger/OpenAPI, and React formats
- 🚀 **Next.js App Router**: Supports the new App Router structure (`src/app/api/`)
- 🔧 **Configurable**: Customize scanning behavior with config files
- 📊 **Rich Metadata**: Extracts parameters, responses, request headers, and request bodies
- 🎯 **TypeScript Support**: Full TypeScript support with type definitions
- 🔍 **Request Analysis**: Automatically detects request headers and request body schemas from TypeScript code
- 🤖 **Smart Title Generation**: Automatically generates human-readable titles and descriptions for endpoints (e.g., "Create Auth Login", "List Users")
- 📁 **JSON Folder Structure**: Organizes documentation in hierarchical JSON files for easy management
- ✅ **Required/Optional Fields**: Smart detection of required vs optional fields in API requests
- 🔗 **Union Type Support**: Parse and display TypeScript union types like `'private' | 'public'`
- 🎯 **Realistic Examples**: Generate field types instead of placeholders
- 🔐 **Enhanced Authentication**: Better auth format detection with specific instructions

### React Components
- ⚛️ **React 19 Compatible**: Built with the latest React and optimized for modern Next.js
- 🎨 **shadcn/ui Integration**: Uses shadcn/ui components with Tailwind CSS 4.0
- 🌓 **Dark/Light Theme**: Built-in theme support that follows your project's theme
- 📱 **Responsive Design**: Mobile-first responsive design for all screen sizes
- 🔎 **Advanced Search**: Real-time search with preview cards and filtering
- 📂 **Collapsible Sidebar**: Organized table of contents with expandable categories
- 🏷️ **HTTP Method Badges**: Color-coded badges for different HTTP methods
- 📋 **Tabbed Interface**: Organized endpoint details with tabs for request/response data
- 🔗 **Zero Config**: Drop-in component that works with your existing shadcn/ui setup

### Advanced Editor (NEW!)
- ✏️ **Monaco Editor**: VS Code-powered JSON editor with syntax highlighting
- 🚀 **Auto-save**: Intelligent auto-save with 5-second delay and change detection
- ⌨️ **Keyboard Shortcuts**: Ctrl+S for manual save, full keyboard support
- 🎯 **Live Preview**: Real-time preview of JSON structure and metadata
- 📁 **File Tree**: Hierarchical file browser with HTTP method badges
- 🔍 **Smart Search**: Search through files and folders with instant filtering
- 📊 **Statistics**: Live stats showing file counts, folders, and version info
- 🎨 **Custom Toast**: Modern toast notifications for save status and errors
- ⚡ **Performance Optimized**: Lightweight editor with minimal resource usage
- ✅ **Field Requirements**: Display required/optional fields in Request tab with badges
- 🖱️ **Fixed Scroll**: Resolved Monaco Editor scroll issues for better UX

## Installation

### For CLI Usage
```bash
npm install api-scanner
```

### For React Component Usage
```bash
npm install api-scanner
# Also install peer dependencies for your Next.js project
npm install react@^19.0.0 react-dom@^19.0.0 tailwindcss@^4.0.0
npm install clsx tailwind-merge class-variance-authority lucide-react
npm install @radix-ui/react-collapsible @radix-ui/react-dialog @radix-ui/react-slot @radix-ui/react-tabs
npm install tailwindcss-animate
```

## Quick Start

### React Component Usage (Recommended for Next.js Projects)

#### View Documentation
Create a docs page in your Next.js app:

```tsx
// app/docs/page.tsx or pages/docs.tsx
'use client';

import { useEffect, useState } from 'react';
import { ApiDocumentation } from 'api-scanner/client';
import type { ApiDocumentationType } from 'api-scanner/client';

export default function DocsPage() {
  const [apiData, setApiData] = useState<ApiDocumentationType | null>(null);

  useEffect(() => {
    // Load API documentation (generated via CLI or API route)
    fetch('/api/docs')
      .then(res => res.json())
      .then(setApiData)
      .catch(console.error);
  }, []);

  if (!apiData) return <div>Loading...</div>;

  return (
    <ApiDocumentation
      data={apiData}
      searchable={true}
      showStats={true}
      defaultExpanded={false}
      theme="system"
    />
  );
}
```

#### Edit Documentation
Create an edit page for managing your API documentation:

```tsx
// app/edit/page.tsx or pages/edit.tsx
import { EditInterface } from 'api-scanner/components';

export default function EditPage() {
  return (
    <div className="h-screen">
      <EditInterface />
    </div>
  );
}
```

**Setup Required CSS Variables:**
Add to your `globals.css` (see [examples/globals.css](examples/globals.css)):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Add shadcn/ui CSS variables - see examples/globals.css for full setup */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* ... more variables */
  }
}
```

**Update your Tailwind config** (see [examples/tailwind.config.js](examples/tailwind.config.js)):

```js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/api-scanner/dist/**/*.{js,jsx,ts,tsx}', // Include api-scanner
  ],
  // ... rest of your config
}
```

### CLI Usage

```bash
# 🚀 Interactive setup wizard (recommended for beginners)
npx api-scanner init

# 📖 Show detailed help and examples
npx api-scanner help

# 🔍 Basic usage - scans src/app/api and generates JSON folder structure
npx api-scanner

# 📄 Custom path and output
npx api-scanner --path src/app/api --output docs.json

# 📝 Different formats
npx api-scanner --format json --output api-docs.json
npx api-scanner --format json-folder --output public/api-documentation
npx api-scanner --format markdown --output api-docs.md
npx api-scanner --format swagger --output openapi.json
npx api-scanner --format react --output ApiDocsPage.tsx

# ✏️ Open the interactive editor
npx api-scanner edit

# 📊 Generate JSON folder structure (default)
npx api-scanner --format json-folder --output public/api-documentation

# 🔍 Verbose output
npx api-scanner --verbose

# 💡 Show usage examples
npx api-scanner --examples
```

### Programmatic Usage

```typescript
import { ApiScanner } from 'api-scanner';

// Generate JSON documentation
const scanner = new ApiScanner({
  path: 'src/app/api',
  output: 'api-docs.json',
  format: 'json',
  verbose: true
});

await scanner.generateDocumentation();

// Generate HTML documentation
const htmlScanner = new ApiScanner({
  path: 'src/app/api',
  output: 'api-docs.html',
  format: 'html',
  verbose: true
});

await htmlScanner.generateDocumentation();
// HTML file will automatically open in browser (unless --no-open is used)
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --path <path>` | Path to scan for API routes | `src/app/api` |
| `-o, --output <file>` | Output file path | `api-documentation.json` |
| `-f, --format <format>` | Output format (json, markdown, swagger, html, editor) | `json` |
| `-v, --verbose` | Enable verbose output | `false` |
| `-c, --config <file>` | Configuration file path | `.api-scanner.json` |
| `-i, --interactive` | Run in interactive mode | `false` |
| `--no-open` | Do not auto-open HTML files in browser | `false` |
| `--examples` | Show usage examples | `false` |

## Commands

| Command | Description |
|---------|-------------|
| `init` | Interactive setup wizard |
| `help` | Show detailed help and examples |

## Configuration File

Create a `.api-scanner.json` file in your project root:

```json
{
  "path": "src/app/api",
  "output": "docs/api.html",
  "format": "html",
  "ignore": ["**/test/**", "**/__tests__/**"],
  "include": ["**/*.ts", "**/*.js"],
  "templates": {
    "html": "custom-template.html"
  }
}
```

## Output Formats

### JSON Folder Structure (Default)
Organizes documentation in hierarchical JSON files:

```
public/api-documentation/
├── index.json
├── users/
│   ├── get-users.json
│   └── create-user.json
└── auth/
    └── login.json
```

### JSON Format

```json
{
  "info": {
    "title": "API Documentation",
    "version": "1.0.0",
    "description": "Auto-generated API documentation"
  },
  "endpoints": [
    {
      "method": "GET",
      "url": "/api/issues",
      "file": "src/app/api/issues/route.ts",
      "description": "Get issues by workspace/project",
      "parameters": [
        {
          "name": "workspaceId",
          "type": "string",
          "required": true,
          "location": "query",
          "description": "Workspace ID"
        }
      ],
      "requestHeaders": [
        {
          "name": "Authorization",
          "required": true,
          "description": "Bearer token for authentication"
        }
      ],
      "requestBody": {
        "type": "application/json",
        "schema": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "description": { "type": "string" }
          },
          "required": ["title"]
        },
        "description": "Issue creation data",
        "example": {
          "title": "Sample Issue",
          "description": "This is a sample issue"
        },
        "required": ["title"]
      },
      "responses": {
        "200": {
          "description": "Success",
          "example": { "issues": [] },
          "requiredFields": ["id", "status"],
          "optionalFields": ["description"]
        }
      },
      "tags": ["issues"]
    }
  ],
  "totalEndpoints": 1,
  "generatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Markdown Format

```markdown
# API Documentation

**Version:** 1.0.0
**Generated:** 1/1/2024, 12:00:00 AM
**Total Endpoints:** 1

## issues

### GET /api/issues

Get issues by workspace/project

#### Parameters

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| workspaceId | string | Yes | query | Workspace ID |

#### Responses

**200** - Success

```json
{
  "issues": []
}
```

**File:** `src/app/api/issues/route.ts`
```

### Swagger/OpenAPI Format

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "API Documentation",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "/api",
      "description": "API Server"
    }
  ],
  "paths": {
    "/issues": {
      "get": {
        "tags": ["issues"],
        "summary": "Get issues by workspace/project",
        "parameters": [
          {
            "name": "workspaceId",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "example": { "issues": [] }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### HTML Format

Beautiful, interactive documentation website with modern Bootstrap UI, dark theme, and responsive design.

### Editor Format

Interactive API documentation editor with hierarchical TOC, real-time search, and dynamic endpoint display.

```bash
# Generate HTML documentation
npx api-scanner --format html --output api-docs.html

# Generate interactive editor
npx api-scanner --format react --output ApiDocsPage.tsx
```

## Editor Mode Features

- **Hierarchical TOC**: Postman-like collapsible folder structure
- **Real-time Search**: Search endpoints by path, method, or description with preview cards
- **Dynamic Display**: Click to view specific endpoint details
- **Interactive Editing**: Edit request headers, request bodies, and responses
- **Request Analysis**: Automatically detects request headers and body schemas from TypeScript code
- **Modern UI**: Bootstrap 5.3.0 with dark theme and smooth animations

## React Components

### ApiDocumentation Component

The main React component for displaying API documentation in your Next.js project.

#### Props

```typescript
interface ApiDocumentationProps {
  /** API documentation data generated by the scanner */
  data: ApiDocumentation;
  /** Custom CSS classes for the container */
  className?: string;
  /** Whether to show search functionality (default: true) */
  searchable?: boolean;
  /** Whether to show statistics cards (default: true) */
  showStats?: boolean;
  /** Default expanded state for categories (default: false) */
  defaultExpanded?: boolean;
  /** Theme configuration (default: 'system') */
  theme?: 'light' | 'dark' | 'system';
  /** Callback when an endpoint is selected */
  onEndpointSelect?: (endpoint: ApiEndpoint) => void;
}
```

#### Basic Usage

```tsx
import { ApiDocumentation } from 'api-scanner/client';

export default function DocsPage() {
  return (
    <ApiDocumentation
      data={apiDocumentationData}
      searchable={true}
      showStats={true}
    />
  );
}
```

#### Advanced Usage with Custom Styling

```tsx
import { ApiDocumentation } from 'api-scanner/client';

export default function CustomDocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">API Documentation</h1>
        <ApiDocumentation
          data={apiDocumentationData}
          className="bg-white rounded-lg shadow-xl"
          searchable={true}
          showStats={true}
          defaultExpanded={true}
          theme="light"
          onEndpointSelect={(endpoint) => {
            console.log('Selected endpoint:', endpoint.url);
            // Custom analytics, URL updates, etc.
          }}
        />
      </div>
    </div>
  );
}
```

### Data Loading Patterns

#### Static Generation

```tsx
// Generate docs at build time
export async function getStaticProps() {
  const scanner = new ApiScanner({
    path: 'src/app/api',
    format: 'json'
  });

  const documentation = await scanner.scan();

  return {
    props: { apiDocumentation: documentation },
    revalidate: 3600, // Regenerate every hour
  };
}
```

#### API Route

Create an API route to serve documentation dynamically:

```typescript
// app/api/docs/route.ts
import { ApiScanner } from 'api-scanner';

export async function GET() {
  const scanner = new ApiScanner({
    path: 'src/app/api',
    format: 'json'
  });

  const documentation = await scanner.scan();
  
  return Response.json(documentation);
}
```

#### Client-side Loading

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ApiDocumentation } from 'api-scanner/client';

export default function DocsPage() {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/docs')
      .then(res => res.json())
      .then(data => {
        setApiData(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to load API docs:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!apiData) {
    return <div className="text-center text-red-500">Failed to load API documentation</div>;
  }

  return <ApiDocumentation data={apiData} />;
}
```

### Setup Guide

#### 1. Install Dependencies

See the installation section above for the complete dependency list.

#### 2. Configure Tailwind CSS

Update your `tailwind.config.js` to include the api-scanner components:

```js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/api-scanner/dist/**/*.{js,jsx,ts,tsx}',
  ],
  // ... rest of your config
}
```

#### 3. Add CSS Variables

Add the required CSS variables to your `globals.css`. See [examples/globals.css](examples/globals.css) for the complete setup.

#### 4. Create Documentation Page

Create a dedicated page for your API documentation:

```tsx
// app/docs/page.tsx
'use client';

import { ApiDocumentation } from 'api-scanner';
// ... rest of your component
```

### Component Architecture

The React components are built with:
- **React 19**: Latest React features and optimizations
- **Tailwind CSS 4.0**: Utility-first CSS framework
- **shadcn/ui**: High-quality, accessible components
- **Radix UI**: Unstyled, accessible primitives
- **Lucide React**: Beautiful, customizable icons

#### Sub-components

You can also use individual components for more customization:

```tsx
import {
  EndpointCard,
  TableOfContents,
  SearchInput,
  StatsCards
} from 'api-scanner/client';

// Use individual components for custom layouts
function CustomDocsLayout({ apiData }) {
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-3">
        <SearchInput onSearch={handleSearch} />
        <TableOfContents 
          endpoints={apiData.endpoints}
          onEndpointSelect={handleSelect}
        />
      </div>
      <div className="col-span-9">
        <StatsCards {...statsData} />
        {selectedEndpoint && (
          <EndpointCard 
            endpoint={selectedEndpoint}
            index={selectedIndex}
          />
        )}
      </div>
    </div>
  );
}
```

### Theme Integration

The components automatically integrate with your project's theme system:

```tsx
// Follows your project's dark/light mode
<ApiDocumentation data={apiData} theme="system" />

// Force light mode
<ApiDocumentation data={apiData} theme="light" />

// Force dark mode
<ApiDocumentation data={apiData} theme="dark" />
```

### TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  ApiDocumentationProps,
  EndpointCardProps,
  TableOfContentsProps,
  SearchInputProps,
  StatsCardsProps
} from 'api-scanner/client';
```

## Supported Route Patterns

The scanner supports the following Next.js App Router patterns:

- `src/app/api/route.ts` → `/api`
- `src/app/api/users/route.ts` → `/api/users`
- `src/app/api/users/[id]/route.ts` → `/api/users/{id}`
- `src/app/api/projects/[projectId]/issues/route.ts` → `/api/projects/{projectId}/issues`

## HTTP Method Detection

The scanner automatically detects HTTP methods from your route files:

```typescript
// GET method
export async function GET(request: Request) {
  // ...
}

// POST method
export async function POST(request: Request) {
  // ...
}

// Multiple methods
export const GET = async (request: Request) => { /* ... */ };
export const POST = async (request: Request) => { /* ... */ };
```

## Request Analysis

The scanner automatically analyzes your route files to detect:

### Request Headers
Detects common request headers used in your API routes:

```typescript
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const contentType = request.headers.get('Content-Type');
  const { headers } = request;
  
  // Scanner will detect: Authorization, Content-Type
}
```

### Request Body Detection
Analyzes request body usage and extracts TypeScript type information:

```typescript
// Detects request body usage
export async function POST(request: Request) {
  const body = await request.json();
  // Scanner detects JSON body usage
}

// Extracts TypeScript interface information
interface CreateUserRequest {
  name: string;
  email: string;
  age?: number;
}

export async function POST(request: Request) {
  const body: CreateUserRequest = await request.json();
  // Scanner extracts schema and generates example
}
```

The scanner generates:
- **Request Headers**: List of detected headers with names and required status
- **Request Body Schema**: TypeScript interface analysis converted to JSON schema
- **Request Body Example**: Generated example based on detected types

## JSDoc Support

Add JSDoc comments to your route functions for better documentation:

```typescript
/**
 * Get issues by workspace and project
 * @param {string} workspaceId - The workspace ID
 * @param {string} projectId - The project ID (optional)
 * @response 200 - Success response
 * @response 404 - Not found
 */
export async function GET(request: Request) {
  // ...
}
```

## Examples

### Basic Route File

```typescript
// src/app/api/issues/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');
  
  return Response.json({ issues: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  return Response.json({ id: '123', success: true }, { status: 201 });
}
```

### Route with Request Headers and Body

```typescript
// src/app/api/users/route.ts
interface CreateUserRequest {
  name: string;        // Required
  email: string;       // Required  
  age?: number;        // Optional
}

export async function POST(request: Request) {
  // Request headers detection
  const authHeader = request.headers.get('Authorization');
  const contentType = request.headers.get('Content-Type');
  
  // Request body detection with TypeScript types
  const body: CreateUserRequest = await request.json();
  
  // Scanner will automatically detect:
  // - Request headers: Authorization, Content-Type
  // - Request body schema from CreateUserRequest interface
  // - Required fields: name, email (age is optional)
  // - Generate example JSON based on interface properties
  
  return Response.json({ 
    id: '123', 
    name: body.name, 
    email: body.email 
  }, { status: 201 });
}
```

### Dynamic Route

```typescript
// src/app/api/issues/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  return Response.json({ issue: { id, title: 'Sample Issue' } });
}
```

## Integration Examples

### React Component in Next.js (Recommended)

See complete examples in the [examples/](examples/) directory:

- [nextjs-usage.tsx](examples/nextjs-usage.tsx) - Complete Next.js integration examples
- [tailwind.config.js](examples/tailwind.config.js) - Tailwind CSS configuration
- [globals.css](examples/globals.css) - Required CSS variables and styling
- [package.json](examples/package.json) - Complete dependency list
- [api-docs-route.ts](examples/api-docs-route.ts) - Next.js API route for serving docs

```tsx
// Basic Next.js integration
import { ApiDocumentation } from 'api-scanner/client';

export default function DocsPage({ apiDocumentation }) {
  return (
    <ApiDocumentation
      data={apiDocumentation}
      searchable={true}
      showStats={true}
      theme="system"
    />
  );
}
```

### HTML Documentation (Static)

```bash
# Generate beautiful HTML documentation
npx api-scanner --format html --output docs/api-docs.html

# Generate interactive editor
npx api-scanner --format editor --output docs/editor.html
```

### With Swagger UI

```bash
# Generate Swagger documentation
npx api-scanner --format swagger --output swagger.json

# Serve with Swagger UI
npx swagger-ui-serve swagger.json
```

### With Postman

```bash
# Generate OpenAPI spec
npx api-scanner --format swagger --output openapi.json

# Import openapi.json into Postman
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Generate API Documentation
  run: |
    npm install api-scanner
    npx api-scanner --format html --output docs/api-docs.html
    npx api-scanner --format react --output docs/ApiDocsPage.tsx
    npx api-scanner --format swagger --output docs/openapi.json

- name: Deploy Documentation
  run: |
    cp docs/api-docs.html public/
    cp docs/ApiDocsPage.tsx src/components/
```

### Custom Templates

You can customize the HTML output by providing your own templates:

```bash
# Use custom template
npx api-scanner --format html --output docs/api-docs.html --config .api-scanner.json
```

```json
{
  "format": "html",
  "templates": {
    "html": "custom-templates/my-template.html"
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review existing issues

---

Made with ❤️ by AOT Team
