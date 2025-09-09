// Client-side exports (React components only)
// These can be safely imported in browser/Next.js client components

export { ApiDocumentation } from './components/ApiDocumentation';
export { EndpointCard } from './components/EndpointCard';
export { TableOfContents } from './components/TableOfContents';
export { SearchInput } from './components/SearchInput';
export { StatsCards } from './components/StatsCards';

// UI Components
export { Button } from './components/ui/button';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
export { Badge } from './components/ui/badge';
export { Input } from './components/ui/input';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './components/ui/collapsible';

// Types only (no runtime Node.js dependencies)
export type {
  ApiDocumentationProps,
  EndpointCardProps,
  TableOfContentsProps,
  SearchInputProps,
  StatsCardsProps,
  ApiEndpoint,
  ApiParameter,
  ApiResponse,
  ApiRequestHeader,
  ApiRequestBody
} from './components/types';

// Re-export the ApiDocumentation type with an alias to avoid conflict
export type { ApiDocumentation as ApiDocumentationType } from './types';

// Utilities
export { cn } from './components/lib/utils';
