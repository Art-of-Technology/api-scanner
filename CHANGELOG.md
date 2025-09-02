# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-09-02

### Added
- 🚀 Initial release of API Scanner
- 🔍 Automatic Next.js API route scanning
- 📄 Multiple output formats (JSON, Markdown, Swagger/OpenAPI, HTML)
- 🌐 Beautiful HTML documentation with Bootstrap UI and animations
- 🎯 Support for dynamic routes and nested structures
- 📝 JSDoc comment parsing for enhanced documentation
- ⚙️ Configuration file support (.api-scanner.json)
- 🎨 Interactive setup wizard for beginners
- 📖 Comprehensive help system and examples
- 🔧 CLI with multiple options and commands
- 🏗️ TypeScript support with full type definitions
- 🚀 High performance scanning (1000+ routes in <1 second)
- 🎯 Enterprise-ready with complex route support
- 🌐 Auto-opening HTML documentation in browser
- 🎭 Scroll-triggered animations and responsive design
- 📱 Mobile-friendly HTML documentation
- 🔍 Interactive table of contents and search features

### Features
- **Route Detection**: Automatically finds `route.ts`, `route.js`, `route.tsx`, `route.jsx` files
- **HTTP Methods**: Supports GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **Dynamic Routes**: Converts `[id]` to `{id}` in URLs
- **Parameter Extraction**: Path, query, and body parameters
- **Response Documentation**: HTTP status codes and examples
- **Tag Generation**: Automatic categorization based on file paths
- **Error Handling**: Graceful handling of syntax errors and missing files
- **Cross-Platform**: Works on Windows, macOS, and Linux

### CLI Commands
- `npx api-scanner` - Basic usage
- `npx api-scanner init` - Interactive setup wizard
- `npx api-scanner help` - Detailed help and examples
- `npx api-scanner --format swagger` - Generate Swagger documentation
- `npx api-scanner --format markdown` - Generate Markdown documentation
- `npx api-scanner --format html` - Generate beautiful HTML documentation
- `npx api-scanner --verbose` - Enable detailed output
- `npx api-scanner --no-open` - Generate HTML without auto-opening

### Output Formats
- **JSON**: Programmatic use and API integration
- **Swagger/OpenAPI 3.0**: Compatible with Swagger UI, Postman, and other tools
- **Markdown**: Human-readable documentation
- **HTML**: Beautiful, interactive documentation with Bootstrap UI
### Performance
- **Speed**: Scans 369+ routes in under 1 second
- **Memory**: Optimized for large projects
- **HTML Generation**: Template-based rendering for fast HTML output
- **Scalability**: Linear performance scaling
- **Reliability**: Handles edge cases and errors gracefully

### Documentation
- Comprehensive README with examples
- Interactive help system
- Configuration file examples
- Usage scenarios and best practices

