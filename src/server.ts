import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ApiDocumentation } from './types';

export class EditorServer {
  private app: express.Application;
  private port!: number;
  private jsonFilePath: string;

  constructor(jsonFilePath: string) {
    this.app = express();
    this.jsonFilePath = jsonFilePath;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(join(__dirname, 'templates')));
    
    // Debug middleware
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Serve editor page
    this.app.get('/', (req, res) => {
      res.sendFile(join(__dirname, 'templates', 'editor-template.html'));
    });

    // Get JSON data
    this.app.get('/api/data', (req, res) => {
      try {
        const data = readFileSync(this.jsonFilePath, 'utf8');
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch (error) {
        res.status(500).json({ error: 'Failed to read JSON file' });
      }
    });

    // Update single endpoint
    this.app.put('/api/endpoint/:index', (req, res) => {
      try {
        const index = parseInt(req.params.index);
        const updatedEndpoint = req.body;
        
        const data = readFileSync(this.jsonFilePath, 'utf8');
        const jsonData: ApiDocumentation = JSON.parse(data);
        
        if (index >= 0 && index < jsonData.endpoints.length) {
          jsonData.endpoints[index] = updatedEndpoint;
          writeFileSync(this.jsonFilePath, JSON.stringify(jsonData, null, 2));
          res.json({ success: true });
        } else {
          res.status(400).json({ error: 'Invalid endpoint index' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to update endpoint' });
      }
    });

    // Save all changes
    this.app.put('/api/save-all', (req, res) => {
      try {
        const updatedData: ApiDocumentation = req.body;
        writeFileSync(this.jsonFilePath, JSON.stringify(updatedData, null, 2));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to save all changes' });
      }
    });
  }

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
          resolve(this.port);
        } else {
          reject(new Error('Failed to get server port'));
        }
      });

      server.on('error', (error) => {
        reject(error);
      });
    });
  }

  getPort(): number {
    return this.port;
  }

  getUrl(): string {
    return `http://localhost:${this.port}`;
  }
}
