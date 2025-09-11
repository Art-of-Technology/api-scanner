import { ApiDocumentation, ApiEndpoint } from './types';
import * as fs from 'fs-extra';
import * as path from 'path';

export class Formatter {
  constructor() {
    // Formatter for JSON, Markdown, Swagger, and React formats
  }
  async format(documentation: ApiDocumentation, format: 'json' | 'markdown' | 'swagger' | 'react' | 'json-folder', verbose: boolean = false): Promise<string> {
    switch (format) {
      case 'json':
        return this.formatJson(documentation);
      case 'json-folder':
        return this.formatJsonFolder(documentation);
      case 'markdown':
        return this.formatMarkdown(documentation);
      case 'swagger':
        return this.formatSwagger(documentation);
      case 'react':
        return this.formatReact(documentation);
      default:
        return this.formatJson(documentation);
    }
  }

  private formatJson(documentation: ApiDocumentation): string {
    return JSON.stringify(documentation, null, 2);
  }

  private async formatJsonFolder(documentation: ApiDocumentation): Promise<string> {
    const baseDir = 'public/api-documentation';
    
    // Create base directory
    await fs.ensureDir(baseDir);
    
    // Create index.json
    const indexData = {
      info: documentation.info,
      generatedAt: documentation.generatedAt,
      endpoints: documentation.endpoints.map(ep => ({
        id: this.generateEndpointId(ep),
        method: ep.method,
        url: ep.url,
        title: ep.title,
        description: ep.description,
        category: this.extractCategory(ep.url || ''),
        file: ep.file
      }))
    };
    
    await fs.writeFile(path.join(baseDir, 'index.json'), JSON.stringify(indexData, null, 2));
    
    // Group endpoints by category
    const groupedEndpoints = this.groupEndpointsByCategory(documentation.endpoints);
    
    // Create category folders and individual endpoint files
    for (const [category, endpoints] of Object.entries(groupedEndpoints)) {
      const categoryDir = path.join(baseDir, category);
      await fs.ensureDir(categoryDir);
      
      for (const endpoint of endpoints) {
        const filename = this.generateEndpointFilename(endpoint);
        const filePath = path.join(categoryDir, filename);
        
        const endpointData = {
          id: this.generateEndpointId(endpoint),
          method: endpoint.method,
          url: endpoint.url,
          title: endpoint.title,
          description: endpoint.description,
          parameters: endpoint.parameters,
          responses: endpoint.responses,
          file: endpoint.file,
          category: category
        };
        
        await fs.writeFile(filePath, JSON.stringify(endpointData, null, 2));
      }
    }
    
    return `JSON folder structure created in ${baseDir}`;
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
          console.log('Selected endpoint:', endpoint);
        }}
      />
    </div>
  );
};

export default ApiDocsPage;`;
  }

}
