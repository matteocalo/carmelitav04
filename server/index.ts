import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./server/routes";
import { setupVite, serveStatic, log } from "./server/vite";

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
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
    console.log(`[${new Date().toISOString()}] ${req.method} ${path} - Response finished in ${duration}ms with status ${res.statusCode}`);
  });

  next();
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]', error);
  // Keep the process running despite uncaught exceptions
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
  // Keep the process running despite unhandled rejections
});

// Enhanced error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error Handler]', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
});

// Create server and register routes
const server = await registerRoutes(app);

// Setup appropriate middleware based on environment
if (process.env.NODE_ENV === "development") {
  console.log('Setting up Vite in development mode...');
  await setupVite(app, server);
} else {
  console.log('Setting up static serving in production mode...');
  serveStatic(app);
}

// For local development only, not used in Vercel
if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server successfully started and listening on port ${port}`);
    log(`serving on port ${port}`);
  });
} else if (process.env.VERCEL) {
  console.log('Running in Vercel environment');
}

// Export for Vercel serverless function
export default app;import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./server/routes";
import { serveStatic, log } from "./server/vite";
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
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
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

// Register routes
registerRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  serveStatic(app);
}

// Export per Vercel
export default (req: VercelRequest, res: VercelResponse) => {
  app(req as any, res as any);
};