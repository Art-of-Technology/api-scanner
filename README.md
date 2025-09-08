# API Scanner

[![npm version](https://badge.fury.io/js/api-scanner.svg)](https://badge.fury.io/js/api-scanner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)

Next.js API route scanner that automatically generates API documentation from your route files.

## Features

- 🔍 **Automatic Discovery**: Scans your `/api` directory for route files
- 📝 **Multiple Formats**: JSON, Markdown, Swagger/OpenAPI, HTML, and Editor formats
- 🌐 **Interactive HTML**: Auto-opening, responsive documentation with Bootstrap UI
- ✏️ **Editor Mode**: Interactive API documentation editor with hierarchical TOC and real-time search
- 🚀 **Next.js App Router**: Supports the new App Router structure (`src/app/api/`)
- 🔧 **Configurable**: Customize scanning behavior with config files
- 📊 **Rich Metadata**: Extracts parameters, responses, request headers, and request bodies
- 🎯 **TypeScript Support**: Full TypeScript support with type definitions
- 🔍 **Request Analysis**: Automatically detects request headers and request body schemas from TypeScript code
- ✏️ **Interactive Editing**: Edit request headers, request bodies, and responses in the editor mode
- 🤖 **Smart Title Generation**: Automatically generates human-readable titles and descriptions for endpoints (e.g., "Create Auth Login", "List Users")

## Installation

```bash
npm install api-scanner
```

## Quick Start

### CLI Usage

```bash
# 🚀 Interactive setup wizard (recommended for beginners)
npx api-scanner init

# 📖 Show detailed help and examples
npx api-scanner help

# 🔍 Basic usage - scans src/app/api and outputs JSON
npx api-scanner

# 📄 Custom path and output
npx api-scanner --path src/app/api --output docs.json

# 📝 Different format
npx api-scanner --format markdown --output api-docs.md

# 🌐 Generate beautiful HTML documentation (auto-opens in browser)
npx api-scanner --format html --output api-docs.html

# ✏️ Generate interactive editor mode
npx api-scanner --format editor --output editor.html

# 🚫 Generate HTML without auto-opening
npx api-scanner --format html --output api-docs.html --no-open

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
          }
        },
        "description": "Issue creation data",
        "example": {
          "title": "Sample Issue",
          "description": "This is a sample issue"
        }
      },
      "responses": {
        "200": {
          "description": "Success",
          "example": { "issues": [] }
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
npx api-scanner --format editor --output editor.html
```

## Editor Mode Features

- **Hierarchical TOC**: Postman-like collapsible folder structure
- **Real-time Search**: Search endpoints by path, method, or description with preview cards
- **Dynamic Display**: Click to view specific endpoint details
- **Interactive Editing**: Edit request headers, request bodies, and responses
- **Request Analysis**: Automatically detects request headers and body schemas from TypeScript code
- **Modern UI**: Bootstrap 5.3.0 with dark theme and smooth animations

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
  name: string;
  email: string;
  age?: number;
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

### HTML Documentation (Recommended)

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
    npx api-scanner --format editor --output docs/editor.html
    npx api-scanner --format swagger --output docs/openapi.json

- name: Deploy Documentation
  run: |
    cp docs/api-docs.html public/
    cp docs/editor.html public/
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
