import {client} from "../server.ts";
import { ObjectId } from "https://deno.land/x/mongo/mod.ts"

interface UserSchema {
    _id: ObjectId;
    username: string;
    password: string;
  }
  
  export const users = client.collection<UserSchema>("users");