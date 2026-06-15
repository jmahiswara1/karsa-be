import { z } from 'zod';

export const envSchema = z
  .object({
    PORT: z.string().default('3001'),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CALLBACK_URL: z.string().optional(),
    AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
    AI_SERVICE_TOKEN: z.string().default('karsa_dev_token'),
    CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
  })
  .passthrough();
