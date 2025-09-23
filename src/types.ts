export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  location: 'query' | 'body' | 'header' | 'path';
  description?: string;
  example?: any;
}

export interface ApiResponse {
  statusCode: string;
  description: string;
  example?: any;
  schema?: any;
  requiredFields?: string[];
  optionalFields?: string[];
}

export interface ApiRequestHeader {
  name: string;
  required: boolean;
  description?: string;
}

export interface ApiRequestBody {
  type: string;
  schema?: any;
  description?: string;
  example?: any;
  required?: string[];
}

export interface ApiEndpoint {
  method: string;
  url: string;
  file: string;
  title?: string;
  description?: string;
  parameters: ApiParameter[];
  responses: Record<string, ApiResponse>;
  requestHeaders?: ApiRequestHeader[];
  requestBody?: ApiRequestBody;
  tags?: string[];
  summary?: string;
  requiresAuth?: boolean;
  responseSchema?: any;
  codeExamples?: {
    javascript: string;
    typescript: string;
    curl: string;
    python: string;
  };
  errorHandling?: {
    commonErrors: Array<{
      statusCode: string;
      description: string;
      handling: string;
    }>;
    endpointSpecific: Array<{
      statusCode: string;
      description: string;
      handling: string;
    }>;
  };
  rateLimiting?: {
    enabled: boolean;
    limits: {
      requests: number;
      window: string;
      burst: number;
    };
    headers: { [key: string]: string };
    handling: string;
  };
  pagination?: {
    supported: boolean;
    parameters?: {
      page: { type: string; default: number; description: string };
      limit: { type: string; default: number; description: string };
      offset: { type: string; default: number; description: string };
    };
    response?: {
      data: string;
      pagination: {
        page: string;
        limit: string;
        total: string;
        pages: string;
      };
    };
    example?: {
      request: string;
      response: any;
    };
  };
  authentication?: {
    type: 'none' | 'bearer' | 'api-key' | 'basic';
    required: boolean;
    description: string;
    headerName?: string;
    headerFormat?: string;
    loginEndpoint?: string;
    example?: {
      headers: {
        [key: string]: string;
      };
    };
    steps?: string[];
  };
}

export interface ApiDocumentation {
  info: {
    title: string;
    version: string;
    description?: string;
    baseUrl?: string;
    authentication?: {
      type?: 'bearer' | 'api-key' | 'basic' | 'none';
      required?: boolean;
      endpoint?: string;
      headerName?: string;
      description?: string;
    };
  };
  endpoints: ApiEndpoint[];
  totalEndpoints: number;
  generatedAt: string;
}

export interface ScannerOptions {
  path?: string;
  output?: string;
  format?: 'json' | 'json-folder' | 'markdown' | 'swagger' | 'react';
  verbose?: boolean;
  ignore?: string[];
  include?: string[];
  baseUrl?: string;
}

export interface ParsedRoute {
  method: string;
  path: string;
  file: string;
  content: string;
  ast?: any;
}

export interface ConfigFile {
  path?: string;
  output?: string;
  format?: 'json' | 'json-folder' | 'markdown' | 'swagger' | 'react';
  ignore?: string[];
  include?: string[];
  baseUrl?: string;
  authentication?: {
    type?: 'bearer' | 'api-key' | 'basic' | 'none';
    endpoint?: string;
    required?: boolean;
    headerName?: string;
  };
}
