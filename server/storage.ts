import {
  users, clients, equipment, events, teams, photoJobs, photoJobComments,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Equipment, type InsertEquipment,
  type Event, type InsertEvent,
  type Team, type InsertTeam,
  type PhotoJob, type InsertPhotoJob,
  type PhotoJobComment, type InsertPhotoJobComment
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients
  getClient(id: number): Promise<Client | undefined>;
  getClientsByUser(userId: number): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;

  // Equipment
  getEquipment(id: number): Promise<Equipment | undefined>;
  getEquipmentByUser(userId: number): Promise<Equipment[]>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: number, equipment: Partial<InsertEquipment>): Promise<Equipment>;
  deleteEquipment(id: number): Promise<void>;

  // Events
  getEvent(id: number): Promise<Event | undefined>;
  getEventsByUser(userId: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;

  // Teams
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team>;
  deleteTeam(id: number): Promise<void>;
  
  // Photo Jobs
  getPhotoJob(id: number): Promise<PhotoJob | undefined>;
  getPhotoJobsByUser(userId: number): Promise<PhotoJob[]>;
  getPhotoJobsByClient(clientId: number): Promise<PhotoJob[]>;
  createPhotoJob(job: InsertPhotoJob): Promise<PhotoJob>;
  updatePhotoJob(id: number, job: Partial<InsertPhotoJob>): Promise<PhotoJob>;
  deletePhotoJob(id: number): Promise<void>;
  verifyPhotoJobPassword(id: number, password: string): Promise<boolean>;
  
  // Photo Job Comments
  getPhotoJobComment(id: number): Promise<PhotoJobComment | undefined>;
  getPhotoJobCommentsByJob(jobId: number): Promise<PhotoJobComment[]>;
  createPhotoJobComment(comment: InsertPhotoJobComment): Promise<PhotoJobComment>;
  updatePhotoJobComment(id: number, comment: Partial<InsertPhotoJobComment>): Promise<PhotoJobComment>;
  deletePhotoJobComment(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private equipment: Map<number, Equipment>;
  private events: Map<number, Event>;
  private teams: Map<number, Team>;
  private photoJobs: Map<number, PhotoJob>;
  private photoJobComments: Map<number, PhotoJobComment>;
  private currentIds: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.equipment = new Map();
    this.events = new Map();
    this.teams = new Map();
    this.photoJobs = new Map();
    this.photoJobComments = new Map();
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
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const user: User = {
      id,
      ...insertUser,
      teamId: null,
    };
    this.users.set(id, user);
    return user;
  }

  // Clients
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientsByUser(userId: number): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId
    );
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.currentIds.clients++;
    const client: Client = {
      id,
      name: insertClient.name,
      email: insertClient.email,
      userId: insertClient.userId,
      phone: insertClient.phone ?? null,
      notes: insertClient.notes ?? null,
      address: insertClient.address ?? null,
      vatNumber: insertClient.vatNumber ?? null,
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: number, updateData: Partial<InsertClient>): Promise<Client> {
    const client = await this.getClient(id);
    if (!client) throw new Error("Client not found");

    const updatedClient = {
      ...client,
      ...updateData,
      phone: updateData.phone ?? client.phone,
      notes: updateData.notes ?? client.notes,
      address: updateData.address ?? client.address,
      vatNumber: updateData.vatNumber ?? client.vatNumber,
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<void> {
    this.clients.delete(id);
  }

  // Equipment
  async getEquipment(id: number): Promise<Equipment | undefined> {
    return this.equipment.get(id);
  }

  async getEquipmentByUser(userId: number): Promise<Equipment[]> {
    return Array.from(this.equipment.values()).filter(
      (equipment) => equipment.userId === userId
    );
  }

  async createEquipment(insertEquipment: InsertEquipment): Promise<Equipment> {
    const id = this.currentIds.equipment++;
    const equipment: Equipment = {
      id,
      name: insertEquipment.name,
      type: insertEquipment.type,
      userId: insertEquipment.userId,
      status: insertEquipment.status,
    };
    this.equipment.set(id, equipment);
    return equipment;
  }

  async updateEquipment(id: number, updateData: Partial<InsertEquipment>): Promise<Equipment> {
    const equipment = await this.getEquipment(id);
    if (!equipment) throw new Error("Equipment not found");

    const updatedEquipment = { ...equipment, ...updateData };
    this.equipment.set(id, updatedEquipment);
    return updatedEquipment;
  }

  async deleteEquipment(id: number): Promise<void> {
    this.equipment.delete(id);
  }

  // Events
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEventsByUser(userId: number): Promise<Event[]> {
    return Array.from(this.events.values()).filter(
      (event) => event.userId === userId
    );
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.currentIds.events++;
    const event: Event = {
      id,
      title: insertEvent.title,
      date: insertEvent.date,
      userId: insertEvent.userId,
      notes: insertEvent.notes ?? null,
      clientId: insertEvent.clientId ?? null,
      equipmentIds: insertEvent.equipmentIds ?? null,
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: number, updateData: Partial<InsertEvent>): Promise<Event> {
    const event = await this.getEvent(id);
    if (!event) throw new Error("Event not found");

    const updatedEvent = {
      ...event,
      ...updateData,
      notes: updateData.notes ?? event.notes,
      clientId: updateData.clientId ?? event.clientId,
      equipmentIds: updateData.equipmentIds ?? event.equipmentIds,
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<void> {
    this.events.delete(id);
  }

  // Teams
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = this.currentIds.teams++;
    const team: Team = { id, ...insertTeam };
    this.teams.set(id, team);
    return team;
  }

  async updateTeam(id: number, updateData: Partial<InsertTeam>): Promise<Team> {
    const team = await this.getTeam(id);
    if (!team) throw new Error("Team not found");

    const updatedTeam = { ...team, ...updateData };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<void> {
    this.teams.delete(id);
  }
  
  // Photo Jobs
  async getPhotoJob(id: number): Promise<PhotoJob | undefined> {
    return this.photoJobs.get(id);
  }

  async getPhotoJobsByUser(userId: number): Promise<PhotoJob[]> {
    return Array.from(this.photoJobs.values()).filter(
      (job) => job.userId === userId
    );
  }

  async getPhotoJobsByClient(clientId: number): Promise<PhotoJob[]> {
    return Array.from(this.photoJobs.values()).filter(
      (job) => job.clientId === clientId
    );
  }

  async createPhotoJob(insertJob: InsertPhotoJob): Promise<PhotoJob> {
    const id = this.currentIds.photoJobs++;
    const now = new Date();
    const job: PhotoJob = {
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
      updatedAt: now,
    };
    this.photoJobs.set(id, job);
    return job;
  }

  async updatePhotoJob(id: number, updateData: Partial<InsertPhotoJob>): Promise<PhotoJob> {
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
      updatedAt: new Date(),
    };
    this.photoJobs.set(id, updatedJob);
    return updatedJob;
  }

  async deletePhotoJob(id: number): Promise<void> {
    this.photoJobs.delete(id);
    
    // Elimina anche i commenti associati al lavoro
    const commentsToDelete = Array.from(this.photoJobComments.values())
      .filter(comment => comment.jobId === id)
      .map(comment => comment.id);
      
    commentsToDelete.forEach(commentId => {
      this.photoJobComments.delete(commentId);
    });
  }
  
  async verifyPhotoJobPassword(id: number, password: string): Promise<boolean> {
    const job = await this.getPhotoJob(id);
    if (!job) return false;
    
    if (!job.password) return true; // Se non c'è password, consideriamo la verifica riuscita
    return job.password === password;
  }
  
  // Photo Job Comments
  async getPhotoJobComment(id: number): Promise<PhotoJobComment | undefined> {
    return this.photoJobComments.get(id);
  }

  async getPhotoJobCommentsByJob(jobId: number): Promise<PhotoJobComment[]> {
    return Array.from(this.photoJobComments.values())
      .filter(comment => comment.jobId === jobId)
      .sort((a, b) => {
        // Ordina i commenti per data di creazione (dal più recente al più vecchio)
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  async createPhotoJobComment(insertComment: InsertPhotoJobComment): Promise<PhotoJobComment> {
    const id = this.currentIds.photoJobComments++;
    const now = new Date();
    const comment: PhotoJobComment = {
      id,
      jobId: insertComment.jobId,
      content: insertComment.content,
      isFromClient: insertComment.isFromClient ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.photoJobComments.set(id, comment);
    return comment;
  }

  async updatePhotoJobComment(id: number, updateData: Partial<InsertPhotoJobComment>): Promise<PhotoJobComment> {
    const comment = await this.getPhotoJobComment(id);
    if (!comment) throw new Error("Photo job comment not found");

    const updatedComment: PhotoJobComment = {
      ...comment,
      ...updateData,
      content: updateData.content ?? comment.content,
      isFromClient: updateData.isFromClient ?? comment.isFromClient,
      updatedAt: new Date(),
    };
    this.photoJobComments.set(id, updatedComment);
    return updatedComment;
  }

  async deletePhotoJobComment(id: number): Promise<void> {
    this.photoJobComments.delete(id);
  }
}

export const storage = new MemStorage();