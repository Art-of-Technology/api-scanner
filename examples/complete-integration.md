# Complete Integration Guide

This guide shows how to set up the API Scanner React component in a Next.js project from scratch.

## Step 1: Install Dependencies

```bash
# Install api-scanner and required dependencies
npm install api-scanner

# Install React 19 and Next.js (if not already installed)
npm install react@^19.0.0 react-dom@^19.0.0 next@^15.0.0

# Install Tailwind CSS 4.0
npm install tailwindcss@^4.0.0-alpha.25

# Install required UI dependencies
npm install clsx tailwind-merge class-variance-authority lucide-react
npm install @radix-ui/react-collapsible @radix-ui/react-dialog @radix-ui/react-slot @radix-ui/react-tabs
npm install tailwindcss-animate
```

## Step 2: Configure Tailwind CSS

Create or update `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    // Include api-scanner components
    './node_modules/api-scanner/dist/**/*.{js,jsx,ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

## Step 3: Add CSS Variables

Add to your `globals.css` or `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## Step 4: Create API Documentation Route

Create `app/api/docs/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { ApiScanner } from 'api-scanner';

export async function GET() {
  try {
    const scanner = new ApiScanner({
      path: 'src/app/api', // Adjust path as needed
      format: 'json',
      verbose: false,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/docs/**' // Ignore the docs route itself
      ]
    });

    const documentation = await scanner.scan();

    return NextResponse.json(documentation, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Failed to generate API documentation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate API documentation',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

## Step 5: Create Documentation Page

Create `app/docs/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ApiDocumentation } from 'api-scanner/client';
import type { ApiDocumentationType } from 'api-scanner/client';

export default function DocsPage() {
  const [apiData, setApiData] = useState<ApiDocumentationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/docs')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load API documentation');
        return res.json();
      })
      .then(data => {
        setApiData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading API documentation:', err);
        setError('Failed to load API documentation');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mb-4"></div>
          <p>Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (error || !apiData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-destructive">{error || 'Failed to load API documentation'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ApiDocumentation
        data={apiData}
        searchable={true}
        showStats={true}
        defaultExpanded={false}
        theme="system"
        onEndpointSelect={(endpoint) => {
          console.log('Selected endpoint:', endpoint);
        }}
      />
    </div>
  );
}
```

## Step 6: Add Navigation (Optional)

Add a link to your docs in your navigation:

```tsx
// In your layout or navigation component
<Link href="/docs">API Documentation</Link>
```

## Step 7: Build and Test

```bash
# Build your project
npm run build

# Start development server
npm run dev

# Visit http://localhost:3000/docs to see your API documentation
```

## Alternative: Static Generation

If you prefer static generation at build time:

```tsx
// app/docs/page.tsx (static version)
import { ApiDocumentation } from 'api-scanner/client';
import { ApiScanner } from 'api-scanner';

export default async function DocsPage() {
  // Generate documentation at build time
  const scanner = new ApiScanner({
    path: 'src/app/api',
    format: 'json'
  });

  const apiData = await scanner.scan();

  return (
    <ApiDocumentation
      data={apiData}
      searchable={true}
      showStats={true}
      defaultExpanded={false}
      theme="system"
    />
  );
}
```

## Customization

### Custom Styling

```tsx
<ApiDocumentation
  data={apiData}
  className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-7xl mx-auto"
  searchable={true}
  showStats={true}
/>
```

### Custom Theme

```tsx
<ApiDocumentation
  data={apiData}
  theme="dark" // or "light" or "system"
/>
```

### Event Handling

```tsx
<ApiDocumentation
  data={apiData}
  onEndpointSelect={(endpoint) => {
    // Custom analytics, URL updates, etc.
    console.log('Selected:', endpoint.url);
    
    // Update URL without page reload
    window.history.pushState({}, '', `/docs#${endpoint.url}`);
  }}
/>
```

## Troubleshooting

### Common Issues

1. **Styles not loading**: Make sure you've included api-scanner in your Tailwind content paths
2. **CSS variables missing**: Ensure you've added the required CSS variables to your globals.css
3. **Build errors**: Check that all peer dependencies are installed
4. **Dark mode not working**: Verify your dark mode setup in Tailwind config

### Getting Help

- Check the [examples](../examples/) directory for complete working examples
- Review the [README](../README.md) for detailed API documentation
- Create an issue on GitHub for specific problems

## Next Steps

- Customize the component styling to match your brand
- Add authentication to protect the docs route if needed
- Set up automated documentation generation in your CI/CD pipeline
- Integrate with your existing monitoring and analytics systems
