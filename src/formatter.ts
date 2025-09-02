import { ApiDocumentation, ApiEndpoint } from './types';
import { TemplateEngine } from './template-engine';

export class Formatter {
  private templateEngine: TemplateEngine;

  constructor() {
    this.templateEngine = new TemplateEngine();
  }
  async format(documentation: ApiDocumentation, format: 'json' | 'markdown' | 'swagger' | 'html', verbose: boolean = false): Promise<string> {
    switch (format) {
      case 'json':
        return this.formatJson(documentation);
      case 'markdown':
        return this.formatMarkdown(documentation);
      case 'swagger':
        return this.formatSwagger(documentation);
      case 'html':
        return await this.formatHtml(documentation, verbose);
      default:
        return this.formatJson(documentation);
    }
  }

  private formatJson(documentation: ApiDocumentation): string {
    return JSON.stringify(documentation, null, 2);
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

  private async formatHtml(documentation: ApiDocumentation, verbose: boolean = false): Promise<string> {
    const groupedEndpoints = this.groupEndpointsByTags(documentation.endpoints);
    
    // Generate sections with progress logging
    let sectionsHtml = '';
    const totalGroups = Object.keys(groupedEndpoints).length;
    let processedGroups = 0;
    
    for (const [tag, endpoints] of Object.entries(groupedEndpoints)) {
        processedGroups++;
        if (verbose) {
          console.log(`Processing group ${processedGroups}/${totalGroups}: ${tag} (${endpoints.length} endpoints)`);
        }
        
        const tagId = tag.toLowerCase().replace(/\s+/g, '-');
        let endpointsHtml = '';
        
        // Process endpoints sequentially to avoid async issues
        for (const endpoint of endpoints) {
            const endpointHtml = await this.formatEndpointHtml(endpoint);
            endpointsHtml += endpointHtml;
        }
        
        const sectionHtml = await this.templateEngine.renderTemplate('section-template', {
            tagId,
            tagName: tag,
            endpointCount: endpoints.length,
            endpoints: endpointsHtml
        });
        
        sectionsHtml += sectionHtml;
        if (verbose) {
          console.log(`  Generated ${endpointsHtml.length} chars for ${endpoints.length} endpoints`);
        }
    }
    
    if (verbose) {
      console.log(`Generated ${sectionsHtml.length} characters of sections HTML`);
    }
    
    // Render main template
    return await this.templateEngine.renderTemplate('html-template', {
        title: documentation.info.title,
        description: documentation.info.description || 'Auto-generated API documentation',
        totalEndpoints: documentation.totalEndpoints,
        totalCategories: Object.keys(groupedEndpoints).length,
        version: documentation.info.version,
        generatedDate: new Date(documentation.generatedAt).toLocaleDateString('en-US'),
        sections: sectionsHtml
    });
  }

  private async formatEndpointHtml(endpoint: ApiEndpoint): Promise<string> {
    const methodClass = `method-${endpoint.method.toLowerCase()}`;
    
    // Generate description
    const description = endpoint.description 
        ? `<p class="text-muted mb-2">${endpoint.description}</p>`
        : '';

    // Generate parameters
    let parameters = '';
    if (endpoint.parameters.length > 0) {
        let parameterRows = '';
        for (const param of endpoint.parameters) {
            const requiredBadge = param.required ? 'badge bg-danger' : 'badge bg-secondary';
            const requiredText = param.required ? 'Required' : 'Optional';
            
            parameterRows += `
                <tr>
                    <td><strong>${param.name}</strong></td>
                    <td><code>${param.type}</code></td>
                    <td><span class="${requiredBadge}">${requiredText}</span></td>
                    <td>${param.location}</td>
                </tr>`;
        }
        
        parameters = await this.templateEngine.renderTemplate('parameters-template', {
            parameterRows
        });
    }

    // Generate responses
    let responses = '';
    if (Object.keys(endpoint.responses).length > 0) {
        let responseItems = '';
        for (const [statusCode, response] of Object.entries(endpoint.responses)) {
            responseItems += `
                <div class="mb-2">
                    <strong>${statusCode}</strong> - ${response.description}`;
            
            if (response.example) {
                responseItems += `
                    <pre class="response-example mt-1"><code>${JSON.stringify(response.example, null, 2)}</code></pre>`;
            }
            
            responseItems += `</div>`;
        }
        
        responses = await this.templateEngine.renderTemplate('responses-template', {
            responseItems
        });
    }

    // Render endpoint template
    return await this.templateEngine.renderTemplate('endpoint-template', {
        methodClass,
        method: endpoint.method,
        url: endpoint.url,
        description,
        parameters,
        responses,
        file: endpoint.file
    });
  }
}
