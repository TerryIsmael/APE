import { users } from "../schema/user.schema.ts" 
import { ObjectId } from "https://deno.land/x/mongo/mod.ts"
import { insertId } from "../populator.ts"

const user1 = await users.findOne({ _id: insertId });

const all_users = await users.find({ username: { $ne: null } }).toArray();

// find by ObjectId
const user1_id = await users.findOne({
  _id: new ObjectId("SOME OBJECTID STRING"),
});

console.log(user1_id)