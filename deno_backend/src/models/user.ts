import { ObjectId } from "https://deno.land/x/mongo/mod.ts"

export default interface User {
    _id: ObjectId;
    username: string;
    password: string;
  }
  
