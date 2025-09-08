import { ParsedRoute, ApiEndpoint, ApiParameter, ApiResponse, ApiRequestHeader, ApiRequestBody } from './types';

export class Parser {
  private httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  /**
   * Generate automatic title and description based on URL and method
   */
  private generateEndpointInfo(url: string, method: string): { title: string, description: string } {
    const pathParts = url.split('/').filter(part => part && part !== 'api');
    const resource = pathParts[0] || 'resource';
    const action = pathParts[1] || '';
    const id = pathParts[2] || '';
    
    // Method'a göre action belirle
    const actionMap: { [key: string]: string } = {
      'GET': action ? 'Get' : 'List',
      'POST': 'Create',
      'PUT': 'Update', 
      'PATCH': 'Update',
      'DELETE': 'Delete',
      'HEAD': 'Check',
      'OPTIONS': 'Options'
    };
    
    const baseAction = actionMap[method] || 'Handle';
    const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
    
    // Title generation
    let title = `${baseAction} ${resourceName}`;
    if (action) {
      const actionName = action.charAt(0).toUpperCase() + action.slice(1);
      title += ` ${actionName}`;
    }
    if (id) {
      title += ` by ID`;
    }
    
    // Description generation
    let description = `${baseAction.toLowerCase()} ${resourceName.toLowerCase()}`;
    if (action) {
      description += ` ${action.toLowerCase()}`;
    }
    if (id) {
      description += ` by specific identifier`;
    }
    
    // Method-specific descriptions
    const methodDescriptions: { [key: string]: string } = {
      'GET': action ? `Retrieve ${resourceName.toLowerCase()} ${action.toLowerCase()} information` : `Retrieve a list of ${resourceName.toLowerCase()}s`,
      'POST': `Create a new ${resourceName.toLowerCase()}${action ? ` ${action.toLowerCase()}` : ''}`,
      'PUT': `Update an existing ${resourceName.toLowerCase()}${action ? ` ${action.toLowerCase()}` : ''}`,
      'PATCH': `Partially update an existing ${resourceName.toLowerCase()}${action ? ` ${action.toLowerCase()}` : ''}`,
      'DELETE': `Remove a ${resourceName.toLowerCase()}${action ? ` ${action.toLowerCase()}` : ''}`,
      'HEAD': `Check if ${resourceName.toLowerCase()}${action ? ` ${action.toLowerCase()}` : ''} exists`,
      'OPTIONS': `Get available options for ${resourceName.toLowerCase()}${action ? ` ${action.toLowerCase()}` : ''}`
    };
    
    description = methodDescriptions[method] || description;
    
    return { title, description };
  }

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

    // Extract title and description from JSDoc comments
    const jsdocInfo = this.extractJSDocInfo(content, method);
    
    // Generate automatic title and description if JSDoc doesn't exist
    const generatedInfo = this.generateEndpointInfo(path, method);
    
    // Use JSDoc info if available, otherwise use generated
    const title = jsdocInfo.title || generatedInfo.title;
    const description = jsdocInfo.description || generatedInfo.description;
    
    // Extract parameters
    const parameters = this.extractParameters(content, method, path);
    
    // Extract responses
    const responses = this.extractResponses(content, method);
    
    // Extract request headers
    const requestHeaders = this.extractRequestHeaders(content, method);
    
    // Extract request body
    const requestBody = this.extractRequestBody(content, method);
    
    // Extract tags from file path
    const tags = this.extractTags(file);

    return {
      method,
      url: path,
      file,
      title,
      description,
      parameters,
      responses,
      requestHeaders,
      requestBody,
      tags,
      summary: description
    };
  }

  private extractJSDocInfo(content: string, method: string): { title?: string, description?: string } {
    // Look for JSDoc comments above the method
    const methodPattern = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`, 'i');
    const match = content.match(methodPattern);
    
    if (!match) return {};

    const methodIndex = match.index!;
    const beforeMethod = content.substring(0, methodIndex);
    
    // Find the last JSDoc comment before the method
    const jsdocPattern = /\/\*\*([\s\S]*?)\*\//g;
    const jsdocMatches = [...beforeMethod.matchAll(jsdocPattern)];
    
    if (jsdocMatches.length === 0) return {};

    const lastJSDoc = jsdocMatches[jsdocMatches.length - 1][1];
    
    // Extract @api {method} url title pattern
    const apiMatch = lastJSDoc.match(/@api\s+\{(\w+)\}\s+(\S+)\s+(.+)/);
    if (apiMatch) {
      return {
        title: apiMatch[3].trim(),
        description: lastJSDoc.match(/@apiDescription\s+(.+)/)?.[1]?.trim()
      };
    }
    
    // Extract description from JSDoc
    const descriptionMatch = lastJSDoc.match(/^\s*\*\s*(.+)$/m);
    return {
      description: descriptionMatch ? descriptionMatch[1].trim() : undefined
    };
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

  private extractRequestHeaders(content: string, method: string): ApiRequestHeader[] {
    const headers: ApiRequestHeader[] = [];
    
    // Look for headers in request object destructuring
    const headerPatterns = [
      // const { headers } = request
      /const\s*{\s*headers\s*}\s*=\s*request/gi,
      // const { headers: reqHeaders } = request
      /const\s*{\s*headers:\s*\w+\s*}\s*=\s*request/gi,
      // request.headers
      /request\.headers/gi,
      // req.headers
      /req\.headers/gi
    ];

    for (const pattern of headerPatterns) {
      if (pattern.test(content)) {
        // Common API headers
        const commonHeaders = [
          { name: 'Authorization', required: false, description: 'Bearer token for authentication' },
          { name: 'Content-Type', required: false, description: 'Content type of the request' },
          { name: 'Accept', required: false, description: 'Acceptable response types' },
          { name: 'User-Agent', required: false, description: 'Client user agent' },
          { name: 'X-API-Key', required: false, description: 'API key for authentication' },
          { name: 'X-Request-ID', required: false, description: 'Unique request identifier' }
        ];
        
        headers.push(...commonHeaders);
        break;
      }
    }

    // Look for specific header usage in the code
    const specificHeaderPattern = /headers\[['"`]([^'"`]+)['"`]\]/gi;
    let match;
    while ((match = specificHeaderPattern.exec(content)) !== null) {
      const headerName = match[1];
      if (!headers.find(h => h.name === headerName)) {
        headers.push({
          name: headerName,
          required: false,
          description: `Custom header: ${headerName}`
        });
      }
    }

    return headers;
  }

  private extractRequestBody(content: string, method: string): ApiRequestBody | undefined {
    // Only extract request body for methods that typically have a body
    const bodyMethods = ['POST', 'PUT', 'PATCH'];
    if (!bodyMethods.includes(method)) {
      return undefined;
    }

    // Look for request body patterns
    const bodyPatterns = [
      // const { body } = request
      /const\s*{\s*body\s*}\s*=\s*request/gi,
      // const { body: requestBody } = request
      /const\s*{\s*body:\s*\w+\s*}\s*=\s*request/gi,
      // const body = await request.json()
      /const\s+\w+\s*=\s*await\s+request\.json\(\)/gi,
      // const body = await req.json()
      /const\s+\w+\s*=\s*await\s+req\.json\(\)/gi,
      // request.body
      /request\.body/gi,
      // req.body
      /req\.body/gi,
      // await request.json()
      /await\s+request\.json\(\)/gi,
      // await req.json()
      /await\s+req\.json\(\)/gi
    ];

    let hasRequestBody = false;
    for (const pattern of bodyPatterns) {
      if (pattern.test(content)) {
        hasRequestBody = true;
        break;
      }
    }

    if (!hasRequestBody) {
      return undefined;
    }

    // Look for TypeScript interface or type definitions
    const interfacePattern = /interface\s+(\w+)\s*{[^}]*}/gi;
    const typePattern = /type\s+(\w+)\s*=\s*{[^}]*}/gi;
    
    let schemaType = 'object';
    let schema: any = {};
    let example: any = {};
    
    // Try to find interface or type definition
    const interfaceMatches = content.match(interfacePattern);
    const typeMatches = content.match(typePattern);
    
    if (interfaceMatches || typeMatches) {
      schemaType = 'object';
      schema = {
        type: 'object',
        properties: {},
        required: []
      };
      
      // Try to extract properties from interface
      const allMatches = [...(interfaceMatches || []), ...(typeMatches || [])];
      for (const match of allMatches) {
        // Extract properties from interface
        const propertyMatches = match.match(/(\w+)\s*:\s*([^;,\n]+)/g);
        if (propertyMatches) {
          for (const prop of propertyMatches) {
            const [name, type] = prop.split(':').map(s => s.trim());
            if (name && type) {
              schema.properties[name] = {
                type: type.includes('string') ? 'string' : 
                      type.includes('number') ? 'number' : 
                      type.includes('boolean') ? 'boolean' : 
                      type.includes('[]') ? 'array' : 'object'
              };
              
              // Generate example value
              if (type.includes('string')) {
                example[name] = `example_${name}`;
              } else if (type.includes('number')) {
                example[name] = 0;
              } else if (type.includes('boolean')) {
                example[name] = true;
              } else if (type.includes('[]')) {
                example[name] = [];
              } else {
                example[name] = {};
              }
            }
          }
        }
      }
    }

    return {
      type: 'application/json',
      schema: schema,
      description: `Request body for ${method} ${method === 'POST' ? 'creating' : method === 'PUT' ? 'updating' : 'patching'} resource`,
      example: Object.keys(example).length > 0 ? example : (schemaType === 'object' ? {} : null)
    };
  }
}
