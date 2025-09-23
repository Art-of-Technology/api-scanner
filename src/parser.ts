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
    
    // Determine action based on method
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
      summary: description,
      authentication: this.extractAuthentication(content, method)
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

    // Try to extract real response data from code
    const realResponseData = this.extractRealResponseData(content, method);
    const requiredFields = this.extractResponseRequiredFields(content, method);
    
    if (realResponseData) {
      responses['200'] = {
        statusCode: '200',
        description: 'Success',
        example: realResponseData,
        requiredFields: requiredFields.required,
        optionalFields: requiredFields.optional
      };
    } else {
      // Default responses based on HTTP method
      const requiredFields = this.extractResponseRequiredFields(content, method);
      
      if (method === 'GET') {
        responses['200'] = {
          statusCode: '200',
          description: 'Success',
          example: { data: [] },
          requiredFields: requiredFields.required,
          optionalFields: requiredFields.optional
        };
        responses['404'] = {
          statusCode: '404',
          description: 'Not found',
          example: { error: 'Resource not found' },
          requiredFields: ['error'],
          optionalFields: []
        };
      } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
        responses['200'] = {
          statusCode: '200',
          description: 'Success',
          example: { success: true },
          requiredFields: ['success'],
          optionalFields: []
        };
        responses['201'] = {
          statusCode: '201',
          description: 'Created',
          example: { id: '123', success: true },
          requiredFields: ['id', 'success'],
          optionalFields: []
        };
        responses['400'] = {
          statusCode: '400',
          description: 'Bad request',
          example: { error: 'Invalid input' },
          requiredFields: ['error'],
          optionalFields: []
        };
      } else if (method === 'DELETE') {
        responses['200'] = {
          statusCode: '200',
          description: 'Success',
          example: { success: true },
          requiredFields: ['success'],
          optionalFields: []
        };
        responses['404'] = {
          statusCode: '404',
          description: 'Not found',
          example: { error: 'Resource not found' },
          requiredFields: ['error'],
          optionalFields: []
        };
      }
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
          
          const requiredFields = this.extractResponseRequiredFields(content, method);
          responses[responseMatch[1]] = {
            statusCode: responseMatch[1],
            description: description,
            example: example,
            requiredFields: requiredFields.required,
            optionalFields: requiredFields.optional
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

    // Check if authentication is required and add auth header
    const authPatterns = [
      /getServerSession/gi,
      /getCurrentUser/gi,
      /getAuthSession/gi,
      /session/gi,
      /auth/gi,
      /unauthorized/gi,
      /401/gi
    ];

    let requiresAuth = false;
    for (const pattern of authPatterns) {
      if (pattern.test(content)) {
        requiresAuth = true;
        break;
      }
    }

    if (requiresAuth) {
      // Add authentication header if not already present
      if (!headers.find(h => h.name === 'Authorization')) {
        headers.unshift({
          name: 'Authorization',
          required: true,
          description: 'Bearer token for authentication. Get token from /api/auth/signin'
        });
      }
    }

    return headers;
  }

  private extractRequestBody(content: string, method: string): ApiRequestBody | undefined {
    // Only extract request body for methods that typically have a body
    const bodyMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
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

    // Only assume request body exists if we found actual patterns
    // Don't force request body for all POST/PUT/PATCH/DELETE methods

    if (!hasRequestBody) {
      return undefined;
    }

    // First try to extract real properties from destructuring patterns
    const realSchema = this.extractRealRequestBodySchema(content);
    if (realSchema) {
      return {
        type: 'application/json',
        schema: realSchema.schema,
        description: `Request body for ${method} ${method === 'POST' ? 'creating' : method === 'PUT' ? 'updating' : method === 'PATCH' ? 'patching' : 'deleting'} resource`,
        example: realSchema.example,
        required: realSchema.required
      };
    }

    const realExample = this.extractRealRequestBodyExample(content);
    if (realExample) {
      return {
        type: 'application/json',
        schema: {
          type: 'object',
          properties: Object.keys(realExample).reduce((acc, key) => {
            acc[key] = { type: typeof realExample[key] === 'string' ? 'string' : typeof realExample[key] === 'number' ? 'number' : 'boolean' };
            return acc;
          }, {} as any),
          required: []
        },
        description: `Request body for ${method} ${method === 'POST' ? 'creating' : method === 'PUT' ? 'updating' : method === 'PATCH' ? 'patching' : 'deleting'} resource`,
        example: realExample
      };
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
      description: `Request body for ${method} ${method === 'POST' ? 'creating' : method === 'PUT' ? 'updating' : method === 'PATCH' ? 'patching' : 'deleting'} resource`,
      example: Object.keys(example).length > 0 ? example : (schemaType === 'object' ? {} : null)
    };
  }

  private extractRealRequestBodySchema(content: string): { schema: any; example: any; required: string[] } | null {
    // Look for destructuring patterns like: const { name, description } = body;
    const destructuringPattern = /const\s*{\s*([^}]+)\s*}\s*=\s*body/gi;
    const match = destructuringPattern.exec(content);
    
    // Also look for: const body = await request.json(); const { name, description } = body;
    if (!match) {
      const twoStepPattern = /const\s+body\s*=\s*await\s+request\.json\(\);\s*const\s*{\s*([^}]+)\s*}\s*=\s*body/gi;
      const twoStepMatch = twoStepPattern.exec(content);
      if (twoStepMatch) {
        const properties = twoStepMatch[1].split(',').map(p => p.trim());
        const schema: any = {
          type: 'object',
          properties: {},
          required: []
        };
        const example: any = {};
        const required: string[] = [];
        
        for (const prop of properties) {
          const cleanProp = prop.replace(/\?/g, '').trim();
          const isRequired = !prop.includes('?');
          
          schema.properties[cleanProp] = {
            type: 'string',
            description: `${cleanProp} field`
          };
          
          if (isRequired) {
            required.push(cleanProp);
          }
          
          example[cleanProp] = `[${cleanProp.toUpperCase()}]`;
        }
        
        schema.required = required;
        
        return { schema, example, required };
      }
    }
    
    if (match) {
      const properties = match[1].split(',').map(p => p.trim());
      const schema: any = {
        type: 'object',
        properties: {},
        required: []
      };
      const example: any = {};
      const required: string[] = [];
      
      for (const prop of properties) {
        const cleanProp = prop.replace(/\?/g, '').trim(); // Remove optional marker
        const isRequired = !prop.includes('?');
        
        // Try to detect union types and enums
        const typeInfo = this.detectFieldType(cleanProp, content);
        
        schema.properties[cleanProp] = {
          type: typeInfo.type,
          description: `${cleanProp} field`,
          ...(typeInfo.enum && { enum: typeInfo.enum }),
          ...(typeInfo.format && { format: typeInfo.format })
        };
        
        if (isRequired) {
          required.push(cleanProp);
        }
        
        // Show field types instead of placeholders
        example[cleanProp] = schema.properties[cleanProp].type;
      }
      
      return { schema, example, required };
    }
    
    return null;
  }

  private detectFieldType(fieldName: string, content: string): { type: string; enum?: string[]; format?: string } {
    // Look for TypeScript interface definitions
    const interfacePattern = new RegExp(`interface\\s+\\w+\\s*{[^}]*${fieldName}\\s*:\\s*([^;,\n]+)`, 'gi');
    const typePattern = new RegExp(`type\\s+\\w+\\s*=\\s*{[^}]*${fieldName}\\s*:\\s*([^;,\n]+)`, 'gi');
    
    const patterns = [interfacePattern, typePattern];
    
    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (match) {
        const typeDef = match[1].trim();
        
        // Check for union types like 'private' | 'public'
        if (typeDef.includes('|')) {
          const enumValues = typeDef.split('|').map(t => t.trim().replace(/['"]/g, ''));
          return {
            type: 'string',
            enum: enumValues
          };
        }
        
        // Check for specific types
        if (typeDef.includes('string')) {
          return { type: 'string' };
        } else if (typeDef.includes('number')) {
          return { type: 'number' };
        } else if (typeDef.includes('boolean')) {
          return { type: 'boolean' };
        } else if (typeDef.includes('Date')) {
          return { type: 'string', format: 'date-time' };
        }
      }
    }
    
    // Default to string if no type found
    return { type: 'string' };
  }

  public extractRealRequestBodyExample(content: string): any {
    const patterns = [
      /const\s*{\s*([^}]+)\s*}\s*=\s*await\s+request\.json\(\)/gi,
      /const\s*{\s*([^}]+)\s*}\s*=\s*await\s+req\.json\(\)/gi,
      /const\s+\w+\s*=\s*await\s+request\.json\(\);\s*const\s*{\s*([^}]+)\s*}\s*=\s*\w+/gi,
      /const\s+body\s*=\s*await\s+request\.json\(\);\s*const\s*{\s*([^}]+)\s*}\s*=\s*body/gi,
      /const\s+body\s*=\s*await\s+req\.json\(\);\s*const\s*{\s*([^}]+)\s*}\s*=\s*body/gi,
      /request\.body\.(\w+)/gi,
      /req\.body\.(\w+)/gi
    ];

    const foundProperties = new Set<string>();
    
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const propertyMatch = match.match(/(\w+)/g);
          if (propertyMatch) {
            propertyMatch.forEach(prop => {
              if (prop !== 'const' && prop !== 'await' && prop !== 'request' && prop !== 'req' && prop !== 'json' && prop !== 'body') {
                foundProperties.add(prop);
              }
            });
          }
        }
      }
    }

    if (foundProperties.size > 0) {
      const example: any = {};
      foundProperties.forEach(prop => {
        // Generate realistic example based on property name
        if (prop.toLowerCase().includes('email')) {
          example[prop] = "user@example.com";
        } else if (prop.toLowerCase().includes('name')) {
          example[prop] = "John Doe";
        } else if (prop.toLowerCase().includes('title')) {
          example[prop] = "Sample Title";
        } else if (prop.toLowerCase().includes('description')) {
          example[prop] = "Sample description";
        } else if (prop.toLowerCase().includes('password')) {
          example[prop] = "password123";
        } else if (prop.toLowerCase().includes('id')) {
          example[prop] = "123";
        } else if (prop.toLowerCase().includes('active') || prop.toLowerCase().includes('enabled')) {
          example[prop] = true;
        } else {
          example[prop] = `sample_${prop}`;
        }
      });
      return example;
    }

    return null;
  }

  private extractResponseRequiredFields(content: string, method: string): { required: string[], optional: string[] } {
    // Tespit edilen response field'larından zorunlu/opsiyonel belirle
    const requiredFields: string[] = [];
    const optionalFields: string[] = [];
    
    // Genel pattern'ler
    const commonRequired = ['id', 'createdAt', 'updatedAt', 'status'];
    const commonOptional = ['description', 'notes', 'tags', 'metadata'];
    
    // Route dosyasından field kullanımını analiz et
    if (content.includes('id')) requiredFields.push('id');
    if (content.includes('createdAt')) requiredFields.push('createdAt');
    if (content.includes('updatedAt')) requiredFields.push('updatedAt');
    if (content.includes('status')) requiredFields.push('status');
    
    if (content.includes('description')) optionalFields.push('description');
    if (content.includes('notes')) optionalFields.push('notes');
    if (content.includes('tags')) optionalFields.push('tags');
    
    return { required: requiredFields, optional: optionalFields };
  }

  private extractRealResponseData(content: string, method: string): any {
    // Look for response patterns in the code
    const responsePatterns = [
      // return NextResponse.json(data)
      /return\s+NextResponse\.json\(([^)]+)\)/gi,
      // return NextResponse.json(data, { status: 200 })
      /return\s+NextResponse\.json\(([^,]+),\s*\{\s*status:\s*\d+\s*\}\)/gi,
      // return NextResponse.json(data, { status: 201 })
      /return\s+NextResponse\.json\(([^,]+),\s*\{\s*status:\s*201\s*\}\)/gi
    ];

    for (const pattern of responsePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Extract the data part
          const dataMatch = match.match(/NextResponse\.json\(([^,)]+)/);
          if (dataMatch) {
            const dataPart = dataMatch[1].trim();
            
            // Try to extract variable names or object properties
            if (dataPart.includes('workspaces')) {
              // Generate realistic workspace data based on current user
              const currentDate = new Date().toISOString();
              const userId = "user_" + Math.random().toString(36).substr(2, 9);
              
              return [
                {
                  id: "ws_" + Math.random().toString(36).substr(2, 9),
                  name: "My Personal Workspace",
                  description: "Personal workspace for development and testing",
                  ownerId: userId,
                  createdAt: currentDate,
                  slug: "my-personal-workspace",
                  members: [
                    {
                      id: "member_" + Math.random().toString(36).substr(2, 9),
                      userId: userId,
                      role: "owner",
                      status: true
                    }
                  ]
                },
                {
                  id: "ws_" + Math.random().toString(36).substr(2, 9),
                  name: "Team Collaboration",
                  description: "Shared workspace for team projects",
                  ownerId: "user_" + Math.random().toString(36).substr(2, 9),
                  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                  slug: "team-collaboration",
                  members: [
                    {
                      id: "member_" + Math.random().toString(36).substr(2, 9),
                      userId: "user_" + Math.random().toString(36).substr(2, 9),
                      role: "owner",
                      status: true
                    },
                    {
                      id: "member_" + Math.random().toString(36).substr(2, 9),
                      userId: userId,
                      role: "member",
                      status: true
                    }
                  ]
                }
              ];
            } else if (dataPart.includes('user')) {
              return {
                id: "user_789",
                name: "John Doe",
                email: "john.doe@example.com",
                image: "https://example.com/avatar.jpg",
                role: "user",
                team: "Engineering",
                currentFocus: "Frontend Development",
                expertise: ["React", "TypeScript", "Next.js"],
                createdAt: "2024-01-01T00:00:00Z"
              };
            } else if (dataPart.includes('tasks')) {
              return {
                tasks: [
                  {
                    id: "task_123",
                    title: "Implement user authentication",
                    description: "Add login and registration functionality",
                    type: "TASK",
                    priority: "HIGH",
                    status: "IN_PROGRESS",
                    position: 1,
                    dueDate: "2024-01-20T00:00:00Z",
                    taskBoardId: "board_456",
                    columnId: "column_789",
                    workspaceId: "ws_123456",
                    storyId: "story_101",
                    reporterId: "user_789",
                    assigneeId: "user_456"
                  },
                  {
                    id: "task_124",
                    title: "Design user interface",
                    description: "Create mockups for the dashboard",
                    type: "TASK",
                    priority: "MEDIUM",
                    status: "TODO",
                    position: 2,
                    dueDate: "2024-01-25T00:00:00Z",
                    taskBoardId: "board_456",
                    columnId: "column_789",
                    workspaceId: "ws_123456",
                    storyId: "story_102",
                    reporterId: "user_789",
                    assigneeId: "user_789"
                  }
                ]
              };
            } else if (dataPart.includes('issues') || dataPart.includes('issue')) {
              return [
                {
                  id: "issue_" + Math.random().toString(36).substr(2, 9),
                  title: "Sample Issue Title",
                  description: "Sample issue description",
                  type: "BUG",
                  priority: "HIGH",
                  status: "OPEN",
                  position: 1,
                  dueDate: new Date().toISOString(),
                  taskBoardId: "board_" + Math.random().toString(36).substr(2, 9),
                  columnId: "column_" + Math.random().toString(36).substr(2, 9),
                  workspaceId: "ws_" + Math.random().toString(36).substr(2, 9),
                  storyId: "story_" + Math.random().toString(36).substr(2, 9),
                  reporterId: "user_" + Math.random().toString(36).substr(2, 9),
                  assigneeId: "user_" + Math.random().toString(36).substr(2, 9),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                },
                {
                  id: "issue_" + Math.random().toString(36).substr(2, 9),
                  title: "Another Issue",
                  description: "Another issue description",
                  type: "FEATURE",
                  priority: "MEDIUM",
                  status: "IN_PROGRESS",
                  position: 2,
                  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  taskBoardId: "board_" + Math.random().toString(36).substr(2, 9),
                  columnId: "column_" + Math.random().toString(36).substr(2, 9),
                  workspaceId: "ws_" + Math.random().toString(36).substr(2, 9),
                  storyId: "story_" + Math.random().toString(36).substr(2, 9),
                  reporterId: "user_" + Math.random().toString(36).substr(2, 9),
                  assigneeId: "user_" + Math.random().toString(36).substr(2, 9),
                  createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                  updatedAt: new Date().toISOString()
                }
              ];
            } else if (dataPart.includes('success')) {
              return { 
                success: true,
                message: "Operation completed successfully",
                timestamp: "2024-01-15T10:30:00Z"
              };
            } else if (dataPart.includes('data')) {
              return { 
                data: [],
                pagination: {
                  page: 1,
                  limit: 20,
                  total: 0,
                  pages: 0
                }
              };
            }
          }
        }
      }
    }

    return null;
  }

  private extractAuthentication(content: string, method: string): any {
    // Check if authentication is required
    const authPatterns = [
      /getServerSession/gi,
      /getCurrentUser/gi,
      /getAuthSession/gi,
      /session/gi,
      /auth/gi,
      /unauthorized/gi,
      /401/gi
    ];

    let requiresAuth = false;
    for (const pattern of authPatterns) {
      if (pattern.test(content)) {
        requiresAuth = true;
        break;
      }
    }

    if (!requiresAuth) {
      return {
        type: 'none',
        required: false,
        description: 'No authentication required'
      };
    }

    // Determine authentication type
    let authType = 'bearer';
    if (content.includes('API_KEY') || content.includes('api-key')) {
      authType = 'api-key';
    } else if (content.includes('basic') || content.includes('Basic')) {
      authType = 'basic';
    }

    return {
      type: authType,
      required: true,
      description: authType === 'bearer' 
        ? 'Bearer token authentication required. Include Authorization header with your request.'
        : authType === 'api-key'
        ? 'API key authentication required. Include X-API-Key header with your request.'
        : 'Basic authentication required.',
      headerName: authType === 'bearer' ? 'Authorization' : authType === 'api-key' ? 'X-API-Key' : 'Authorization',
      headerFormat: authType === 'bearer' 
        ? 'Bearer <your-token>'
        : authType === 'api-key'
        ? '<your-api-key>'
        : 'Basic <base64-encoded-credentials>',
      loginEndpoint: '/api/auth/signin',
      example: {
        headers: {
          'Authorization': authType === 'bearer' ? 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' : 'Basic dXNlcjpwYXNzd29yZA==',
          'Content-Type': 'application/json'
        }
      },
      steps: [
        '1. Send POST request to /api/auth/signin with your credentials',
        '2. Receive authentication token in response',
        '3. Include token in Authorization header for all protected endpoints',
        '4. Token expires after 24 hours, re-authenticate as needed',
        '5. Use NextAuth.js client: signIn() for login, signOut() for logout'
      ]
    };
  }
}
