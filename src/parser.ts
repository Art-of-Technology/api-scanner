import { ParsedRoute, ApiEndpoint, ApiParameter, ApiResponse } from './types';

export class Parser {
  private httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  extractHttpMethods(content: string): string[] {
    const methods: string[] = [];
    
    for (const method of this.httpMethods) {
      // Look for export async function METHOD
      const exportPattern = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`, 'gi');
      if (exportPattern.test(content)) {
        methods.push(method);
        continue;
      }

      // Look for export const METHOD
      const constPattern = new RegExp(`export\\s+const\\s+${method}\\s*=`, 'gi');
      if (constPattern.test(content)) {
        methods.push(method);
        continue;
      }

      // Look for export { METHOD }
      const namedExportPattern = new RegExp(`export\\s*{\\s*${method}\\s*}`, 'gi');
      if (namedExportPattern.test(content)) {
        methods.push(method);
      }
    }

    return methods;
  }

  async parseEndpoint(route: ParsedRoute): Promise<ApiEndpoint | null> {
    const { method, path, file, content } = route;

    // Extract description from JSDoc comments
    const description = this.extractDescription(content, method);
    
    // Extract parameters
    const parameters = this.extractParameters(content, method, path);
    
    // Extract responses
    const responses = this.extractResponses(content, method);
    
    // Extract tags from file path
    const tags = this.extractTags(file);

    return {
      method,
      url: path,
      file,
      description,
      parameters,
      responses,
      tags,
      summary: description
    };
  }

  private extractDescription(content: string, method: string): string | undefined {
    // Look for JSDoc comments above the method
    const methodPattern = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`, 'i');
    const match = content.match(methodPattern);
    
    if (!match) return undefined;

    const methodIndex = match.index!;
    const beforeMethod = content.substring(0, methodIndex);
    
    // Find the last JSDoc comment before the method
    const jsdocPattern = /\/\*\*([\s\S]*?)\*\//g;
    const jsdocMatches = [...beforeMethod.matchAll(jsdocPattern)];
    
    if (jsdocMatches.length === 0) return undefined;

    const lastJSDoc = jsdocMatches[jsdocMatches.length - 1][1];
    
    // Extract description from JSDoc
    const descriptionMatch = lastJSDoc.match(/^\s*\*\s*(.+)$/m);
    return descriptionMatch ? descriptionMatch[1].trim() : undefined;
  }

  private extractParameters(content: string, method: string, path: string): ApiParameter[] {
    const parameters: ApiParameter[] = [];

    // Extract path parameters from URL
    const pathParams = this.extractPathParameters(path);
    parameters.push(...pathParams);

    // Extract query parameters from method signature
    const queryParams = this.extractQueryParameters(content, method);
    parameters.push(...queryParams);

    // Extract body parameters for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const bodyParams = this.extractBodyParameters(content, method);
      parameters.push(...bodyParams);
    }

    return parameters;
  }

  private extractPathParameters(path: string): ApiParameter[] {
    const parameters: ApiParameter[] = [];
    const pathParamPattern = /\{([^}]+)\}/g;
    
    let match;
    while ((match = pathParamPattern.exec(path)) !== null) {
      parameters.push({
        name: match[1],
        type: 'string',
        required: true,
        location: 'path',
        description: `Path parameter: ${match[1]}`
      });
    }

    return parameters;
  }

  private extractQueryParameters(content: string, method: string): ApiParameter[] {
    const parameters: ApiParameter[] = [];
    
    // Look for searchParams or query parameters in the method
    const searchParamsPattern = /searchParams\s*:\s*URLSearchParams/gi;
    const queryPattern = /query\s*:\s*\{[^}]*\}/gi;
    
    if (searchParamsPattern.test(content) || queryPattern.test(content)) {
      // Try to extract specific query parameters from JSDoc or type definitions
      const queryParamMatches = content.match(/@param\s+\{([^}]+)\}\s+(\w+)\s+(.+)/gi);
      
      if (queryParamMatches) {
        for (const match of queryParamMatches) {
          const paramMatch = match.match(/@param\s+\{([^}]+)\}\s+(\w+)\s+(.+)/i);
          if (paramMatch) {
            parameters.push({
              name: paramMatch[2],
              type: paramMatch[1],
              required: !paramMatch[1].includes('?'),
              location: 'query',
              description: paramMatch[3].trim()
            });
          }
        }
      } else {
        // Generic query parameter
        parameters.push({
          name: 'query',
          type: 'object',
          required: false,
          location: 'query',
          description: 'Query parameters'
        });
      }
    }

    return parameters;
  }

  private extractBodyParameters(content: string, method: string): ApiParameter[] {
    const parameters: ApiParameter[] = [];
    
    // Look for request body in the method
    const bodyPattern = /body\s*:\s*\{[^}]*\}/gi;
    const requestPattern = /request\s*:\s*Request/gi;
    
    if (bodyPattern.test(content) || requestPattern.test(content)) {
      // Try to extract body parameters from JSDoc or type definitions
      const bodyParamMatches = content.match(/@param\s+\{([^}]+)\}\s+(\w+)\s+(.+)/gi);
      
      if (bodyParamMatches) {
        for (const match of bodyParamMatches) {
          const paramMatch = match.match(/@param\s+\{([^}]+)\}\s+(\w+)\s+(.+)/i);
          if (paramMatch) {
            parameters.push({
              name: paramMatch[2],
              type: paramMatch[1],
              required: !paramMatch[1].includes('?'),
              location: 'body',
              description: paramMatch[3].trim()
            });
          }
        }
      } else {
        // Generic body parameter
        parameters.push({
          name: 'body',
          type: 'object',
          required: true,
          location: 'body',
          description: 'Request body'
        });
      }
    }

    return parameters;
  }

  private extractResponses(content: string, method: string): Record<string, ApiResponse> {
    const responses: Record<string, ApiResponse> = {};

    // Default responses based on HTTP method
    if (method === 'GET') {
      responses['200'] = {
        statusCode: '200',
        description: 'Success',
        example: { data: [] }
      };
      responses['404'] = {
        statusCode: '404',
        description: 'Not found',
        example: { error: 'Resource not found' }
      };
    } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
      responses['200'] = {
        statusCode: '200',
        description: 'Success',
        example: { success: true }
      };
      responses['201'] = {
        statusCode: '201',
        description: 'Created',
        example: { id: '123', success: true }
      };
      responses['400'] = {
        statusCode: '400',
        description: 'Bad request',
        example: { error: 'Invalid input' }
      };
    } else if (method === 'DELETE') {
      responses['200'] = {
        statusCode: '200',
        description: 'Success',
        example: { success: true }
      };
      responses['404'] = {
        statusCode: '404',
        description: 'Not found',
        example: { error: 'Resource not found' }
      };
    }

    // Try to extract custom responses from JSDoc
    const responseMatches = content.match(/@response\s+(\d+)\s+(.+)/gi);
    if (responseMatches) {
      for (const match of responseMatches) {
        const responseMatch = match.match(/@response\s+(\d+)\s+(.+)/i);
        if (responseMatch) {
          const fullDescription = responseMatch[2].trim();
          
          // Try to extract JSON example from description
          let example = {};
          let description = fullDescription;
          
          // Look for JSON pattern in description
          const jsonMatch = fullDescription.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              example = JSON.parse(jsonMatch[0]);
              // Remove JSON from description
              description = fullDescription.replace(/\{[\s\S]*\}/, '').trim();
            } catch (e) {
              // If JSON parsing fails, keep the original description
              description = fullDescription;
            }
          }
          
          responses[responseMatch[1]] = {
            statusCode: responseMatch[1],
            description: description,
            example: example
          };
        }
      }
    }

    return responses;
  }

  private extractTags(file: string): string[] {
    const tags: string[] = [];
    
    // Extract tags from file path - handle both Windows and Unix paths
    const normalizedPath = file.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/');
    const apiIndex = pathParts.findIndex(part => part === 'api');
    
    if (apiIndex !== -1 && apiIndex < pathParts.length - 1) {
      // Add the first directory after api as a tag
      const firstDir = pathParts[apiIndex + 1];
      if (firstDir && firstDir !== 'route.ts') {
        tags.push(firstDir);
      }
    }

    return tags;
  }
}
