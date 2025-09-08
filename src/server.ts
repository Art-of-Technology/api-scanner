import express from 'express';
import { join } from 'path';
import * as fs from 'fs-extra';
import { ApiDocumentation } from './types';

export class EditorServer {
  private app: express.Application;
  private port: number = 0;
  private jsonFilePath: string;

  constructor(jsonFilePath: string) {
    this.jsonFilePath = jsonFilePath;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Serve static files from templates directory
    this.app.use(express.static(join(__dirname, 'templates')));
    
    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupRoutes(): void {
    // Serve the editor page
    this.app.get('/', (req, res) => {
      res.sendFile(join(__dirname, 'templates', 'editor-template.html'));
    });

    // Get API documentation
    this.app.get('/api/data', async (req, res) => {
      try {
        const data = await fs.readJson(this.jsonFilePath);
        res.json(data);
      } catch (error) {
        console.error('Error reading JSON file:', error);
        res.status(500).json({ error: 'Failed to read JSON file' });
      }
    });

    // Save API documentation
    this.app.post('/api/save', async (req, res) => {
      try {
        const { endpoints } = req.body;
        
        if (!endpoints || !Array.isArray(endpoints)) {
          return res.status(400).json({ error: 'Invalid data format' });
        }

        // Read current data
        const currentData = await fs.readJson(this.jsonFilePath);
        
        // Update endpoints
        const updatedData = {
          ...currentData,
          endpoints,
          lastModified: new Date().toISOString()
        };

        // Save to file
        await fs.writeJson(this.jsonFilePath, updatedData, { spaces: 2 });
        
        res.json({ success: true, message: 'Data saved successfully' });
      } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Failed to save data' });
      }
    });

    // Save individual endpoint
    this.app.post('/api/save-endpoint', async (req, res) => {
      try {
        const { index, endpoint } = req.body;
        
        if (typeof index !== 'number' || !endpoint) {
          return res.status(400).json({ error: 'Invalid data format' });
        }

        // Read current data
        const currentData = await fs.readJson(this.jsonFilePath);
        
        if (!currentData.endpoints || !Array.isArray(currentData.endpoints)) {
          return res.status(400).json({ error: 'Invalid JSON structure' });
        }

        // Update specific endpoint
        if (index >= 0 && index < currentData.endpoints.length) {
          currentData.endpoints[index] = endpoint;
          currentData.lastModified = new Date().toISOString();
          
          // Save to file
          await fs.writeJson(this.jsonFilePath, currentData, { spaces: 2 });
          
          res.json({ success: true, message: 'Endpoint saved successfully' });
        } else {
          res.status(400).json({ error: 'Invalid endpoint index' });
        }
      } catch (error) {
        console.error('Error saving endpoint:', error);
        res.status(500).json({ error: 'Failed to save endpoint' });
      }
    });

    // Save all endpoints at once
    this.app.post('/api/save-all', async (req, res) => {
      try {
        const { endpoints } = req.body;
        
        if (!endpoints || !Array.isArray(endpoints)) {
          return res.status(400).json({ error: 'Invalid data format' });
        }

        // Read current data
        const currentData = await fs.readJson(this.jsonFilePath);
        
        // Update all endpoints
        const updatedData = {
          ...currentData,
          endpoints,
          lastModified: new Date().toISOString()
        };

        // Save to file
        await fs.writeJson(this.jsonFilePath, updatedData, { spaces: 2 });
        
        res.json({ success: true, message: 'All endpoints saved successfully' });
      } catch (error) {
        console.error('Error saving all endpoints:', error);
        res.status(500).json({ error: 'Failed to save all changes' });
      }
    });

    // Update individual endpoint (PUT method for editing)
    this.app.put('/api/endpoint/:index', async (req, res) => {
      try {
        const index = parseInt(req.params.index);
        const { endpoint } = req.body;
        
        if (isNaN(index) || !endpoint) {
          return res.status(400).json({ error: 'Invalid data format' });
        }

        // Read current data
        const currentData = await fs.readJson(this.jsonFilePath);
        
        if (!currentData.endpoints || !Array.isArray(currentData.endpoints)) {
          return res.status(400).json({ error: 'Invalid JSON structure' });
        }

        // Update specific endpoint
        if (index >= 0 && index < currentData.endpoints.length) {
          currentData.endpoints[index] = endpoint;
          currentData.lastModified = new Date().toISOString();
          
          // Save to file
          await fs.writeJson(this.jsonFilePath, currentData, { spaces: 2 });
          
          res.json({ success: true, message: 'Endpoint updated successfully' });
        } else {
          res.status(400).json({ error: 'Invalid endpoint index' });
        }
      } catch (error) {
        console.error('Error updating endpoint:', error);
        res.status(500).json({ error: 'Failed to update endpoint' });
      }
    });
  }

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      // Use port 0 to let the system automatically assign an available port
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
