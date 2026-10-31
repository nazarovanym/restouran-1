import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-restaurant-2026',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  isDev: process.env.NODE_ENV !== 'production'
};
