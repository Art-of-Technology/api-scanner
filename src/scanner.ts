import { glob } from 'glob';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ScannerOptions, ParsedRoute, ApiEndpoint, ApiDocumentation } from './types';
import { Parser } from './parser';
import { Formatter } from './formatter';

export class ApiScanner {
  private options: ScannerOptions;
  private parser: Parser;
  private formatter: Formatter;

  constructor(options: ScannerOptions = {}) {
    this.options = {
      path: 'src/app/api',
      output: 'api-documentation.json',
      format: 'json',
      verbose: false,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
      ...options
    };
    
    // Set correct output for json-folder format
    if (this.options.format === 'json-folder') {
      this.options.output = 'public/api-documentation';
    }
    
    this.parser = new Parser();
    this.formatter = new Formatter(this.options);
  }

  async scan(): Promise<ApiDocumentation> {
    const scanPath = this.options.path!;
    
    if (this.options.verbose) {
      console.log(`🔍 Scanning API routes in: ${scanPath}`);
    }

    // Find all route.ts files
    const routeFiles = await this.findRouteFiles(scanPath);
    
    if (this.options.verbose) {
      console.log(`📁 Found ${routeFiles.length} route files`);
    }

    // Parse each route file
    const parsedRoutes: ParsedRoute[] = [];
    
    for (const file of routeFiles) {
      try {
        const routes = await this.parseRouteFile(file);
        parsedRoutes.push(...routes);
      } catch (error) {
        if (this.options.verbose) {
          console.warn(`⚠️  Error parsing ${file}:`, error);
        }
      }
    }

    // Convert to API endpoints
    const endpoints = await this.convertToEndpoints(parsedRoutes);

    // Create documentation
    const documentation: ApiDocumentation = {
      info: {
        title: 'API Documentation',
        version: '1.0.0',
        description: 'Auto-generated API documentation'
      },
      endpoints,
      totalEndpoints: endpoints.length,
      generatedAt: new Date().toISOString()
    };

    return documentation;
  }

  private async findRouteFiles(scanPath: string): Promise<string[]> {
    const patterns = [
      `${scanPath}/**/route.ts`,
      `${scanPath}/**/route.js`,
      `${scanPath}/**/route.tsx`,
      `${scanPath}/**/route.jsx`
    ];

    const files: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          ignore: this.options.ignore,
          absolute: true
        });
        files.push(...matches);
      } catch (error) {
        if (this.options.verbose) {
          console.warn(`⚠️  Error with pattern ${pattern}:`, error);
        }
      }
    }

    return files;
  }

  private async parseRouteFile(filePath: string): Promise<ParsedRoute[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Convert file path to API URL
    const apiUrl = this.convertFilePathToUrl(relativePath);
    
    // Parse HTTP methods from file content
    const methods = this.parser.extractHttpMethods(content);
    
    if (methods.length === 0) {
      return [];
    }

    // Create one route per method
    return methods.map(method => ({
      method,
      path: apiUrl,
      file: relativePath,
      content
    }));
  }

  private convertFilePathToUrl(filePath: string): string {
    // Normalize path separators
    let url = filePath.replace(/\\/g, '/');
    
    // Remove any prefix up to src/app/api
    url = url.replace(/^.*?src\/app\/api\//, '');
    
    // Remove /route.ts suffix
    url = url.replace(/\/route\.(ts|js|tsx|jsx)$/, '');
    
    // Convert to URL format
    url = url.replace(/\/index$/, '');
    url = url.replace(/\/$/, '');
    
    // Handle dynamic routes [id] -> {id}
    url = url.replace(/\[([^\]]+)\]/g, '{$1}');
    
    return `/api/${url}`;
  }

  private async convertToEndpoints(parsedRoutes: ParsedRoute[]): Promise<ApiEndpoint[]> {
    const endpoints: ApiEndpoint[] = [];

    for (const route of parsedRoutes) {
      try {
        const endpoint = await this.parser.parseEndpoint(route);
        if (endpoint) {
          endpoints.push(endpoint);
        }
      } catch (error) {
        if (this.options.verbose) {
          console.warn(`⚠️  Error converting route ${route.path}:`, error);
        }
      }
    }

    return endpoints;
  }

  async generateDocumentation(): Promise<void> {
    const documentation = await this.scan();
    
    if (this.options.verbose) {
      console.log(`📊 Found ${documentation.totalEndpoints} API endpoints`);
    }

    // Format and save documentation
    const output = await this.formatter.format(documentation, this.options.format!, this.options.verbose);
    
    // Handle different output types
    if (this.options.format === 'json-folder') {
      // For json-folder, output is already handled by formatter
      if (this.options.verbose) {
        console.log(`✅ Documentation saved to: ${this.options.output}`);
      }
    } else {
      // For other formats, write to file
      await fs.writeFile(this.options.output!, output);
      
      if (this.options.verbose) {
        console.log(`✅ Documentation saved to: ${this.options.output}`);
      }
    }
  }
}
