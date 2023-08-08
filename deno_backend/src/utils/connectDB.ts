import { MongoClient, Database } from '../deps.ts';
import config from '../config/config.ts';

export default async function connectDB(): Promise<Database> {
  const dbUri = config.dbUri;
  const dbName = config.dbName;
  const client: MongoClient = new MongoClient();
  await client.connect(dbUri);
  const database:Database = client.database(dbName)
  console.log('🚀 Connected to MongoDB Database "'+ dbName +'" successfully');
  return database;
}