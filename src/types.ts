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

export interface ApiEndpoint {
  method: string;
  url: string;
  file: string;
  description?: string;
  parameters: ApiParameter[];
  responses: Record<string, ApiResponse>;
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
  format?: 'json' | 'markdown' | 'swagger';
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
  format?: 'json' | 'markdown' | 'swagger';
  ignore?: string[];
  include?: string[];
  templates?: {
    json?: string;
    markdown?: string;
    swagger?: string;
  };
}
