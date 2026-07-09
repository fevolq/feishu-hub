import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { appConfig } from "@/server/config";

let database: Database.Database | null = null;

const readSchema = () => {
  return fs.readFileSync(path.join(process.cwd(), "src", "server", "db", "schema.sql"), "utf8");
};

export const getDb = () => {
  if (database) {
    return database;
  }

  fs.mkdirSync(path.dirname(appConfig.databasePath), { recursive: true });
  database = new Database(appConfig.databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(readSchema());
  return database;
};
