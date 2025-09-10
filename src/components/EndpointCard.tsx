import React from 'react';
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { EndpointCardProps, ApiParameter, ApiResponse } from './types';
import { cn } from './lib/utils';

export function EndpointCard({ endpoint, index }: EndpointCardProps) {
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
        </div>
        
      </CardHeader>

      <CardContent className="pt-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="responses">Responses</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
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
              {renderResponses(endpoint.responses)}
            </div>
          </TabsContent>

          <TabsContent value="headers" className="space-y-4 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Request Headers</h3>
              {renderRequestHeaders()}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
