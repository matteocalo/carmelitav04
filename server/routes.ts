import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertClientSchema, insertEquipmentSchema, insertEventSchema, insertTeamSchema, insertPhotoJobSchema, insertPhotoJobCommentSchema } from "@shared/schema";
import session from "express-session";
import { z } from "zod";
import { createClient } from '@supabase/supabase-js';

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server for development, in production Vercel handles this
  const server = createServer(app);
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );

  // Auth middleware
  const requireAuth = async (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No authorization header" });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Store the user ID in the request
      req.session.userId = parseInt(user.id);
      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ message: "Authentication failed" });
    }
  };

  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev_secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Client routes
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const clients = await storage.getClientsByUser(req.session.userId!);
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      const client = await storage.createClient(clientData);
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error('Error creating client:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  // Equipment routes
  app.get("/api/equipment", requireAuth, async (req, res) => {
    try {
      const equipment = await storage.getEquipmentByUser(req.session.userId!);
      res.json(equipment);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/equipment", requireAuth, async (req, res) => {
    try {
      const equipmentData = insertEquipmentSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      const equipment = await storage.createEquipment(equipmentData);
      res.json(equipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error('Error creating equipment:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  // Event routes
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const events = await storage.getEventsByUser(req.session.userId!);
      res.json(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const eventData = insertEventSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error('Error creating event:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  // Team routes
  app.post("/api/teams", requireAuth, async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse({
        ...req.body,
        ownerId: req.session.userId
      });
      const team = await storage.createTeam(teamData);
      res.json(team);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error('Error creating team:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  // Photo Jobs routes
  app.get("/api/photo-jobs", requireAuth, async (req, res) => {
    try {
      const jobs = await storage.getPhotoJobsByUser(req.session.userId!);
      
      // Per ogni lavoro, prendiamo le informazioni del cliente e i commenti
      const jobsWithDetails = await Promise.all(
        jobs.map(async (job) => {
          const client = await storage.getClient(job.clientId);
          const comments = await storage.getPhotoJobCommentsByJob(job.id);
          
          return {
            ...job,
            client: client ? {
              name: client.name,
              email: client.email
            } : undefined,
            comments
          };
        })
      );
      
      res.json(jobsWithDetails);
    } catch (error) {
      console.error('Error fetching photo jobs:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/photo-jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getPhotoJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
      
      // Verifichiamo che l'utente sia il proprietario del lavoro
      if (job.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to access this photo job" });
      }
      
      const client = await storage.getClient(job.clientId);
      const comments = await storage.getPhotoJobCommentsByJob(job.id);
      
      res.json({
        ...job,
        client: client ? {
          name: client.name,
          email: client.email
        } : undefined,
        comments
      });
    } catch (error) {
      console.error('Error fetching photo job:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/photo-jobs", requireAuth, async (req, res) => {
    try {
      const jobData = insertPhotoJobSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      const job = await storage.createPhotoJob(jobData);
      res.json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error('Error creating photo job:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  app.patch("/api/photo-jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getPhotoJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
      
      // Verifichiamo che l'utente sia il proprietario del lavoro
      if (job.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to update this photo job" });
      }
      
      const updatedJob = await storage.updatePhotoJob(jobId, req.body);
      
      // Prendiamo le informazioni aggiornate di cliente e commenti
      const client = await storage.getClient(updatedJob.clientId);
      const comments = await storage.getPhotoJobCommentsByJob(updatedJob.id);
      
      res.json({
        ...updatedJob,
        client: client ? {
          name: client.name,
          email: client.email
        } : undefined,
        comments
      });
    } catch (error) {
      console.error('Error updating photo job:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/photo-jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getPhotoJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
      
      // Verifichiamo che l'utente sia il proprietario del lavoro
      if (job.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to delete this photo job" });
      }
      
      await storage.deletePhotoJob(jobId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting photo job:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Photo Job Comments routes
  app.get("/api/photo-jobs/:jobId/comments", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getPhotoJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
      
      // Verifichiamo che l'utente sia il proprietario del lavoro
      if (job.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to access comments for this photo job" });
      }
      
      const comments = await storage.getPhotoJobCommentsByJob(jobId);
      res.json(comments);
    } catch (error) {
      console.error('Error fetching photo job comments:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/photo-jobs/:jobId/comments", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getPhotoJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
      
      // Verifichiamo che l'utente sia il proprietario del lavoro
      if (job.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to add comments to this photo job" });
      }
      
      const commentData = insertPhotoJobCommentSchema.parse({
        ...req.body,
        jobId,
        isFromClient: false // Il commento viene dal fotografo
      });
      
      const comment = await storage.createPhotoJobComment(commentData);
      res.json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error('Error creating photo job comment:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  // Verifica password per portale cliente
  app.post("/api/photo-jobs/:id/verify-password", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      const isValid = await storage.verifyPhotoJobPassword(jobId, password);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      const job = await storage.getPhotoJob(jobId);
      const client = await storage.getClient(job!.clientId);
      
      res.json({
        success: true,
        job: {
          ...job,
          client: client ? {
            name: client.name,
            email: client.email
          } : undefined
        }
      });
    } catch (error) {
      console.error('Error verifying password:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Client Portal API (per i client)
  app.get("/api/client-portal/:jobId", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getPhotoJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
      
      // Nascondiamo informazioni sensibili
      const { password, ...safeJob } = job;
      
      const client = await storage.getClient(job.clientId);
      const comments = await storage.getPhotoJobCommentsByJob(job.id);
      
      res.json({
        ...safeJob,
        client: client ? {
          name: client.name,
          email: client.email
        } : undefined,
        comments
      });
    } catch (error) {
      console.error('Error accessing client portal:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Aggiungi commento dal client portal
  app.post("/api/client-portal/:jobId/comments", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getPhotoJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
      
      const { content, password } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      
      // Se c'è una password, verifichiamola
      if (job.password) {
        if (!password) {
          return res.status(401).json({ message: "Password is required" });
        }
        
        const isValid = await storage.verifyPhotoJobPassword(jobId, password);
        if (!isValid) {
          return res.status(401).json({ message: "Invalid password" });
        }
      }
      
      const commentData = insertPhotoJobCommentSchema.parse({
        jobId,
        content,
        isFromClient: true // Il commento viene dal cliente
      });
      
      const comment = await storage.createPhotoJobComment(commentData);
      res.json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error('Error creating client comment:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}