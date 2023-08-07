import { MongoClient } from '../deps.ts';
//import config from '../config/default.ts';
import { dotenvConfig } from "../deps.ts";

dotenvConfig({ export: true, path: ".env" });

const config: {
    port: number;
    dbUri: string;
    dbName: string;
  } = {
    port: parseInt(Deno.env.get("SERVER_PORT") as string),
    dbUri: Deno.env.get("MONGODB_URI") as string,
    dbName: Deno.env.get("MONGO_INITDB_DATABASE") as string,
  };

export default async function connectDB(): Promise<MongoClient> {
  const dbUri = config.dbUri;
  const dbName = Deno.env.get('MONGO_INITDB_DATABASE') as string;
  console.log(config);
  const client: MongoClient = new MongoClient();
  await client.connect("mongodb://generic_admin:generic_admin_pass@127.0.0.1:27017/?authMechanism=SCRAM-SHA-256");
  console.log('🚀 Connected to MongoDB Successfully');
  return client;
}

