import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import routes from './routes';
import { errorHandler, apiLimiter } from './middleware';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.socket.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors(config.cors));
app.use(compression());
app.use(morgan(config.isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
app.use('/api', apiLimiter);

// ─── Routes ───────────────────────────────────────────────────
app.use('/api', routes);

// ─── Error Handling ───────────────────────────────────────────
app.use(errorHandler);

// ─── Socket.IO ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join project room
  socket.on('join:project', (projectId: string) => {
    socket.join(`project:${projectId}`);
  });

  // Leave project room
  socket.on('leave:project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
  });

  // Join channel room
  socket.on('join:channel', (channelId: string) => {
    socket.join(`channel:${channelId}`);
  });

  // Leave channel room
  socket.on('leave:channel', (channelId: string) => {
    socket.leave(`channel:${channelId}`);
  });

  // New message
  socket.on('message:send', (data) => {
    socket.to(`channel:${data.channelId}`).emit('message:new', data);
  });

  // Typing indicator
  socket.on('typing:start', (data) => {
    socket.to(`channel:${data.channelId}`).emit('typing:start', {
      userId: data.userId,
      username: data.username,
    });
  });

  socket.on('typing:stop', (data) => {
    socket.to(`channel:${data.channelId}`).emit('typing:stop', {
      userId: data.userId,
    });
  });

  // Project updates
  socket.on('project:update', (data) => {
    socket.to(`project:${data.projectId}`).emit('project:updated', data);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Export io for use in services
export { io };

// ─── Start Server ─────────────────────────────────────────────
const start = async () => {
  try {
    httpServer.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║          BuildTogether API Server            ║
║──────────────────────────────────────────────║
║  Environment: ${config.nodeEnv.padEnd(30)}║
║  Port:        ${String(config.port).padEnd(30)}║
║  URL:         ${config.apiUrl.padEnd(30)}║
╚══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

export default app;
