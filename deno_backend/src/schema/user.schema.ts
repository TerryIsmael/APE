import { client } from "../utils/connectDB.ts"
import { ObjectId } from "https://deno.land/x/mongo/mod.ts"

interface UserSchema {
    _id: ObjectId;
    username: string;
    password: string;
  }
  
  const db = client.database("test");
  export const users = db.collection<UserSchema>("users");