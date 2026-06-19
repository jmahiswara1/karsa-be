import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { envSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotesModule } from './modules/notes/notes.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TaskColumnsModule } from './modules/task-columns/task-columns.module';
import { NoteFoldersModule } from './modules/note-folders/note-folders.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { PlannerModule } from './modules/planner/planner.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds (1 minute)
        limit: 60, // 60 requests per minute
      },
      {
        name: 'strict',
        ttl: 60000, // 60 seconds (1 minute)
        limit: 10, // 10 requests per minute (for AI endpoints)
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    NotesModule,
    DashboardModule,
    TaskColumnsModule,
    NoteFoldersModule,
    AssistantModule,
    PlannerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
