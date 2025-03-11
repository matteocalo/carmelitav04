// server/index.ts
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  clients;
  equipment;
  events;
  teams;
  photoJobs;
  photoJobComments;
  currentIds;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.clients = /* @__PURE__ */ new Map();
    this.equipment = /* @__PURE__ */ new Map();
    this.events = /* @__PURE__ */ new Map();
    this.teams = /* @__PURE__ */ new Map();
    this.photoJobs = /* @__PURE__ */ new Map();
    this.photoJobComments = /* @__PURE__ */ new Map();
    this.currentIds = {
      users: 1,
      clients: 1,
      equipment: 1,
      events: 1,
      teams: 1,
      photoJobs: 1,
      photoJobComments: 1
    };
  }
  // Users
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async getUserByEmail(email) {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  async createUser(insertUser) {
    const id = this.currentIds.users++;
    const user = {
      id,
      ...insertUser,
      teamId: null
    };
    this.users.set(id, user);
    return user;
  }
  // Clients
  async getClient(id) {
    return this.clients.get(id);
  }
  async getClientsByUser(userId) {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId
    );
  }
  async createClient(insertClient) {
    const id = this.currentIds.clients++;
    const client = {
      id,
      name: insertClient.name,
      email: insertClient.email,
      userId: insertClient.userId,
      phone: insertClient.phone ?? null,
      notes: insertClient.notes ?? null,
      address: insertClient.address ?? null,
      vatNumber: insertClient.vatNumber ?? null
    };
    this.clients.set(id, client);
    return client;
  }
  async updateClient(id, updateData) {
    const client = await this.getClient(id);
    if (!client) throw new Error("Client not found");
    const updatedClient = {
      ...client,
      ...updateData,
      phone: updateData.phone ?? client.phone,
      notes: updateData.notes ?? client.notes,
      address: updateData.address ?? client.address,
      vatNumber: updateData.vatNumber ?? client.vatNumber
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }
  async deleteClient(id) {
    this.clients.delete(id);
  }
  // Equipment
  async getEquipment(id) {
    return this.equipment.get(id);
  }
  async getEquipmentByUser(userId) {
    return Array.from(this.equipment.values()).filter(
      (equipment2) => equipment2.userId === userId
    );
  }
  async createEquipment(insertEquipment) {
    const id = this.currentIds.equipment++;
    const equipment2 = {
      id,
      name: insertEquipment.name,
      type: insertEquipment.type,
      userId: insertEquipment.userId,
      status: insertEquipment.status
    };
    this.equipment.set(id, equipment2);
    return equipment2;
  }
  async updateEquipment(id, updateData) {
    const equipment2 = await this.getEquipment(id);
    if (!equipment2) throw new Error("Equipment not found");
    const updatedEquipment = { ...equipment2, ...updateData };
    this.equipment.set(id, updatedEquipment);
    return updatedEquipment;
  }
  async deleteEquipment(id) {
    this.equipment.delete(id);
  }
  // Events
  async getEvent(id) {
    return this.events.get(id);
  }
  async getEventsByUser(userId) {
    return Array.from(this.events.values()).filter(
      (event) => event.userId === userId
    );
  }
  async createEvent(insertEvent) {
    const id = this.currentIds.events++;
    const event = {
      id,
      title: insertEvent.title,
      date: insertEvent.date,
      userId: insertEvent.userId,
      notes: insertEvent.notes ?? null,
      clientId: insertEvent.clientId ?? null,
      equipmentIds: insertEvent.equipmentIds ?? null
    };
    this.events.set(id, event);
    return event;
  }
  async updateEvent(id, updateData) {
    const event = await this.getEvent(id);
    if (!event) throw new Error("Event not found");
    const updatedEvent = {
      ...event,
      ...updateData,
      notes: updateData.notes ?? event.notes,
      clientId: updateData.clientId ?? event.clientId,
      equipmentIds: updateData.equipmentIds ?? event.equipmentIds
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }
  async deleteEvent(id) {
    this.events.delete(id);
  }
  // Teams
  async getTeam(id) {
    return this.teams.get(id);
  }
  async createTeam(insertTeam) {
    const id = this.currentIds.teams++;
    const team = { id, ...insertTeam };
    this.teams.set(id, team);
    return team;
  }
  async updateTeam(id, updateData) {
    const team = await this.getTeam(id);
    if (!team) throw new Error("Team not found");
    const updatedTeam = { ...team, ...updateData };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }
  async deleteTeam(id) {
    this.teams.delete(id);
  }
  // Photo Jobs
  async getPhotoJob(id) {
    return this.photoJobs.get(id);
  }
  async getPhotoJobsByUser(userId) {
    return Array.from(this.photoJobs.values()).filter(
      (job) => job.userId === userId
    );
  }
  async getPhotoJobsByClient(clientId) {
    return Array.from(this.photoJobs.values()).filter(
      (job) => job.clientId === clientId
    );
  }
  async createPhotoJob(insertJob) {
    const id = this.currentIds.photoJobs++;
    const now = /* @__PURE__ */ new Date();
    const job = {
      id,
      userId: insertJob.userId,
      clientId: insertJob.clientId,
      title: insertJob.title,
      description: insertJob.description ?? null,
      status: insertJob.status ?? "TBC",
      amount: insertJob.amount ?? null,
      jobDate: insertJob.jobDate ?? null,
      endDate: insertJob.endDate ?? null,
      downloadLink: insertJob.downloadLink ?? null,
      downloadExpiry: insertJob.downloadExpiry ?? null,
      password: insertJob.password ?? null,
      equipmentIds: insertJob.equipmentIds ?? null,
      createdAt: now,
      updatedAt: now
    };
    this.photoJobs.set(id, job);
    return job;
  }
  async updatePhotoJob(id, updateData) {
    const job = await this.getPhotoJob(id);
    if (!job) throw new Error("Photo job not found");
    const updatedJob = {
      ...job,
      ...updateData,
      description: updateData.description ?? job.description,
      status: updateData.status ?? job.status,
      amount: updateData.amount ?? job.amount,
      jobDate: updateData.jobDate ?? job.jobDate,
      endDate: updateData.endDate ?? job.endDate,
      downloadLink: updateData.downloadLink ?? job.downloadLink,
      downloadExpiry: updateData.downloadExpiry ?? job.downloadExpiry,
      password: updateData.password ?? job.password,
      equipmentIds: updateData.equipmentIds ?? job.equipmentIds,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.photoJobs.set(id, updatedJob);
    return updatedJob;
  }
  async deletePhotoJob(id) {
    this.photoJobs.delete(id);
    const commentsToDelete = Array.from(this.photoJobComments.values()).filter((comment) => comment.jobId === id).map((comment) => comment.id);
    commentsToDelete.forEach((commentId) => {
      this.photoJobComments.delete(commentId);
    });
  }
  async verifyPhotoJobPassword(id, password) {
    const job = await this.getPhotoJob(id);
    if (!job) return false;
    if (!job.password) return true;
    return job.password === password;
  }
  // Photo Job Comments
  async getPhotoJobComment(id) {
    return this.photoJobComments.get(id);
  }
  async getPhotoJobCommentsByJob(jobId) {
    return Array.from(this.photoJobComments.values()).filter((comment) => comment.jobId === jobId).sort((a, b) => {
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }
  async createPhotoJobComment(insertComment) {
    const id = this.currentIds.photoJobComments++;
    const now = /* @__PURE__ */ new Date();
    const comment = {
      id,
      jobId: insertComment.jobId,
      content: insertComment.content,
      isFromClient: insertComment.isFromClient ?? false,
      createdAt: now,
      updatedAt: now
    };
    this.photoJobComments.set(id, comment);
    return comment;
  }
  async updatePhotoJobComment(id, updateData) {
    const comment = await this.getPhotoJobComment(id);
    if (!comment) throw new Error("Photo job comment not found");
    const updatedComment = {
      ...comment,
      ...updateData,
      content: updateData.content ?? comment.content,
      isFromClient: updateData.isFromClient ?? comment.isFromClient,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.photoJobComments.set(id, updatedComment);
    return updatedComment;
  }
  async deletePhotoJobComment(id) {
    this.photoJobComments.delete(id);
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["admin", "photographer", "assistant"] }).notNull().default("photographer"),
  teamId: integer("team_id").references(() => teams.id),
  iban: text("iban"),
  bankName: text("bank_name"),
  bankAddress: text("bank_address"),
  bicCode: text("bic_code")
});
var clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  vatNumber: text("vat_number"),
  address: text("address"),
  userId: integer("user_id").notNull().references(() => users.id),
  notes: text("notes")
});
var equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status", { enum: ["available", "in_use", "maintenance"] }).notNull()
});
var events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  endDate: timestamp("end_date"),
  clientId: integer("client_id").references(() => clients.id),
  userId: integer("user_id").notNull().references(() => users.id),
  equipmentIds: integer("equipment_ids").array(),
  notes: text("notes")
});
var teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull().references(() => users.id)
});
var photoJobs = pgTable("photo_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: [
      "TBC",
      "CONFIRMED",
      "DOWNLOADED",
      "IN_PROGRESS",
      "READY_FOR_DOWNLOAD",
      "READY_FOR_REVIEW",
      "PENDING_PAYMENT",
      "COMPLETED"
    ]
  }).notNull().default("TBC"),
  amount: integer("amount"),
  jobDate: timestamp("job_date"),
  endDate: timestamp("end_date"),
  downloadLink: text("download_link"),
  downloadExpiry: timestamp("download_expiry"),
  password: text("password"),
  equipmentIds: integer("equipment_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var photoJobComments = pgTable("photo_job_comments", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => photoJobs.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isFromClient: boolean("is_from_client").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
  teamId: true
});
var insertClientSchema = createInsertSchema(clients).pick({
  name: true,
  email: true,
  phone: true,
  vatNumber: true,
  address: true,
  userId: true,
  notes: true
});
var insertEquipmentSchema = createInsertSchema(equipment).pick({
  name: true,
  type: true,
  userId: true,
  status: true
});
var insertEventSchema = createInsertSchema(events).pick({
  title: true,
  date: true,
  endDate: true,
  clientId: true,
  userId: true,
  equipmentIds: true,
  notes: true
});
var insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  ownerId: true
});
var insertPhotoJobSchema = createInsertSchema(photoJobs).pick({
  userId: true,
  clientId: true,
  title: true,
  description: true,
  status: true,
  amount: true,
  jobDate: true,
  endDate: true,
  downloadLink: true,
  downloadExpiry: true,
  password: true,
  equipmentIds: true
});
var insertPhotoJobCommentSchema = createInsertSchema(photoJobComments).pick({
  jobId: true,
  content: true,
  isFromClient: true
});

// server/routes.ts
import session from "express-session";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
async function registerRoutes(app2) {
  const server2 = createServer(app2);
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No authorization header" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ message: "Invalid token" });
      }
      req.session.userId = parseInt(user.id);
      next();
    } catch (error) {
      console.error("Auth error:", error);
      return res.status(401).json({ message: "Authentication failed" });
    }
  };
  app2.use(
    session({
      secret: process.env.SESSION_SECRET || "dev_secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1e3
        // 24 hours
      }
    })
  );
  app2.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const clients2 = await storage.getClientsByUser(req.session.userId);
      res.json(clients2);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/clients", requireAuth, async (req, res) => {
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
        console.error("Error creating client:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });
  app2.get("/api/equipment", requireAuth, async (req, res) => {
    try {
      const equipment2 = await storage.getEquipmentByUser(req.session.userId);
      res.json(equipment2);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/equipment", requireAuth, async (req, res) => {
    try {
      const equipmentData = insertEquipmentSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      const equipment2 = await storage.createEquipment(equipmentData);
      res.json(equipment2);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error("Error creating equipment:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });
  app2.get("/api/events", requireAuth, async (req, res) => {
    try {
      const events2 = await storage.getEventsByUser(req.session.userId);
      res.json(events2);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/events", requireAuth, async (req, res) => {
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
        console.error("Error creating event:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });
  app2.post("/api/teams", requireAuth, async (req, res) => {
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
        console.error("Error creating team:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });
  app2.get("/api/photo-jobs", requireAuth, async (req, res) => {
    try {
      const jobs = await storage.getPhotoJobsByUser(req.session.userId);
      const jobsWithDetails = await Promise.all(
        jobs.map(async (job) => {
          const client = await storage.getClient(job.clientId);
          const comments = await storage.getPhotoJobCommentsByJob(job.id);
          return {
            ...job,
            client: client ? {
              name: client.name,
              email: client.email
            } : void 0,
            comments
          };
        })
      );
      res.json(jobsWithDetails);
    } catch (error) {
      console.error("Error fetching photo jobs:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/photo-jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getPhotoJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
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
        } : void 0,
        comments
      });
    } catch (error) {
      console.error("Error fetching photo job:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/photo-jobs", requireAuth, async (req, res) => {
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
        console.error("Error creating photo job:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });
  app2.patch("/api/photo-jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getPhotoJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
      if (job.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to update this photo job" });
      }
      const updatedJob = await storage.updatePhotoJob(jobId, req.body);
      const client = await storage.getClient(updatedJob.clientId);
      const comments = await storage.getPhotoJobCommentsByJob(updatedJob.id);
      res.json({
        ...updatedJob,
        client: client ? {
          name: client.name,
          email: client.email
        } : void 0,
        comments
      });
    } catch (error) {
      console.error("Error updating photo job:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.delete("/api/photo-jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getPhotoJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
      if (job.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to delete this photo job" });
      }
      await storage.deletePhotoJob(jobId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting photo job:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/photo-jobs/:jobId/comments", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getPhotoJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
      if (job.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to access comments for this photo job" });
      }
      const comments = await storage.getPhotoJobCommentsByJob(jobId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching photo job comments:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/photo-jobs/:jobId/comments", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getPhotoJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
      if (job.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to add comments to this photo job" });
      }
      const commentData = insertPhotoJobCommentSchema.parse({
        ...req.body,
        jobId,
        isFromClient: false
        // Il commento viene dal fotografo
      });
      const comment = await storage.createPhotoJobComment(commentData);
      res.json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error("Error creating photo job comment:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });
  app2.post("/api/photo-jobs/:id/verify-password", async (req, res) => {
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
      const client = await storage.getClient(job.clientId);
      res.json({
        success: true,
        job: {
          ...job,
          client: client ? {
            name: client.name,
            email: client.email
          } : void 0
        }
      });
    } catch (error) {
      console.error("Error verifying password:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/client-portal/:jobId", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getPhotoJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Photo job not found" });
      }
      const { password, ...safeJob } = job;
      const client = await storage.getClient(job.clientId);
      const comments = await storage.getPhotoJobCommentsByJob(job.id);
      res.json({
        ...safeJob,
        client: client ? {
          name: client.name,
          email: client.email
        } : void 0,
        comments
      });
    } catch (error) {
      console.error("Error accessing client portal:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/client-portal/:jobId/comments", async (req, res) => {
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
        isFromClient: true
        // Il commento viene dal cliente
      });
      const comment = await storage.createPhotoJobComment(commentData);
      res.json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error("Error creating client comment:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            "react",
            "react-dom",
            "react-router-dom",
            "@supabase/supabase-js",
            "@tanstack/react-query"
          ],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-avatar",
            "@radix-ui/react-tabs",
            "lucide-react",
            "class-variance-authority",
            "clsx",
            "tailwind-merge"
          ]
        }
      }
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server2) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server: server2 },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(process.cwd(), "dist/public");
  if (!fs.existsSync(distPath)) {
    console.warn(`Build directory not found at ${distPath}, falling back to default path`);
    const fallbackPath = path2.resolve(__dirname2, "public");
    if (!fs.existsSync(fallbackPath)) {
      console.error(`Could not find the build directory at ${fallbackPath} either`);
      return;
    }
    app2.use(express.static(fallbackPath));
    app2.use("*", (_req, res) => {
      res.sendFile(path2.resolve(fallbackPath, "index.html"));
    });
    return;
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${path3} - Request started`);
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${path3} - Response finished in ${duration}ms with status ${res.statusCode}`);
  });
  next();
});
process.on("uncaughtException", (error) => {
  console.error("[Uncaught Exception]", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Unhandled Rejection]", reason);
});
app.use((err, _req, res, _next) => {
  console.error("[Error Handler]", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});
var server = await registerRoutes(app);
if (process.env.NODE_ENV === "development") {
  console.log("Setting up Vite in development mode...");
  await setupVite(app, server);
} else {
  console.log("Setting up static serving in production mode...");
  serveStatic(app);
}
if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
  const port = process.env.PORT || 3e3;
  server.listen(port, () => {
    console.log(`Server successfully started and listening on port ${port}`);
    log(`serving on port ${port}`);
  });
} else if (process.env.VERCEL) {
  console.log("Running in Vercel environment");
}
var index_default = app;
export {
  index_default as default
};
