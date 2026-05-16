import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  databaseUrl: process.env.DATABASE_URL ?? "",
  dbHost: process.env.DB_HOST ?? "localhost",
  dbPort: Number(process.env.DB_PORT ?? 5432),
  dbName: process.env.DB_NAME ?? "infra_management",
  dbUser: process.env.DB_USER ?? "postgres",
  dbPassword: process.env.DB_PASSWORD ?? "postgres",
  dbSsl: process.env.DB_SSL === "true",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV ?? "development"
};
