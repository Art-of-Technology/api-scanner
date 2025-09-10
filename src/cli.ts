#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as readline from 'readline';
import { exec } from 'child_process';
import { ApiScanner } from './scanner';
import { ScannerOptions, ConfigFile } from './types';

const program = new Command();

program
  .name('api-scanner')
  .description('Next.js API route scanner that automatically generates API documentation')
  .version('1.0.0');

// Add help command
program
  .command('help')
  .description('Show detailed help and examples')
  .action(() => {
    showDetailedHelp();
  });

// Add interactive command
program
  .command('init')
  .description('Interactive setup wizard')
  .action(async () => {
    await runInteractiveWizard();
  });

program
  .argument('[path]', 'Path to scan for API routes (default: src/app/api)')
  .option('-p, --path <path>', 'Path to scan for API routes (default: src/app/api)')
  .option('-o, --output <file>', 'Output file path (default: api-documentation.json)')
  .option('-f, --format <format>', 'Output format: json, markdown, swagger, react (default: json)')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-c, --config <file>', 'Configuration file path (default: .api-scanner.json)')
  .option('-i, --interactive', 'Run in interactive mode')
  .option('--examples', 'Show usage examples')
  .action(main);

// Handle --examples flag
if (process.argv.includes('--examples')) {
  showDetailedHelp();
  process.exit(0);
}

program.parse();

async function main(pathArg: string, options: any) {
  // Merge path argument with options
  if (pathArg && !options.path) {
    options.path = pathArg;
  }
  
  // Handle help and examples
  if (options.examples) {
    showDetailedHelp();
    return;
  }

  // Handle interactive mode
  if (options.interactive) {
    await runInteractiveWizard();
    return;
  }


  console.log(chalk.blue.bold('🔍 API Scanner'));
  console.log(chalk.gray('Next.js API route documentation generator\n'));

  try {
    // Load configuration file if exists
    const config = await loadConfig(options.config);
    
    // Merge CLI options with config
    const scannerOptions: ScannerOptions = {
      path: options.path || config.path || 'src/app/api',
      output: options.output || config.output || 'api-documentation.json',
      format: (options.format || config.format || 'json') as 'json' | 'markdown' | 'swagger' | 'react',
      verbose: options.verbose || false,
      ignore: config.ignore,
      include: config.include
    };

    if (scannerOptions.verbose) {
      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(`  Path: ${scannerOptions.path}`));
      console.log(chalk.gray(`  Output: ${scannerOptions.output}`));
      console.log(chalk.gray(`  Format: ${scannerOptions.format}`));
      console.log(chalk.gray(`  Verbose: ${scannerOptions.verbose}\n`));
    }

    // Check if scan path exists
    if (!await fs.pathExists(scannerOptions.path!)) {
      console.error(chalk.red(`❌ Error: Path '${scannerOptions.path}' does not exist`));
      process.exit(1);
    }

    // Use fixed filenames to avoid creating multiple files
    if (scannerOptions.format === 'react') {
      scannerOptions.output = 'ApiDocsPage.tsx';
    } else if (scannerOptions.format === 'json') {
      scannerOptions.output = 'api-documentation.json';
    } else if (scannerOptions.format === 'markdown') {
      scannerOptions.output = 'api-documentation.md';
    } else if (scannerOptions.format === 'swagger') {
      scannerOptions.output = 'api-documentation.yaml';
    }

    // Create scanner instance
    const scanner = new ApiScanner(scannerOptions);

    // Start scanning with spinner
    const spinner = ora('Scanning API routes...').start();

    try {
      await scanner.generateDocumentation();
      spinner.succeed(chalk.green('✅ Documentation generated successfully!'));
      
      // Show summary
      const outputPath = path.resolve(scannerOptions.output!);
      const stats = await fs.stat(outputPath);
      
      console.log(chalk.green(`📄 Output: ${outputPath}`));
      console.log(chalk.green(`📊 Size: ${(stats.size / 1024).toFixed(2)} KB`));
      
      // Show usage instructions for React component
      if (scannerOptions.format === 'react') {
        console.log(chalk.green('\n📄 React component generated successfully!'));
        console.log(chalk.gray('\nTo use this component:'));
        console.log(chalk.gray('  1. Import it in your React app'));
        console.log(chalk.gray('  2. Make sure api-scanner is installed as a dependency'));
        console.log(chalk.gray('  3. Use the component in your app'));
      } else if (scannerOptions.verbose) {
        console.log(chalk.gray('\nYou can now use this documentation with:'));
        console.log(chalk.gray('  - Swagger UI'));
        console.log(chalk.gray('  - Postman'));
        console.log(chalk.gray('  - Any OpenAPI compatible tool'));
      }

    } catch (error) {
      spinner.fail(chalk.red('❌ Failed to generate documentation'));
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('❌ Fatal error:'), error);
    process.exit(1);
  }
}

function showDetailedHelp() {
  console.log(chalk.blue.bold('🔍 API Scanner - Help & Examples\n'));
  
  console.log(chalk.yellow.bold('📖 Quick Start:'));
  console.log(chalk.gray('  npx api-scanner                    # Basic usage'));
  console.log(chalk.gray('  npx api-scanner init               # Interactive setup'));
  console.log(chalk.gray('  npx api-scanner help               # Show this help\n'));
  
  console.log(chalk.yellow.bold('🎯 Common Commands:'));
  console.log(chalk.gray('  # Generate JSON documentation'));
  console.log(chalk.gray('  npx api-scanner --format json --output docs/api.json'));
  console.log(chalk.gray(''));
  console.log(chalk.gray('  # Generate Swagger documentation'));
  console.log(chalk.gray('  npx api-scanner --format swagger --output docs/swagger.json'));
  console.log(chalk.gray(''));
  console.log(chalk.gray('  # Generate Markdown documentation'));
  console.log(chalk.gray('  npx api-scanner --format markdown --output docs/api.md'));
  console.log(chalk.gray(''));
  console.log(chalk.gray('  # Generate React component'));
  console.log(chalk.gray('  npx api-scanner --format react --output ApiDocsPage.tsx'));
  console.log(chalk.gray(''));
  console.log(chalk.gray('  # Scan specific path'));
  console.log(chalk.gray('  npx api-scanner --path src/app/api/auth'));
  console.log(chalk.gray(''));
  console.log(chalk.gray('  # Verbose output'));
  console.log(chalk.gray('  npx api-scanner --verbose\n'));
  
  console.log(chalk.yellow.bold('⚙️  Configuration Options:'));
  console.log(chalk.gray('  --path <path>     Path to scan (default: src/app/api)'));
  console.log(chalk.gray('  --output <file>   Output file (default: api-documentation.json)'));
  console.log(chalk.gray('  --format <type>   Format: json, markdown, swagger, react'));
  console.log(chalk.gray('  --verbose         Show detailed output'));
  console.log(chalk.gray('  --config <file>   Config file (default: .api-scanner.json)'));
  console.log(chalk.gray('  --interactive     Run in interactive mode'));
  
  console.log(chalk.yellow.bold('📁 Output Formats:'));
  console.log(chalk.gray('  json      - JSON format for programmatic use'));
  console.log(chalk.gray('  swagger   - OpenAPI 3.0 format for Swagger UI'));
  console.log(chalk.gray('  markdown  - Human-readable documentation'));
  console.log(chalk.gray('  react     - React component using ApiDocumentation component\n'));
  
  console.log(chalk.yellow.bold('🔧 Configuration File (.api-scanner.json):'));
  console.log(chalk.gray('  {'));
  console.log(chalk.gray('    "path": "src/app/api",'));
  console.log(chalk.gray('    "output": "docs/api-docs.json",'));
  console.log(chalk.gray('    "format": "json",'));
  console.log(chalk.gray('    "verbose": true'));
  console.log(chalk.gray('  }\n'));
  
  console.log(chalk.yellow.bold('💡 Tips:'));
  console.log(chalk.gray('  • Use --interactive for guided setup'));
  console.log(chalk.gray('  • Create .api-scanner.json for project defaults'));
  console.log(chalk.gray('  • Use --verbose to see what\'s being scanned'));
  console.log(chalk.gray('  • Output files are created automatically\n'));
  
  console.log(chalk.blue('For more information, visit: https://github.com/your-repo/api-scanner'));
}

async function findApiPaths(): Promise<string[]> {
  const possiblePaths: string[] = [];
  
  // Common API route patterns
  const patterns = [
    'src/app/api',
    'app/api',
    'pages/api',
    'api',
    'src/api',
    'lib/api'
  ];
  
  // Check current directory and subdirectories
  const checkPaths = ['.', 'src', 'app', 'pages', 'lib'];
  
  for (const basePath of checkPaths) {
    for (const pattern of patterns) {
      const fullPath = basePath === '.' ? pattern : `${basePath}/${pattern}`;
      if (await fs.pathExists(fullPath)) {
        // Check if it contains route files or subdirectories with route files
        try {
          const files = await fs.readdir(fullPath);
          const hasRouteFiles = files.some(file => 
            file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.jsx')
          );
          
          // Also check if it has subdirectories (like [id], auth, etc.)
          const hasSubdirs = files.some(file => {
            try {
              const stat = fs.statSync(path.join(fullPath, file));
              return stat.isDirectory();
            } catch {
              return false;
            }
          });
          
          if ((hasRouteFiles || hasSubdirs) && !possiblePaths.includes(fullPath)) {
            possiblePaths.push(fullPath);
          }
        } catch (error) {
          // Ignore errors
        }
      }
    }
  }
  
  // Check for demo/test directories in current directory
  try {
    const currentDirFiles = await fs.readdir('.');
    const demoDirs = currentDirFiles.filter(file => 
      file.includes('demo') || file.includes('test') || file.includes('example')
    );
    
    for (const demoDir of demoDirs) {
      for (const pattern of patterns) {
        const fullPath = `${demoDir}/${pattern}`;
        if (await fs.pathExists(fullPath)) {
          try {
            const files = await fs.readdir(fullPath);
            const hasRouteFiles = files.some(file => 
              file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.jsx')
            );
            
            // Also check if it has subdirectories
            const hasSubdirs = files.some(file => {
              try {
                const stat = fs.statSync(path.join(fullPath, file));
                return stat.isDirectory();
              } catch {
                return false;
              }
            });
            
            if ((hasRouteFiles || hasSubdirs) && !possiblePaths.includes(fullPath)) {
              possiblePaths.push(fullPath);
            }
          } catch (error) {
            // Ignore errors
          }
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }
  
  // Also check for demo/test directories
  const demoPatterns = [
    'demo-api/src/app/api',
    'test-api/src/app/api',
    'example-api/src/app/api'
  ];
  
  for (const pattern of demoPatterns) {
    if (await fs.pathExists(pattern)) {
      try {
        const files = await fs.readdir(pattern);
        const hasRouteFiles = files.some(file => 
          file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.jsx')
        );
        
        // Also check if it has subdirectories
        const hasSubdirs = files.some(file => {
          try {
            const stat = fs.statSync(path.join(pattern, file));
            return stat.isDirectory();
          } catch {
            return false;
          }
        });
        
        if ((hasRouteFiles || hasSubdirs) && !possiblePaths.includes(pattern)) {
          possiblePaths.push(pattern);
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }
  
  return possiblePaths;
}

async function runInteractiveWizard() {
  console.log(chalk.blue.bold('🔍 API Scanner - Interactive Setup Wizard\n'));
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve);
    });
  };

  const askYesNo = async (query: string, defaultValue: boolean = true): Promise<boolean> => {
    while (true) {
      const answer = await question(query);
      const trimmed = answer.trim().toLowerCase();
      
      if (trimmed === '' || trimmed === 'y' || trimmed === 'yes') {
        return true;
      } else if (trimmed === 'n' || trimmed === 'no') {
        return false;
      } else {
        console.log(chalk.red('❌ Invalid input. Please enter Y/n or yes/no.'));
      }
    }
  };

  const askNumber = async (query: string, min: number, max: number, defaultValue: number): Promise<number> => {
    while (true) {
      const answer = await question(query);
      const trimmed = answer.trim();
      
      if (trimmed === '') {
        return defaultValue;
      }
      
      const num = parseInt(trimmed);
      if (!isNaN(num) && num >= min && num <= max) {
        return num;
      } else {
        console.log(chalk.red(`❌ Invalid input. Please enter a number between ${min} and ${max}.`));
      }
    }
  };

  try {
    // Auto-detect API paths
    console.log(chalk.blue('\n🔍 Scanning for API routes...'));
    const possiblePaths = await findApiPaths();
    
    let scanPath: string = '';
    if (possiblePaths.length === 0) {
      console.log(chalk.yellow('\n⚠️  No API routes found automatically'));
      const defaultPath = 'src/app/api';
      console.log(chalk.gray('\n📁 Path to scan for API routes:'));
      console.log(chalk.gray('  Examples:'));
      console.log(chalk.gray('  - src/app/api (default)'));
      console.log(chalk.gray('  - demo-api/src/app/api'));
      console.log(chalk.gray('  - ./my-project/api'));
      const pathAnswer = await question(chalk.yellow(`\n📁 Enter path (default: ${defaultPath}): `));
      scanPath = pathAnswer.trim() || defaultPath;
    } else if (possiblePaths.length === 1) {
      scanPath = possiblePaths[0];
      console.log(chalk.green(`\n✅ Found API routes in: ${scanPath}`));
      const useDetectedPath = await askYesNo(chalk.yellow(`\n📁 Use this path? (Y/n, default: Y): `), true);
      if (!useDetectedPath) {
        const pathAnswer = await question(chalk.yellow(`\n📁 Enter custom path: `));
        scanPath = pathAnswer.trim();
      }
    } else if (possiblePaths.length > 1) {
      console.log(chalk.green('\n✅ Found multiple API route directories:'));
      possiblePaths.forEach((path, index) => {
        console.log(chalk.gray(`  ${index + 1}. ${path}`));
      });
      const pathChoice = await askNumber(chalk.yellow(`\n📁 Choose path (1-${possiblePaths.length}, default: 1): `), 1, possiblePaths.length, 1);
      scanPath = possiblePaths[pathChoice - 1];
    }
    
    // Normalize path separators for cross-platform compatibility
    scanPath = scanPath.replace(/\\/g, '/');
    
    // Validate path exists
    if (!await fs.pathExists(scanPath)) {
      console.log(chalk.red(`\n❌ Error: Path '${scanPath}' does not exist`));
      console.log(chalk.yellow('💡 Make sure the path is correct and try again'));
      process.exit(1);
    }

    // Ask for output format
    console.log(chalk.gray('\n📄 Available formats:'));
    console.log(chalk.gray('  1. json - JSON format (programmatic use)'));
    console.log(chalk.gray('  2. swagger - OpenAPI 3.0 (Swagger UI)'));
    console.log(chalk.gray('  3. markdown - Human-readable docs'));
    console.log(chalk.gray('  4. react - React component using ApiDocumentation'));
    
    const formatChoice = await askNumber(chalk.yellow('\n🎯 Choose output format (1-4, default: 1): '), 1, 4, 1);
    const formatMap: { [key: number]: string } = { 1: 'json', 2: 'swagger', 3: 'markdown', 4: 'react' };
    const format = formatMap[formatChoice];

    // Ask for output file
    const defaultOutput = `api-documentation.${format === 'json' ? 'json' : format === 'swagger' ? 'json' : format === 'react' ? 'tsx' : 'md'}`;
    console.log(chalk.gray('\n📄 Output file:'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('  - api-docs.json'));
    console.log(chalk.gray('  - ApiDocsPage.tsx'));
    console.log(chalk.gray('  - my-api-docs.md'));
    const useDefaultOutput = await askYesNo(chalk.yellow(`\n📄 Use default output file '${defaultOutput}'? (Y/n, default: Y): `), true);
    const outputFile = !useDefaultOutput ? 
      await question(chalk.yellow('📄 Enter custom output file name: ')) : defaultOutput;

    // Ask for verbose mode
    const verbose = await askYesNo(chalk.yellow('\n🔍 Enable verbose output? (y/N, default: N): '), false);

    // Ask to save config
    const saveConfig = await askYesNo(chalk.yellow('\n💾 Save these settings to .api-scanner.json? (Y/n, default: Y): '), true);

    console.log(chalk.green('\n✅ Configuration:'));
    console.log(chalk.gray(`  Path: ${scanPath}`));
    console.log(chalk.gray(`  Format: ${format}`));
    console.log(chalk.gray(`  Output: ${outputFile}`));
    console.log(chalk.gray(`  Verbose: ${verbose}`));

    if (saveConfig) {
      const config = {
        path: scanPath,
        output: outputFile,
        format: format,
        verbose: verbose
      };
      
      await fs.writeFile('.api-scanner.json', JSON.stringify(config, null, 2));
      console.log(chalk.green('\n💾 Configuration saved to .api-scanner.json'));
    }

    // Ask to run now
    const runNow = await askYesNo(chalk.yellow('\n🚀 Run API Scanner now? (Y/n, default: Y): '), true);

    if (runNow) {
      console.log(chalk.blue('\n🔍 Starting API Scanner...\n'));
      
      // Normal format processing
      const scannerOptions: ScannerOptions = {
        path: scanPath,
        output: outputFile,
        format: format as 'json' | 'markdown' | 'swagger' | 'react',
        verbose: verbose
      };

      const scanner = new ApiScanner(scannerOptions);
      await scanner.generateDocumentation();
      
      console.log(chalk.green('\n✅ Documentation generated successfully!'));
      
      // Show usage instructions for React component
      if (format === 'react') {
        console.log(chalk.green('\n📄 React component generated successfully!'));
        console.log(chalk.gray('\nTo use this component:'));
        console.log(chalk.gray('  1. Import it in your React app'));
        console.log(chalk.gray('  2. Make sure api-scanner is installed as a dependency'));
        console.log(chalk.gray('  3. Use the component in your app'));
      }
    } else {
      console.log(chalk.blue('\n💡 To run later, use:'));
      console.log(chalk.gray(`  npx api-scanner --path ${scanPath} --format ${format} --output ${outputFile}`));
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Error during setup:'), error);
  } finally {
    rl.close();
  }
}

async function loadConfig(configPath: string): Promise<ConfigFile> {
  try {
    if (await fs.pathExists(configPath)) {
      const configContent = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configContent);
    }
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Warning: Could not load config file '${configPath}':`, error));
  }
  
  return {};
}


// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:'), promise);
  console.error(chalk.red('Reason:'), reason);
  process.exit(1);
});


