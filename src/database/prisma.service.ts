import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public client: PrismaClient;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    this.client = new PrismaClient({ adapter, log: ['error'] });
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  // Expose commonly used models directly
  get user() {
    return this.client.user;
  }
  get userPreference() {
    return this.client.userPreference;
  }
  get project() {
    return this.client.project;
  }
  get task() {
    return this.client.task;
  }
  get note() {
    return this.client.note;
  }
  get taskColumn() {
    return this.client.taskColumn;
  }
  get noteFolder() {
    return this.client.noteFolder;
  }
  get dailyPlan() {
    return this.client.dailyPlan;
  }
  get plannerEntry() {
    return this.client.plannerEntry;
  }
  get conversation() {
    return this.client.conversation;
  }
  get message() {
    return this.client.message;
  }
  get $transaction() {
    return this.client.$transaction.bind(this.client);
  }
}
