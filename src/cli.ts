#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
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
  .option('-p, --path <path>', 'Path to scan for API routes (default: src/app/api)')
  .option('-o, --output <file>', 'Output file path (default: api-documentation.json)')
  .option('-f, --format <format>', 'Output format: json, markdown, swagger (default: json)')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-c, --config <file>', 'Configuration file path (default: .api-scanner.json)')
  .option('-i, --interactive', 'Run in interactive mode')
  .option('--examples', 'Show usage examples');

program.parse();

// Handle --examples flag
if (process.argv.includes('--examples')) {
  showDetailedHelp();
  process.exit(0);
}

async function main() {
  const options = program.opts();
  
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
      format: (options.format || config.format || 'json') as 'json' | 'markdown' | 'swagger',
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
      
      if (scannerOptions.verbose) {
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
  console.log(chalk.gray('  # Scan specific path'));
  console.log(chalk.gray('  npx api-scanner --path src/app/api/auth'));
  console.log(chalk.gray(''));
  console.log(chalk.gray('  # Verbose output'));
  console.log(chalk.gray('  npx api-scanner --verbose\n'));
  
  console.log(chalk.yellow.bold('⚙️  Configuration Options:'));
  console.log(chalk.gray('  --path <path>     Path to scan (default: src/app/api)'));
  console.log(chalk.gray('  --output <file>   Output file (default: api-documentation.json)'));
  console.log(chalk.gray('  --format <type>   Format: json, markdown, swagger'));
  console.log(chalk.gray('  --verbose         Show detailed output'));
  console.log(chalk.gray('  --config <file>   Config file (default: .api-scanner.json)'));
  console.log(chalk.gray('  --interactive     Run in interactive mode\n'));
  
  console.log(chalk.yellow.bold('📁 Output Formats:'));
  console.log(chalk.gray('  json      - JSON format for programmatic use'));
  console.log(chalk.gray('  swagger   - OpenAPI 3.0 format for Swagger UI'));
  console.log(chalk.gray('  markdown  - Human-readable documentation\n'));
  
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

  try {
    // Ask for scan path
    const defaultPath = 'src/app/api';
    const pathAnswer = await question(chalk.yellow(`📁 Path to scan for API routes? (default: ${defaultPath}): `));
    const scanPath = pathAnswer.trim() || defaultPath;

    // Ask for output format
    console.log(chalk.gray('\n📄 Available formats:'));
    console.log(chalk.gray('  1. json - JSON format (programmatic use)'));
    console.log(chalk.gray('  2. swagger - OpenAPI 3.0 (Swagger UI)'));
    console.log(chalk.gray('  3. markdown - Human-readable docs'));
    
    const formatAnswer = await question(chalk.yellow('\n🎯 Choose output format (1-3, default: 1): '));
    const formatMap: { [key: string]: string } = { '1': 'json', '2': 'swagger', '3': 'markdown' };
    const format = formatMap[formatAnswer.trim()] || 'json';

    // Ask for output file
    const defaultOutput = `api-documentation.${format === 'json' ? 'json' : format === 'swagger' ? 'json' : 'md'}`;
    const outputAnswer = await question(chalk.yellow(`📄 Output file path? (default: ${defaultOutput}): `));
    const outputFile = outputAnswer.trim() || defaultOutput;

    // Ask for verbose mode
    const verboseAnswer = await question(chalk.yellow('\n🔍 Enable verbose output? (y/N): '));
    const verbose = verboseAnswer.toLowerCase().startsWith('y');

    // Ask to save config
    const saveConfigAnswer = await question(chalk.yellow('\n💾 Save these settings to .api-scanner.json? (Y/n): '));
    const saveConfig = !saveConfigAnswer.toLowerCase().startsWith('n');

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
    const runNowAnswer = await question(chalk.yellow('\n🚀 Run API Scanner now? (Y/n): '));
    const runNow = !runNowAnswer.toLowerCase().startsWith('n');

    if (runNow) {
      console.log(chalk.blue('\n🔍 Starting API Scanner...\n'));
      
      const scannerOptions: ScannerOptions = {
        path: scanPath,
        output: outputFile,
        format: format as 'json' | 'markdown' | 'swagger',
        verbose: verbose
      };

      const scanner = new ApiScanner(scannerOptions);
      await scanner.generateDocumentation();
      
      console.log(chalk.green('\n✅ Documentation generated successfully!'));
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

// Run the CLI only if no subcommands are used
if (require.main === module && !process.argv.includes('help') && !process.argv.includes('init')) {
  main();
}
