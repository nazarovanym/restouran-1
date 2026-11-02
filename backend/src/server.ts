import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import apiRouter from './routes';
import { socketService } from './services/socketService';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in dev
if (config.isDev) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.url.startsWith('/assets/')) {
      console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.url}`);
    }
    next();
  });
}

// Socket.IO Server initialize
socketService.init(server, '*');

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Restaurant RMS Backend Server',
    systemTime: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1', apiRouter);

// Frontend Statik Fayllar (Vite Build)
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// Single Page Application (SPA) Fallback
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Xəta]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Daxili server xətası baş verdi'
  });
});

// Start listening on 0.0.0.0
server.listen(config.port, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 RESTORAN İDARƏETMƏ SİSTEMİ (RMS) SERVERİ İŞƏ DÜŞDÜ`);
  console.log(`🌐 Birləşmiş Port:   http://localhost:${config.port}`);
  console.log(`📱 Web & QR Menyu:   http://localhost:${config.port}/order/sec_zal_tbl_01_a8f9`);
  console.log(`⚡ WebSocket Server:  Aktivdir`);
  console.log(`=======================================================`);
});

export { app, server };
