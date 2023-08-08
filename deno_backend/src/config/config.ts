
export const config: {
  port: number;
  dbUri: string;
  dbName: string;
} = {
  port: parseInt(Deno.env.get("SERVER_PORT") as string),
  dbUri: Deno.env.get("MONGODB_URI") as string,
  dbName: Deno.env.get("MONGO_INITDB_DATABASE") as string,
};

export default config;

