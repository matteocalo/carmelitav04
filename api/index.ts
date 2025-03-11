import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { serveStatic } from "../server/vite";
import { VercelRequest, VercelResponse } from "@vercel/node";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  console.log(`[${new Date().toISOString()}] ${req.method} ${path} - Request started`);

  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${path} - Response finished in ${duration}ms with status ${res.statusCode}`);
  });

  next();
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

// Enhanced error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error Handler]', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
});

// Create server and register routes
registerRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  console.log('Setting up static serving in production mode...');
  serveStatic(app);
}

// Export for Vercel serverless function
export default app;