import { ApiDocumentation, ApiEndpoint, ScannerOptions } from './types';
import * as fs from 'fs-extra';
import * as path from 'path';

export class Formatter {
  private options: ScannerOptions;

  constructor(options: ScannerOptions = {}) {
    this.options = options;
  }
  async format(documentation: ApiDocumentation, format: 'json' | 'markdown' | 'swagger' | 'react' | 'json-folder', verbose: boolean = false): Promise<string> {
    // Enhance documentation with new features for all formats
    const enhancedDocumentation = this.enhanceDocumentation(documentation);
    
    switch (format) {
      case 'json':
        return this.formatJson(enhancedDocumentation);
      case 'json-folder':
        return this.formatJsonFolder(enhancedDocumentation, this.options.baseUrl);
      case 'markdown':
        return this.formatMarkdown(enhancedDocumentation);
      case 'swagger':
        return this.formatSwagger(enhancedDocumentation);
      case 'react':
        return this.formatReact(enhancedDocumentation);
      default:
        return this.formatJson(enhancedDocumentation);
    }
  }

  private enhanceDocumentation(documentation: ApiDocumentation): ApiDocumentation {
    // Detect base URL from endpoints or use provided one
    const detectedBaseUrl = this.detectBaseUrl(documentation.endpoints, this.options.baseUrl);
    
    // Detect authentication requirements
    const authInfo = this.detectAuthentication(documentation.endpoints);
    
    // Create enhanced documentation with new fields
    return {
      ...documentation,
      info: {
        ...documentation.info,
        baseUrl: detectedBaseUrl,
        authentication: authInfo
      },
      endpoints: documentation.endpoints.map(ep => ({
        ...ep,
        requiresAuth: this.requiresAuthentication(ep),
        responseSchema: this.generateResponseSchema(ep),
        codeExamples: this.generateCodeExamples(ep, detectedBaseUrl),
        errorHandling: this.generateErrorHandling(ep),
        rateLimiting: this.generateRateLimiting(ep),
        pagination: this.generatePagination(ep)
      }))
    };
  }

  private formatJson(documentation: ApiDocumentation): string {
    return JSON.stringify(documentation, null, 2);
  }

  private async formatJsonFolder(documentation: ApiDocumentation, baseUrl?: string): Promise<string> {
    // Use the enhanced documentation (already enhanced in main format method)
    const enhancedDocumentation = documentation;
    
    // Write to api-documentation.json (single file only)
    await fs.writeFile('public/api-documentation.json', JSON.stringify(enhancedDocumentation, null, 2));
    
    return `Documentation generated in public/api-documentation.json`;
  }

  private generateEndpointId(endpoint: ApiEndpoint): string {
    const method = (endpoint.method || 'GET').toLowerCase();
    const url = (endpoint.url || '').replace(/[^a-zA-Z0-9]/g, '-');
    return `${method}-${url}`.replace(/^-+|-+$/g, '');
  }

  private extractCategory(url: string): string {
    const parts = url.split('/');
    return parts[2] || 'general';
  }

  private groupEndpointsByCategory(endpoints: ApiEndpoint[]): { [category: string]: ApiEndpoint[] } {
    const grouped: { [category: string]: ApiEndpoint[] } = {};
    
    endpoints.forEach(endpoint => {
      const category = this.extractCategory(endpoint.url || '');
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(endpoint);
    });
    
    return grouped;
  }

  private generateEndpointFilename(endpoint: ApiEndpoint): string {
    const method = (endpoint.method || 'GET').toLowerCase();
    const url = (endpoint.url || '').replace(/[^a-zA-Z0-9]/g, '-');
    return `${method}-${url}.json`.replace(/^-+|-+$/g, '');
  }

  private formatMarkdown(documentation: ApiDocumentation): string {
    let markdown = `# ${documentation.info.title}\n\n`;
    
    if (documentation.info.description) {
      markdown += `${documentation.info.description}\n\n`;
    }

    markdown += `**Version:** ${documentation.info.version}\n`;
    markdown += `**Generated:** ${new Date(documentation.generatedAt).toLocaleString()}\n`;
    markdown += `**Total Endpoints:** ${documentation.totalEndpoints}\n\n`;

    // Group endpoints by tags
    const groupedEndpoints = this.groupEndpointsByTags(documentation.endpoints);
    
    for (const [tag, endpoints] of Object.entries(groupedEndpoints)) {
      markdown += `## ${tag}\n\n`;
      
      for (const endpoint of endpoints) {
        markdown += this.formatEndpointMarkdown(endpoint);
      }
      
      markdown += '\n';
    }

    return markdown;
  }

  private formatEndpointMarkdown(endpoint: ApiEndpoint): string {
    let markdown = `### ${endpoint.method} ${endpoint.url}\n\n`;
    
    if (endpoint.description) {
      markdown += `${endpoint.description}\n\n`;
    }

    if (endpoint.parameters.length > 0) {
      markdown += '#### Parameters\n\n';
      markdown += '| Name | Type | Required | Location | Description |\n';
      markdown += '|------|------|----------|----------|-------------|\n';
      
      for (const param of endpoint.parameters) {
        markdown += `| ${param.name} | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.location} | ${param.description || '-'} |\n`;
      }
      
      markdown += '\n';
    }

    if (Object.keys(endpoint.responses).length > 0) {
      markdown += '#### Responses\n\n';
      
      for (const [statusCode, response] of Object.entries(endpoint.responses)) {
        markdown += `**${statusCode}** - ${response.description}\n\n`;
        
        if (response.example) {
          markdown += '```json\n';
          markdown += JSON.stringify(response.example, null, 2);
          markdown += '\n```\n\n';
        }
      }
    }

    markdown += `**File:** \`${endpoint.file}\`\n\n`;
    markdown += '---\n\n';

    return markdown;
  }

  private formatSwagger(documentation: ApiDocumentation): string {
    const swagger: any = {
      openapi: '3.0.0',
      info: {
        title: documentation.info.title,
        version: documentation.info.version,
        description: documentation.info.description
      },
      servers: [
        {
          url: '/api',
          description: 'API Server'
        }
      ],
      paths: {},
      tags: []
    };

    // Group endpoints by tags
    const groupedEndpoints = this.groupEndpointsByTags(documentation.endpoints);
    
    for (const [tag, endpoints] of Object.entries(groupedEndpoints)) {
      swagger.tags.push({
        name: tag,
        description: `${tag} endpoints`
      });

      for (const endpoint of endpoints) {
        const path = endpoint.url.replace('/api', '');
        const method = endpoint.method.toLowerCase();
        
        if (!swagger.paths[path]) {
          swagger.paths[path] = {};
        }

        swagger.paths[path][method] = {
          tags: [tag],
          summary: endpoint.summary || endpoint.description,
          description: endpoint.description,
          parameters: this.convertParametersToSwagger(endpoint.parameters),
          responses: this.convertResponsesToSwagger(endpoint.responses)
        };
      }
    }

    return JSON.stringify(swagger, null, 2);
  }

  private groupEndpointsByTags(endpoints: ApiEndpoint[]): Record<string, ApiEndpoint[]> {
    const grouped: Record<string, ApiEndpoint[]> = {};
    
    for (const endpoint of endpoints) {
      const tag = endpoint.tags?.[0] || 'General';
      
      if (!grouped[tag]) {
        grouped[tag] = [];
      }
      
      grouped[tag].push(endpoint);
    }

    return grouped;
  }

  private convertParametersToSwagger(parameters: any[]): any[] {
    return parameters.map(param => ({
      name: param.name,
      in: param.location,
      required: param.required,
      schema: {
        type: this.mapTypeToSwagger(param.type)
      },
      description: param.description
    }));
  }

  private convertResponsesToSwagger(responses: Record<string, any>): Record<string, any> {
    const swaggerResponses: Record<string, any> = {};
    
    for (const [statusCode, response] of Object.entries(responses)) {
      swaggerResponses[statusCode] = {
        description: response.description,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              example: response.example
            }
          }
        }
      };
    }

    return swaggerResponses;
  }

  private mapTypeToSwagger(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'object': 'object',
      'array': 'array',
      'Date': 'string',
      'string?': 'string',
      'number?': 'number',
      'boolean?': 'boolean'
    };

    return typeMap[type] || 'string';
  }

  private formatReact(documentation: ApiDocumentation): string {
    // Generate a React component file that uses the ApiDocumentation component
    return `import React from 'react';
import { ApiDocumentation } from './client';

const ApiDocsPage = () => {
  const apiData = ${JSON.stringify(documentation, null, 2)};

  return (
    <div className="min-h-screen bg-background">
      <ApiDocumentation
        data={apiData}
        searchable={true}
        showStats={true}
        defaultExpanded={false}
        theme="system"
        onEndpointSelect={(endpoint) => {
          // Selected endpoint for code example generation
        }}
      />
    </div>
  );
};

export default ApiDocsPage;`;
  }

  private detectBaseUrl(endpoints: ApiEndpoint[], providedBaseUrl?: string): string {
    // If base URL is provided via CLI/config, use it
    if (providedBaseUrl) {
      return providedBaseUrl;
    }

    // Try to detect base URL from various sources
    const possibleUrls = [
      // 1. Environment variables (highest priority) - SECURITY: Only public env vars
      process.env.NEXT_PUBLIC_API_URL,
      process.env.NEXT_PUBLIC_BASE_URL,
      // Only use public deployment URLs, not sensitive environment variables
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
      process.env.HEROKU_APP_NAME ? `https://${process.env.HEROKU_APP_NAME}.herokuapp.com` : null,
      process.env.NETLIFY_URL ? `https://${process.env.NETLIFY_URL}` : null,
      
      // 2. Production environment detection
      process.env.NODE_ENV === 'production' ? this.detectProductionUrl() : null,
      
      // 3. Common development ports
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8000',
      'http://localhost:8080',
      'http://localhost:5000',
      
      // 4. Common production patterns
      'https://api.example.com',
      'https://api.yourapp.com'
    ].filter(Boolean); // Remove null values

    // Find the first non-empty URL
    const baseUrl = possibleUrls.find(url => url && url.trim() !== '');
    
    if (baseUrl) {
      return baseUrl;
    }

    // 4. Try to detect from package.json scripts (SECURITY: Only read package.json, not other configs)
    try {
      const packageJsonPath = require.resolve('../../package.json');
      const packageJson = require(packageJsonPath);
      
      // SECURITY: Only read scripts section, ignore other sensitive data
      if (packageJson.scripts && typeof packageJson.scripts === 'object') {
        const devScript = packageJson.scripts.dev || packageJson.scripts.start;
        if (typeof devScript === 'string') {
          // Extract port from dev script (e.g., "next dev -p 3001")
          const portMatch = devScript.match(/-p\s+(\d+)/);
          if (portMatch && portMatch[1]) {
            return `http://localhost:${portMatch[1]}`;
          }
        }
      }
    } catch (error) {
      // Package.json not found or not readable - safe to ignore
    }

    // 5. Try to detect from Next.js config (SECURITY: Only read public config, not env vars)
    try {
      const nextConfigPath = require.resolve('../../next.config.js');
      const nextConfig = require(nextConfigPath);
      
      // SECURITY: Only read public config properties, not environment variables
      if (nextConfig && typeof nextConfig === 'object' && nextConfig.env) {
        // Only read public API_URL, not sensitive env vars
        if (typeof nextConfig.env.API_URL === 'string' && nextConfig.env.API_URL.startsWith('http')) {
          return nextConfig.env.API_URL;
        }
      }
    } catch (error) {
      // Next.js config not found or not readable - safe to ignore
    }

    // 6. Default fallback
    return 'http://localhost:3000';
  }

  private detectProductionUrl(): string | null {
    // Try to detect production URL from various sources
    
    // 1. Check if running on Vercel
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    
    // 2. Check if running on Railway
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    }
    
    // 3. Check if running on Heroku
    if (process.env.HEROKU_APP_NAME) {
      return `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
    }
    
    // 4. Check if running on Netlify
    if (process.env.NETLIFY_URL) {
      return `https://${process.env.NETLIFY_URL}`;
    }
    
    // 5. Check if running on Render
    if (process.env.RENDER_EXTERNAL_URL) {
      return process.env.RENDER_EXTERNAL_URL;
    }
    
    // 6. Check if running on DigitalOcean App Platform
    if (process.env.DO_APP_URL) {
      return process.env.DO_APP_URL;
    }
    
    // SECURITY: Removed AWS, Google Cloud, Azure, Docker, Kubernetes checks
    // as they might expose sensitive environment variables
    
    // 7. Check for custom domain (public domain only)
    if (process.env.CUSTOM_DOMAIN && typeof process.env.CUSTOM_DOMAIN === 'string') {
      return `https://${process.env.CUSTOM_DOMAIN}`;
    }
    
    // 8. Check for port-based URL (development only)
    if (process.env.PORT && typeof process.env.PORT === 'string' && process.env.NODE_ENV !== 'production') {
      return `http://localhost:${process.env.PORT}`;
    }
    
    return null;
  }

  private detectAuthentication(endpoints: ApiEndpoint[]): any {
    // Look for auth-related endpoints
    const authEndpoints = endpoints.filter(ep => 
      ep.url?.includes('auth') || 
      ep.url?.includes('login') || 
      ep.url?.includes('token')
    );

    if (authEndpoints.length > 0) {
      return {
        type: 'bearer',
        required: true,
        endpoint: '/api/auth/login',
        headerName: 'Authorization',
        description: 'Bearer token authentication required'
      };
    }

    // Check if any endpoint requires auth headers
    const hasAuthHeaders = endpoints.some(ep => 
      ep.requestHeaders?.some(header => 
        header.name.toLowerCase().includes('authorization') ||
        header.name.toLowerCase().includes('token')
      )
    );

    if (hasAuthHeaders) {
      return {
        type: 'bearer',
        required: true,
        headerName: 'Authorization',
        description: 'Bearer token authentication required'
      };
    }

    return {
      type: 'none',
      required: false,
      description: 'No authentication required'
    };
  }

  private maskSensitiveData(text: string): string {
    if (!text) return text;
    
    // JWT Token patterns
    text = text.replace(/eyJ[A-Za-z0-9\-._~+/]+=*/g, '<jwt-token>');
    text = text.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer <token>');
    text = text.replace(/Authorization:\s*Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Authorization: Bearer <token>');
    
    // API Key patterns
    text = text.replace(/sk_[A-Za-z0-9_]+/g, '<api-key>');
    text = text.replace(/pk_[A-Za-z0-9_]+/g, '<public-key>');
    text = text.replace(/ak_[A-Za-z0-9_]+/g, '<api-key>');
    text = text.replace(/rk_[A-Za-z0-9_]+/g, '<refresh-key>');
    text = text.replace(/[A-Za-z0-9]{32,}/g, (match) => {
      if (match.length > 20) return '<api-key>';
      return match;
    });
    
    // Email patterns
    text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<email>');
    
    // Password patterns
    text = text.replace(/"password"\s*:\s*"[^"]*"/g, '"password": "<password>"');
    text = text.replace(/"pwd"\s*:\s*"[^"]*"/g, '"pwd": "<password>"');
    text = text.replace(/"pass"\s*:\s*"[^"]*"/g, '"pass": "<password>"');
    text = text.replace(/"secret"\s*:\s*"[^"]*"/g, '"secret": "<password>"');
    
    // Session patterns
    text = text.replace(/sess_[A-Za-z0-9]+/g, '<session-id>');
    text = text.replace(/sessionId[^,}]*/g, 'sessionId: "<session-id>"');
    text = text.replace(/session_id[^,}]*/g, 'session_id: "<session-id>"');
    text = text.replace(/sessionId[^,}]*/g, 'sessionId: "<session-id>"');
    
    // Database patterns
    text = text.replace(/mongodb:\/\/[^@]+@[^\/]+\/[^\/\s]+/g, 'mongodb://<username>:<password>@<host>/<database>');
    text = text.replace(/postgresql:\/\/[^@]+@[^\/]+\/[^\/\s]+/g, 'postgresql://<username>:<password>@<host>/<database>');
    text = text.replace(/mysql:\/\/[^@]+@[^\/]+\/[^\/\s]+/g, 'mysql://<username>:<password>@<host>/<database>');
    
    // URL patterns with credentials
    text = text.replace(/https?:\/\/[^@]+@[^\/\s]+/g, 'https://<username>:<password>@<host>');
    
    // AWS patterns
    text = text.replace(/AKIA[0-9A-Z]{16}/g, '<aws-access-key>');
    text = text.replace(/[A-Za-z0-9/+=]{40}/g, '<aws-secret-key>');
    
    // GitHub patterns
    text = text.replace(/ghp_[A-Za-z0-9_]{36}/g, '<github-token>');
    text = text.replace(/gho_[A-Za-z0-9_]{36}/g, '<github-token>');
    text = text.replace(/ghu_[A-Za-z0-9_]{36}/g, '<github-token>');
    text = text.replace(/ghs_[A-Za-z0-9_]{36}/g, '<github-token>');
    text = text.replace(/ghr_[A-Za-z0-9_]{36}/g, '<github-token>');
    
    // Stripe patterns
    text = text.replace(/sk_live_[A-Za-z0-9_]+/g, '<stripe-secret-key>');
    text = text.replace(/pk_live_[A-Za-z0-9_]+/g, '<stripe-public-key>');
    text = text.replace(/sk_test_[A-Za-z0-9_]+/g, '<stripe-test-secret-key>');
    text = text.replace(/pk_test_[A-Za-z0-9_]+/g, '<stripe-test-public-key>');
    
    // PayPal patterns
    text = text.replace(/[A-Za-z0-9]{80}/g, '<paypal-token>');
    
    // Generic token patterns
    text = text.replace(/token[^,}]*/g, 'token: "<token>"');
    text = text.replace(/access_token[^,}]*/g, 'access_token: "<token>"');
    text = text.replace(/refresh_token[^,}]*/g, 'refresh_token: "<token>"');
    text = text.replace(/api_key[^,}]*/g, 'api_key: "<api-key>"');
    text = text.replace(/apikey[^,}]*/g, 'apikey: "<api-key>"');
    
    // Credit card patterns
    text = text.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '<credit-card>');
    text = text.replace(/\b\d{3,4}\b/g, (match) => {
      if (match.length >= 3 && match.length <= 4) return '<cvv>';
      return match;
    });
    
    // Phone patterns
    text = text.replace(/\b\+?[\d\s\-\(\)]{10,}\b/g, '<phone>');
    
    // IP patterns (private IPs)
    text = text.replace(/\b(?:192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.)\d{1,3}\.\d{1,3}\b/g, '<private-ip>');
    
    // UUID patterns (but keep short ones)
    text = text.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<uuid>');
    
    return text;
  }

  private generateCodeExamples(endpoint: ApiEndpoint, baseUrl: string): any {
    // Detect the application language from the endpoint file
    const appLanguage = this.detectApplicationLanguage(endpoint.file);
    const realCodeExample = this.extractRealCodeExample(endpoint, baseUrl);
    
    return {
      language: appLanguage,
      example: realCodeExample
    };
  }

  private detectApplicationLanguage(filePath: string): string {
    if (filePath.includes('.tsx') || filePath.includes('.jsx')) {
      return 'React/TypeScript';
    } else if (filePath.includes('.ts')) {
      return 'TypeScript';
    } else if (filePath.includes('.js')) {
      return 'JavaScript';
    } else if (filePath.includes('.py')) {
      return 'Python';
    } else if (filePath.includes('.php')) {
      return 'PHP';
    } else if (filePath.includes('.java')) {
      return 'Java';
    } else if (filePath.includes('.cs')) {
      return 'C#';
    } else if (filePath.includes('.go')) {
      return 'Go';
    } else if (filePath.includes('.rs')) {
      return 'Rust';
    } else {
      return 'JavaScript'; // Default fallback
    }
  }

  private extractRealCodeExample(endpoint: ApiEndpoint, baseUrl: string): string {
    const url = `${baseUrl}${endpoint.url}`;
    const method = endpoint.method?.toUpperCase() || 'GET';
    const requiresAuth = this.requiresAuthentication(endpoint);
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);
    
    // Extract real code from the endpoint file if possible
    let realCode = this.extractCodeFromFile(endpoint.file);
    
    if (realCode) {
      // Mask sensitive data in real code
      realCode = this.maskSensitiveData(realCode);
      return realCode;
    }
    
    // Fallback to generated example based on detected language
    const appLanguage = this.detectApplicationLanguage(endpoint.file);
    return this.generateFallbackExample(appLanguage, endpoint, url, method, requiresAuth, hasBody);
  }

  private extractCodeFromFile(filePath: string): string | null {
    try {
      // Try to read the actual file content
      const fs = require('fs');
      const path = require('path');
      
      // Resolve the file path
      const fullPath = path.resolve(filePath);
      
      // SECURITY: Only allow reading from specific safe directories
      const safeDirectories = [
        'src/app/api',
        'src/pages/api', 
        'pages/api',
        'app/api',
        'api'
      ];
      
      // Check if file is in a safe directory
      const isSafePath = safeDirectories.some(dir => 
        fullPath.includes(dir) && 
        (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.tsx') || filePath.endsWith('.jsx'))
      );
      
      if (!isSafePath) {
        // Not a safe path, skip file reading
        return null;
      }
      
      // SECURITY: Block sensitive file patterns
      const sensitivePatterns = [
        '.env',
        'config',
        'secret',
        'key',
        'password',
        'token',
        'credential',
        'private',
        'database',
        'db'
      ];
      
      const isSensitiveFile = sensitivePatterns.some(pattern => 
        fullPath.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isSensitiveFile) {
        // Sensitive file detected, skip reading
        return null;
      }
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Extract relevant code snippets (simplified extraction)
        const lines = content.split('\n');
        const relevantLines = lines.filter((line: string) => 
          line.includes('export') || 
          line.includes('async') || 
          line.includes('function') ||
          line.includes('const') ||
          line.includes('return') ||
          line.includes('response') ||
          line.includes('request')
        ).slice(0, 20); // Take first 20 relevant lines
        
        if (relevantLines.length > 0) {
          return relevantLines.join('\n');
        }
      }
    } catch (error) {
      // File not accessible or error reading
    }
    
    return null;
  }

  private generateFallbackExample(language: string, endpoint: ApiEndpoint, url: string, method: string, requiresAuth: boolean, hasBody: boolean): string {
    const templates: { [key: string]: string } = {
      'React/TypeScript': `// ${endpoint.description || 'API Request'}\nconst response = await fetch('${url}', {\n  method: '${method}',\n  headers: {\n    'Content-Type': 'application/json'${requiresAuth ? ",\n    'Authorization': 'Bearer <token>'" : ''}\n  }${hasBody ? ',\n  body: JSON.stringify(data)' : ''}\n});\n\nif (response.ok) {\n  const data = await response.json();\n  return data;\n} else {\n  throw new Error(\`API Error: \${response.status}\`);\n}`,
      
      'TypeScript': `// ${endpoint.description || 'API Request'}\nconst response = await fetch('${url}', {\n  method: '${method}',\n  headers: {\n    'Content-Type': 'application/json'${requiresAuth ? ",\n    'Authorization': 'Bearer <token>'" : ''}\n  }${hasBody ? ',\n  body: JSON.stringify(data)' : ''}\n});\n\nif (response.ok) {\n  const data = await response.json();\n  return data;\n} else {\n  throw new Error(\`API Error: \${response.status}\`);\n}`,
      
      'JavaScript': `// ${endpoint.description || 'API Request'}\nconst response = await fetch('${url}', {\n  method: '${method}',\n  headers: {\n    'Content-Type': 'application/json'${requiresAuth ? ",\n    'Authorization': 'Bearer <token>'" : ''}\n  }${hasBody ? ',\n  body: JSON.stringify(data)' : ''}\n});\n\nif (response.ok) {\n  const data = await response.json();\n  return data;\n} else {\n  throw new Error(\`API Error: \${response.status}\`);\n}`,
      
      'Python': `# ${endpoint.description || 'API Request'}\nimport requests\n\nresponse = requests.${method.toLowerCase()}('${url}', \n  headers={'Content-Type': 'application/json'${requiresAuth ? ", 'Authorization': 'Bearer <token>'" : ''}},\n  ${hasBody ? 'json=data' : ''}\n)\n\nif response.status_code == 200:\n    return response.json()\nelse:\n    raise Exception(f'API Error: {response.status_code}')`,
      
      'PHP': `<?php\n// ${endpoint.description || 'API Request'}\n$response = file_get_contents('${url}', false, stream_context_create([\n    'http' => [\n        'method' => '${method}',\n        'header' => 'Content-Type: application/json'${requiresAuth ? " . '\\r\\nAuthorization: Bearer <token>'" : ''},\n        ${hasBody ? "'content' => json_encode(\$data)" : ''}\n    ]\n]));\n\nif (\$response === false) {\n    throw new Exception('API Error');\n}\n\nreturn json_decode(\$response, true);`,
      
      'Java': `// ${endpoint.description || 'API Request'}\nHttpURLConnection conn = (HttpURLConnection) new URL("${url}").openConnection();\nconn.setRequestMethod("${method}");\nconn.setRequestProperty("Content-Type", "application/json");${requiresAuth ? '\nconn.setRequestProperty("Authorization", "Bearer <token>");' : ''}\n\nif (${hasBody ? 'data != null' : 'false'}) {\n    conn.setDoOutput(true);\n    conn.getOutputStream().write(data.getBytes());\n}\n\nint responseCode = conn.getResponseCode();\nif (responseCode == 200) {\n    return new String(conn.getInputStream().readAllBytes());\n} else {\n    throw new RuntimeException("API Error: " + responseCode);\n}`,
      
      'C#': `// ${endpoint.description || 'API Request'}\nusing var client = new HttpClient();\nclient.DefaultRequestHeaders.Add("Content-Type", "application/json");${requiresAuth ? '\nclient.DefaultRequestHeaders.Add("Authorization", "Bearer <token>");' : ''}\n\nvar response = await client.${method.toLowerCase()}Async("${url}"${hasBody ? ', new StringContent(JsonSerializer.Serialize(data), Encoding.UTF8, "application/json")' : ''});\n\nif (response.IsSuccessStatusCode)\n{\n    return await response.Content.ReadAsStringAsync();\n}\nelse\n{\n    throw new Exception($"API Error: {response.StatusCode}");\n}`,
      
      'Go': `// ${endpoint.description || 'API Request'}\nclient := &http.Client{}\nreq, err := http.NewRequest("${method}", "${url}", ${hasBody ? 'strings.NewReader(data)' : 'nil'})\nif err != nil {\n    return nil, err\n}\n\nreq.Header.Set("Content-Type", "application/json")${requiresAuth ? '\nreq.Header.Set("Authorization", "Bearer <token>")' : ''}\n\nresp, err := client.Do(req)\nif err != nil {\n    return nil, err\n}\nif resp.StatusCode != 200 {\n    return nil, fmt.Errorf("API Error: %d", resp.StatusCode)\n}\n\nreturn ioutil.ReadAll(resp.Body)`,
      
      'Rust': `// ${endpoint.description || 'API Request'}\nlet client = reqwest::Client::new();\nlet mut request = client.${method.toLowerCase()}("${url}");\nrequest = request.header("Content-Type", "application/json");${requiresAuth ? '\nrequest = request.header("Authorization", "Bearer <token>");' : ''}\n\n${hasBody ? 'let response = request.json(&data).send().await?;' : 'let response = request.send().await?;'}\n\nif response.status().is_success() {\n    let data: serde_json::Value = response.json().await?;\n    Ok(data)\n} else {\n    Err(format!("API Error: {}", response.status()))\n}`
    };
    
    return templates[language] || templates['JavaScript'];
  }

  private generateErrorHandling(endpoint: ApiEndpoint): any {
    const errorCodes = endpoint.responses ? Object.keys(endpoint.responses) : [];
    const commonErrors = ['400', '401', '403', '404', '500'];
    
    const errorHandling = {
      commonErrors: commonErrors.map(code => ({
        statusCode: code,
        description: this.getErrorDescription(code),
        handling: this.getErrorHandling(code)
      })),
      endpointSpecific: errorCodes.filter(code => !commonErrors.includes(code)).map(code => ({
        statusCode: code,
        description: endpoint.responses[code]?.description || 'Unknown error',
        handling: this.getErrorHandling(code)
      }))
    };
    
    return errorHandling;
  }

  private getErrorDescription(statusCode: string): string {
    const descriptions: { [key: string]: string } = {
      '400': 'Bad Request - Invalid request data',
      '401': 'Unauthorized - Authentication required',
      '403': 'Forbidden - Access denied',
      '404': 'Not Found - Resource not found',
      '500': 'Internal Server Error - Server error'
    };
    return descriptions[statusCode] || 'Unknown error';
  }

  private getErrorHandling(statusCode: string): string {
    const handling: { [key: string]: string } = {
      '400': 'Check request data format and required fields',
      '401': 'Refresh authentication token or redirect to login',
      '403': 'Check user permissions and access rights',
      '404': 'Verify resource exists and URL is correct',
      '500': 'Retry request or contact support'
    };
    return handling[statusCode] || 'Handle error appropriately';
  }

  private generateRateLimiting(endpoint: ApiEndpoint): any {
    // Default rate limiting based on endpoint type
    const isAuthEndpoint = endpoint.url?.includes('auth') || endpoint.url?.includes('login');
    const isDataEndpoint = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(endpoint.method?.toUpperCase() || '');
    
    return {
      enabled: true,
      limits: {
        requests: isAuthEndpoint ? 5 : (isDataEndpoint ? 100 : 1000),
        window: '1 minute',
        burst: isAuthEndpoint ? 10 : (isDataEndpoint ? 200 : 2000)
      },
      headers: {
        'X-RateLimit-Limit': 'Number of requests allowed',
        'X-RateLimit-Remaining': 'Number of requests remaining',
        'X-RateLimit-Reset': 'Time when limit resets'
      },
      handling: 'Implement exponential backoff and retry logic'
    };
  }

  private generatePagination(endpoint: ApiEndpoint): any {
    // Check if endpoint likely supports pagination
    const isListEndpoint = endpoint.url?.includes('list') || 
                          endpoint.url?.includes('search') || 
                          endpoint.url?.includes('posts') ||
                          endpoint.url?.includes('users') ||
                          (endpoint.method === 'GET' && !endpoint.url?.includes('auth'));
    
    if (!isListEndpoint) {
      return { supported: false };
    }
    
    return {
      supported: true,
      parameters: {
        page: { type: 'number', default: 1, description: 'Page number' },
        limit: { type: 'number', default: 20, description: 'Items per page' },
        offset: { type: 'number', default: 0, description: 'Number of items to skip' }
      },
      response: {
        data: 'Array of items',
        pagination: {
          page: 'Current page number',
          limit: 'Items per page',
          total: 'Total number of items',
          pages: 'Total number of pages'
        }
      },
      example: {
        request: 'GET /api/posts?page=1&limit=10',
        response: {
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 100,
            pages: 10
          }
        }
      }
    };
  }

  private requiresAuthentication(endpoint: ApiEndpoint): boolean {
    // 1. Check if endpoint has explicit auth headers in request
    const hasAuthHeaders = endpoint.requestHeaders?.some(header => 
      header.name.toLowerCase().includes('authorization') ||
      header.name.toLowerCase().includes('token') ||
      header.name.toLowerCase().includes('bearer') ||
      header.name.toLowerCase().includes('api-key') ||
      header.name.toLowerCase().includes('x-api-key') ||
      header.name.toLowerCase().includes('x-auth-token')
    ) || false;

    if (hasAuthHeaders) {
      return true;
    }

    // 2. Check if endpoint is auth-related (should not require auth)
    const authKeywords = ['auth', 'login', 'logout', 'register', 'signup', 'signin', 'signout', 'token', 'refresh'];
    const isAuthEndpoint = authKeywords.some(keyword => 
      endpoint.url?.toLowerCase().includes(keyword)
    );

    if (isAuthEndpoint) {
      return false;
    }

    // 3. Check if endpoint is a health/status endpoint (typically public)
    const healthKeywords = ['health', 'status', 'ping', 'version', 'info', 'metrics', 'ready', 'live'];
    const isHealthEndpoint = healthKeywords.some(keyword => 
      endpoint.url?.toLowerCase().includes(keyword)
    );

    if (isHealthEndpoint) {
      return false;
    }

    // 4. Check if endpoint is a data manipulation endpoint (POST, PUT, DELETE, PATCH)
    // These typically require authentication
    const isDataManipulation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(endpoint.method?.toUpperCase() || '');

    if (isDataManipulation) {
      return true;
    }

    // 5. Check if endpoint has error responses that suggest auth is required
    const hasAuthErrors = endpoint.responses && Object.keys(endpoint.responses).some(statusCode => {
      const response = endpoint.responses[statusCode];
      const description = response.description?.toLowerCase() || '';
      const example = JSON.stringify(response.example || {}).toLowerCase();
      
      return description.includes('unauthorized') || 
             description.includes('forbidden') ||
             description.includes('authentication') ||
             example.includes('unauthorized') ||
             example.includes('forbidden') ||
             example.includes('token') ||
             example.includes('auth');
    });

    if (hasAuthErrors) {
      return true;
    }

    // 6. Check for protected resource patterns
    const protectedPatterns = [
      'users', 'user', 'profile', 'account', 'settings',
      'workspaces', 'workspace', 'projects', 'project',
      'posts', 'post', 'comments', 'comment',
      'admin', 'dashboard', 'private', 'secure',
      'data', 'content', 'files', 'upload'
    ];
    
    const isProtectedResource = protectedPatterns.some(pattern => 
      endpoint.url?.toLowerCase().includes(pattern)
    );

    if (isProtectedResource) {
      return true;
    }

    // 7. Check if endpoint is a public resource (typically doesn't require auth)
    const publicPatterns = [
      'public', 'open', 'guest', 'anonymous',
      'landing', 'home', 'about', 'contact',
      'faq', 'help', 'docs', 'documentation'
    ];
    
    const isPublicResource = publicPatterns.some(pattern => 
      endpoint.url?.toLowerCase().includes(pattern)
    );

    if (isPublicResource) {
      return false;
    }

    // 8. Default: GET endpoints are typically public, others require auth
    return endpoint.method?.toUpperCase() !== 'GET';
  }

  private generateResponseSchema(endpoint: ApiEndpoint): any {
    // Generate basic response schema based on endpoint
    if (endpoint.responses && Object.keys(endpoint.responses).length > 0) {
      const successResponse = endpoint.responses['200'] || endpoint.responses['201'];
      if (successResponse && successResponse.example) {
        // Mask sensitive data in example
        const maskedExample = this.maskSensitiveData(JSON.stringify(successResponse.example));
        const parsedExample = JSON.parse(maskedExample);
        
        return {
          type: 'object',
          properties: this.inferSchemaFromExample(parsedExample)
        };
      }
    }

    // Default schema based on endpoint pattern
    if (endpoint.url?.includes('posts')) {
      return {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            message: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            author: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              }
            }
          }
        }
      };
    }

    return {
      type: 'object',
      description: 'Response schema not available'
    };
  }

  private inferSchemaFromExample(example: any): any {
    if (Array.isArray(example)) {
      return {
        type: 'array',
        items: example.length > 0 ? this.inferSchemaFromExample(example[0]) : { type: 'object' }
      };
    }

    if (typeof example === 'object' && example !== null) {
      const properties: any = {};
      for (const [key, value] of Object.entries(example)) {
        // Mask sensitive data in property names and values
        const maskedKey = this.maskSensitiveData(key);
        const maskedValue = typeof value === 'string' ? this.maskSensitiveData(value) : value;
        properties[maskedKey] = this.inferTypeFromValue(maskedValue);
      }
      return {
        type: 'object',
        properties
      };
    }

    return this.inferTypeFromValue(example);
  }

  private inferTypeFromValue(value: any): any {
    if (typeof value === 'string') {
      if (value.includes('T') && value.includes('Z')) {
        return { type: 'string', format: 'date-time' };
      }
      return { type: 'string' };
    }
    if (typeof value === 'number') {
      return { type: 'number' };
    }
    if (typeof value === 'boolean') {
      return { type: 'boolean' };
    }
    if (Array.isArray(value)) {
      return {
        type: 'array',
        items: value.length > 0 ? this.inferTypeFromValue(value[0]) : { type: 'string' }
      };
    }
    if (typeof value === 'object' && value !== null) {
      return {
        type: 'object',
        properties: this.inferSchemaFromExample(value).properties || {}
      };
    }
    return { type: 'string' };
  }

}
