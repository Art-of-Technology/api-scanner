import * as fs from 'fs-extra';
import * as path from 'path';

export class TemplateEngine {
  private templateCache: Map<string, string> = new Map();

  async loadTemplate(templateName: string): Promise<string> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Try different possible paths for templates
    const possiblePaths = [
      path.join(__dirname, 'templates', `${templateName}.html`),
      path.join(process.cwd(), 'src', 'templates', `${templateName}.html`),
      path.join(__dirname, '..', 'src', 'templates', `${templateName}.html`)
    ];

    for (const templatePath of possiblePaths) {
      try {
        if (await fs.pathExists(templatePath)) {
          const template = await fs.readFile(templatePath, 'utf-8');
          this.templateCache.set(templateName, template);
          return template;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    throw new Error(`Template not found: ${templateName}.html`);
  }

  render(template: string, data: Record<string, any>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value || ''));
    }
    
    return result;
  }

  async renderTemplate(templateName: string, data: Record<string, any>): Promise<string> {
    const template = await this.loadTemplate(templateName);
    return this.render(template, data);
  }
}
