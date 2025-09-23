import React from 'react';
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { EndpointCardProps, ApiParameter, ApiResponse } from './types';
import { cn } from './lib/utils';
import { Editor } from '@monaco-editor/react';

export function EndpointCard({ endpoint, index }: EndpointCardProps) {
  const maskSensitiveData = (text: string): string => {
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
  };

  const getMonacoLanguage = (language: string): string => {
    const languageMap: { [key: string]: string } = {
      'React/TypeScript': 'typescript',
      'TypeScript': 'typescript',
      'JavaScript': 'javascript',
      'Python': 'python',
      'PHP': 'php',
      'Java': 'java',
      'C#': 'csharp',
      'Go': 'go',
      'Rust': 'rust'
    };
    return languageMap[language] || 'javascript';
  };

  const getMethodColor = (method: string): "get" | "post" | "put" | "delete" | "patch" | "head" | "options" => {
    return method.toLowerCase() as "get" | "post" | "put" | "delete" | "patch" | "head" | "options";
  };

  const generateFallbackTitle = (method: string, url: string) => {
    const pathParts = url.split('/').filter(part => part && part !== 'api');
    const resource = pathParts[0] || 'resource';
    const action = pathParts[1] || '';
    
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
    
    let title = `${baseAction} ${resourceName}`;
    if (action) {
      const actionName = action.charAt(0).toUpperCase() + action.slice(1);
      title += ` ${actionName}`;
    }
    
    return title;
  };

  const renderParameters = (parameters: ApiParameter[]) => {
    if (!parameters || parameters.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No parameters defined</p>
      );
    }

    const groupedParams = parameters.reduce((acc, param) => {
      if (!acc[param.location]) acc[param.location] = [];
      acc[param.location].push(param);
      return acc;
    }, {} as Record<string, ApiParameter[]>);

    return (
      <div className="space-y-4">
        {Object.entries(groupedParams).map(([location, params]: [string, ApiParameter[]]) => (
          <div key={location}>
            <h4 className="text-sm font-medium mb-2 capitalize">{location} Parameters</h4>
            <div className="space-y-2">
              {params.map((param: ApiParameter, idx: number) => (
                <div key={idx} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                        {param.name}
                      </code>
                      <Badge variant="outline" className="text-xs">
                        {param.type}
                      </Badge>
                    </div>
                    <Badge variant={param.required ? "destructive" : "secondary"} className="text-xs">
                      {param.required ? "Required" : "Optional"}
                    </Badge>
                  </div>
                  {param.description && (
                    <p className="text-sm text-muted-foreground">{param.description}</p>
                  )}
                  {param.example && (
                    <div className="mt-2">
                      <code className="text-xs bg-background px-2 py-1 rounded block">
                        Example: {typeof param.example === 'string' ? param.example : JSON.stringify(param.example)}
                      </code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderResponses = (responses: Record<string, ApiResponse>) => {
    if (!responses || Object.keys(responses).length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No responses defined</p>
      );
    }

    return (
      <div className="space-y-3">
        {Object.entries(responses).map(([statusCode, response]) => {
          const isSuccess = statusCode.startsWith('2');
          const isError = statusCode.startsWith('4') || statusCode.startsWith('5');
          
          return (
            <div key={statusCode} className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                {isSuccess && <CheckCircle className="h-4 w-4 text-green-500" />}
                {isError && <AlertCircle className="h-4 w-4 text-red-500" />}
                <Badge 
                  variant={isSuccess ? "default" : isError ? "destructive" : "secondary"}
                  className="font-mono"
                >
                  {statusCode}
                </Badge>
                <span className="text-sm font-medium">{response.description}</span>
              </div>
              
              {response.example && (
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">Example Response:</div>
                  <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                    <code>{JSON.stringify(response.example, null, 2)}</code>
                  </pre>
                </div>
              )}
              
              {/* Required Fields */}
              {((response as any).requiredFields || (response as any).optionalFields) && (
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-2">Field Requirements:</div>
                  <div className="space-y-2">
                    {(response as any).requiredFields && (response as any).requiredFields.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">Required</Badge>
                        <span className="text-xs">{(response as any).requiredFields.join(', ')}</span>
                      </div>
                    )}
                    {(response as any).optionalFields && (response as any).optionalFields.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                        <span className="text-xs">{(response as any).optionalFields.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderRequestHeaders = () => {
    if (!endpoint.requestHeaders || endpoint.requestHeaders.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No specific headers required</p>
      );
    }

    return (
      <div className="space-y-2">
        {endpoint.requestHeaders.map((header, idx) => (
          <div key={idx} className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                {header.name}
              </code>
              <Badge variant={header.required ? "destructive" : "secondary"} className="text-xs">
                {header.required ? "Required" : "Optional"}
              </Badge>
            </div>
            {header.description && (
              <p className="text-sm text-muted-foreground">{header.description}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderRequestBody = () => {
    if (!endpoint.requestBody) {
      return (
        <p className="text-sm text-muted-foreground">No request body required</p>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{endpoint.requestBody.type || 'application/json'}</Badge>
        </div>
        
        {endpoint.requestBody.description && (
          <p className="text-sm text-muted-foreground">{endpoint.requestBody.description}</p>
        )}
        
        {endpoint.requestBody.example && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Example Request Body:</div>
            <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
              <code>{JSON.stringify(endpoint.requestBody.example, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    );
  };

  const title = endpoint.title || generateFallbackTitle(endpoint.method, endpoint.url);

  return (
    <Card className="w-full overflow-y-auto">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge 
              variant={getMethodColor(endpoint.method || 'GET')}
              className="text-sm font-mono px-3 py-1"
            >
              {endpoint.method || 'GET'}
            </Badge>
            <code className="text-lg font-mono bg-muted px-3 py-1 rounded">
              {endpoint.url}
            </code>
          </div>
        </div>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          {endpoint.description && (
            <CardDescription className="text-base mt-2">
              {endpoint.description}
            </CardDescription>
          )}
          
          {/* New endpoint info */}
          <div className="mt-3 flex flex-wrap gap-2">
            {(endpoint as any).requiresAuth !== undefined && (
              <Badge 
                variant={(endpoint as any).requiresAuth ? "destructive" : "secondary"}
                className="text-xs"
              >
                {(endpoint as any).requiresAuth ? "Auth Required" : "Public"}
              </Badge>
            )}
            {(endpoint as any).responseSchema && (
              <Badge variant="outline" className="text-xs">
                Schema Available
              </Badge>
            )}
          </div>
        </div>
        
      </CardHeader>

      <CardContent className="pt-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="responses">Responses</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Endpoint Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Method</div>
                  <Badge variant={getMethodColor(endpoint.method || 'GET')}>
                    {endpoint.method || 'GET'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">URL</div>
                  <code className="text-sm bg-muted px-2 py-1 rounded block">
                    {endpoint.url}
                  </code>
                </div>
                {(endpoint as any).requiresAuth !== undefined && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Authentication</div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={(endpoint as any).requiresAuth ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {(endpoint as any).requiresAuth ? "Required" : "Not Required"}
                      </Badge>
                      {(endpoint as any).requiresAuth && (
                        <span className="text-xs text-muted-foreground">
                          Bearer token needed
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {(endpoint as any).responseSchema && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Response Schema</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Available
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Type: {(endpoint as any).responseSchema.type}
                      </span>
                    </div>
                  </div>
                )}
                {endpoint.tags && endpoint.tags.length > 0 && (
                  <div className="space-y-2 md:col-span-2">
                    <div className="text-sm font-medium">Tags</div>
                    <div className="flex gap-2 flex-wrap">
                      {endpoint.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="request" className="space-y-4 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Request Details</h3>
              
              {/* Authentication Info */}
              {(endpoint as any).requiresAuth !== undefined && (
                <div className="mb-6 p-4 bg-muted rounded-lg">
                  <h4 className="text-base font-medium mb-3">Authentication</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={(endpoint as any).requiresAuth ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {(endpoint as any).requiresAuth ? "Required" : "Not Required"}
                      </Badge>
                    </div>
                    {(endpoint as any).requiresAuth && (
                      <div className="text-sm text-muted-foreground">
                        <p>This endpoint requires authentication. Include the following header:</p>
                        <code className="block mt-1 px-2 py-1 bg-background rounded text-xs">
                          Authorization: Bearer {'<your-token>'}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Parameters */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-medium mb-3">Parameters</h4>
                  {renderParameters(endpoint.parameters)}
                </div>
                
                {/* Request Body for POST/PUT/PATCH */}
                {(['POST', 'PUT', 'PATCH'].includes(endpoint.method)) && (
                  <div>
                    <h4 className="text-base font-medium mb-3">Request Body</h4>
                    {renderRequestBody()}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="responses" className="space-y-4 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Response Details</h3>
              
              {/* Response Schema */}
              {(endpoint as any).responseSchema && (
                <div className="mb-6 p-4 bg-muted rounded-lg">
                  <h4 className="text-base font-medium mb-3">Response Schema</h4>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <p>Expected response format:</p>
                      <div className="mt-2 border rounded overflow-hidden">
                        <Editor
                          height="200px"
                          language="json"
                          value={maskSensitiveData(JSON.stringify((endpoint as any).responseSchema, null, 2))}
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 12,
                            lineNumbers: 'on',
                            wordWrap: 'on',
                            automaticLayout: true,
                            theme: 'vs-dark',
                            padding: { top: 8, bottom: 8 },
                            scrollbar: {
                              vertical: 'auto',
                              horizontal: 'auto',
                              verticalScrollbarSize: 6,
                              horizontalScrollbarSize: 6
                            },
                            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace",
                            fontLigatures: true,
                            cursorStyle: 'line',
                            cursorWidth: 2,
                            renderLineHighlight: 'line',
                            renderWhitespace: 'selection',
                            bracketPairColorization: { enabled: true },
                            guides: {
                              bracketPairs: true,
                              indentation: true
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {renderResponses(endpoint.responses)}
            </div>
          </TabsContent>

          <TabsContent value="headers" className="space-y-4 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Request Headers</h3>
              
              {/* Authentication Headers */}
              {(endpoint as any).requiresAuth && (
                <div className="mb-6 p-4 bg-muted rounded-lg">
                  <h4 className="text-base font-medium mb-3">Required Headers</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div>
                        <code className="text-sm font-mono">Authorization</code>
                        <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                      </div>
                      <code className="text-xs text-muted-foreground">Bearer {'<token>'}</code>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div>
                        <code className="text-sm font-mono">Content-Type</code>
                        <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                      </div>
                      <code className="text-xs text-muted-foreground">application/json</code>
                    </div>
                  </div>
                </div>
              )}
              
              {renderRequestHeaders()}
            </div>
          </TabsContent>

          <TabsContent value="examples" className="space-y-4 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Code Example</h3>
              {(endpoint as any).codeExamples && (
                <div className="space-y-4">
                  {/* Language Badge */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {(endpoint as any).codeExamples.language}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Real code from your application
                    </span>
                  </div>

                  {/* Single Code Example */}
                  <div className="border rounded-lg overflow-hidden">
                    <Editor
                      height="300px"
                      language={getMonacoLanguage((endpoint as any).codeExamples.language)}
                      value={maskSensitiveData((endpoint as any).codeExamples.example)}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          fontSize: 14,
                          lineNumbers: 'on',
                          wordWrap: 'on',
                          automaticLayout: true,
                          theme: 'vs-dark',
                          padding: { top: 16, bottom: 16 },
                          scrollbar: {
                            vertical: 'auto',
                            horizontal: 'auto',
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8
                          },
                          fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace",
                          fontLigatures: true,
                          cursorStyle: 'line',
                          cursorWidth: 2,
                          renderLineHighlight: 'line',
                          renderWhitespace: 'selection',
                          bracketPairColorization: { enabled: true },
                          guides: {
                            bracketPairs: true,
                            indentation: true
                          }
                        }}
                    />
                  </div>

                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Error Handling</h3>
              {(endpoint as any).errorHandling && (
                <div className="space-y-4">
                  {/* Common Errors */}
                  <div>
                    <h4 className="text-base font-medium mb-3">Common Errors</h4>
                    <div className="space-y-2">
                      {(endpoint as any).errorHandling.commonErrors.map((error: any, index: number) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="destructive" className="text-xs">
                              {error.statusCode}
                            </Badge>
                            <span className="text-sm font-medium">{error.description}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{error.handling}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Endpoint Specific Errors */}
                  {(endpoint as any).errorHandling.endpointSpecific.length > 0 && (
                    <div>
                      <h4 className="text-base font-medium mb-3">Endpoint Specific Errors</h4>
                      <div className="space-y-2">
                        {(endpoint as any).errorHandling.endpointSpecific.map((error: any, index: number) => (
                          <div key={index} className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {error.statusCode}
                              </Badge>
                              <span className="text-sm font-medium">{error.description}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{error.handling}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rate Limiting */}
                  {(endpoint as any).rateLimiting && (
                    <div>
                      <h4 className="text-base font-medium mb-3">Rate Limiting</h4>
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Requests:</span> {(endpoint as any).rateLimiting.limits.requests} per {(endpoint as any).rateLimiting.limits.window}
                          </div>
                          <div>
                            <span className="font-medium">Burst:</span> {(endpoint as any).rateLimiting.limits.burst} requests
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {(endpoint as any).rateLimiting.handling}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Pagination */}
                  {(endpoint as any).pagination && (endpoint as any).pagination.supported && (
                    <div>
                      <h4 className="text-base font-medium mb-3">Pagination</h4>
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-sm space-y-2">
                          <div>
                            <span className="font-medium">Parameters:</span>
                            <ul className="ml-4 mt-1 space-y-1">
                              <li>• page: Page number (default: {(endpoint as any).pagination.parameters.page.default})</li>
                              <li>• limit: Items per page (default: {(endpoint as any).pagination.parameters.limit.default})</li>
                              <li>• offset: Items to skip (default: {(endpoint as any).pagination.parameters.offset.default})</li>
                            </ul>
                          </div>
                          {(endpoint as any).pagination.example && (
                            <div>
                              <span className="font-medium">Example:</span>
                              <div className="mt-1 border rounded overflow-hidden">
                                <Editor
                                  height="150px"
                                  language="json"
                                  value={maskSensitiveData(JSON.stringify((endpoint as any).pagination.example, null, 2))}
                                  options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    fontSize: 11,
                                    lineNumbers: 'on',
                                    wordWrap: 'on',
                                    automaticLayout: true,
                                    theme: 'vs-dark',
                                    padding: { top: 8, bottom: 8 },
                                    scrollbar: {
                                      vertical: 'auto',
                                      horizontal: 'auto',
                                      verticalScrollbarSize: 4,
                                      horizontalScrollbarSize: 4
                                    },
                                    fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace",
                                    fontLigatures: true,
                                    cursorStyle: 'line',
                                    cursorWidth: 2,
                                    renderLineHighlight: 'line',
                                    renderWhitespace: 'selection',
                                    bracketPairColorization: { enabled: true },
                                    guides: {
                                      bracketPairs: true,
                                      indentation: true
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
