# Simplified Examples

## Simple API Route: `app/api/docs/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { ApiScanner } from 'api-scanner';

export async function GET() {
  try {
    const scanner = new ApiScanner({
      path: 'src/app/api',
      format: 'json',
      verbose: false
    });

    const documentation = await scanner.scan();

    return NextResponse.json(documentation, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Failed to generate API documentation:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}
```

## Simple Docs Page: `app/docs/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ApiDocumentation } from 'api-scanner/client';
import type { ApiDocumentationType } from 'api-scanner/client';

export default function DocsPage() {
  const [apiData, setApiData] = useState<ApiDocumentationType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/docs')
      .then(res => res.json())
      .then(setApiData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!apiData) return <div className="p-8 text-center">Failed to load documentation</div>;

  return (
    <ApiDocumentation
      data={apiData}
      searchable={true}
      showStats={true}
    />
  );
}
```

## Usage Instructions

1. **Copy the API route** to `app/api/docs/route.ts`
2. **Copy the docs page** to `app/docs/page.tsx`  
3. **Make sure you have the required CSS** (see `examples/globals.css`)
4. **Update your Tailwind config** (see `examples/tailwind.config.js`)

## Test the setup

1. Start your Next.js app: `npm run dev`
2. Visit: `http://localhost:3000/api/docs` (should return JSON)
3. Visit: `http://localhost:3000/docs` (should show the documentation UI)

## Customization

### Custom path for API scanning
```typescript
// In your route.ts
const scanner = new ApiScanner({
  path: 'app/api', // or wherever your API routes are
  format: 'json'
});
```

### Custom styling
```tsx
// In your page.tsx
<ApiDocumentation
  data={apiData}
  className="max-w-6xl mx-auto"
  theme="dark"
  defaultExpanded={true}
/>
```

### Add navigation
```tsx
// In your layout or navigation
<Link href="/docs" className="nav-link">
  API Docs
</Link>
```
