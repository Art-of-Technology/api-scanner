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
}

export interface ApiDocumentation {
  info: {
    title: string;
    version: string;
    description?: string;
  };
  endpoints: ApiEndpoint[];
  totalEndpoints: number;
  generatedAt: string;
}

export interface ScannerOptions {
  path?: string;
  output?: string;
  format?: 'json' | 'markdown' | 'swagger' | 'html';
  verbose?: boolean;
  ignore?: string[];
  include?: string[];
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
  format?: 'json' | 'markdown' | 'swagger' | 'html';
  ignore?: string[];
  include?: string[];
  templates?: {
    json?: string;
    markdown?: string;
    swagger?: string;
    html?: string;
  };
}
