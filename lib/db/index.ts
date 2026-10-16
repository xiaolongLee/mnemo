import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

/**
 * prepare: false。
 * Supabase 事务池和部分 serverless 环境里连接是短命的，预处理语句无法复用，会直接报错。
 */
const client = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(client, { schema });
