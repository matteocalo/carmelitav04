import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["admin", "photographer", "assistant"] }).notNull().default("photographer"),
  teamId: integer("team_id").references(() => teams.id),
  iban: text("iban"),
  bankName: text("bank_name"),
  bankAddress: text("bank_address"),
  bicCode: text("bic_code"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  vatNumber: text("vat_number"),
  address: text("address"),
  userId: integer("user_id").notNull().references(() => users.id),
  notes: text("notes"),
});

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status", { enum: ["available", "in_use", "maintenance"] }).notNull(),
});

export type Equipment = typeof equipment.$inferSelect;
export type NewEquipment = typeof equipment.$inferInsert;

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  endDate: timestamp("end_date"),
  clientId: integer("client_id").references(() => clients.id),
  userId: integer("user_id").notNull().references(() => users.id),
  equipmentIds: integer("equipment_ids").array(),
  notes: text("notes"),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export const photoJobs = pgTable("photo_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { 
    enum: ["TBC", "CONFIRMED", "DOWNLOADED", "IN_PROGRESS", "READY_FOR_DOWNLOAD", 
           "READY_FOR_REVIEW", "PENDING_PAYMENT", "COMPLETED"] 
  }).notNull().default("TBC"),
  amount: integer("amount"),
  jobDate: timestamp("job_date"),
  endDate: timestamp("end_date"),
  downloadLink: text("download_link"),
  downloadExpiry: timestamp("download_expiry"),
  password: text("password"),
  equipmentIds: integer("equipment_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PhotoJob = typeof photoJobs.$inferSelect;
export type NewPhotoJob = typeof photoJobs.$inferInsert;

export const photoJobComments = pgTable("photo_job_comments", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => photoJobs.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  isFromClient: boolean("is_from_client").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PhotoJobComment = typeof photoJobComments.$inferSelect;
export type NewPhotoJobComment = typeof photoJobComments.$inferInsert;

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
  teamId: true,
});

export const insertClientSchema = createInsertSchema(clients).pick({
  name: true,
  email: true,
  phone: true,
  vatNumber: true,
  address: true,
  userId: true,
  notes: true,
});

export const insertEquipmentSchema = createInsertSchema(equipment).pick({
  name: true,
  type: true,
  userId: true,
  status: true,
});

export const insertEventSchema = createInsertSchema(events).pick({
  title: true,
  date: true,
  endDate: true,
  clientId: true,
  userId: true,
  equipmentIds: true,
  notes: true,
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  ownerId: true,
});

export const insertPhotoJobSchema = createInsertSchema(photoJobs).pick({
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
  equipmentIds: true,
});

export const insertPhotoJobCommentSchema = createInsertSchema(photoJobComments).pick({
  jobId: true,
  content: true,
  isFromClient: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type PhotoJob = typeof photoJobs.$inferSelect;
export type InsertPhotoJob = z.infer<typeof insertPhotoJobSchema>;
export type PhotoJobComment = typeof photoJobComments.$inferSelect;
export type InsertPhotoJobComment = z.infer<typeof insertPhotoJobCommentSchema>;