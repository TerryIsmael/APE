import { users } from "./schema/user.schema.ts" 

export const insertId = await users.insertOne({
  username: "user1",
  password: "pass1",
});

const insertIds = await users.insertMany([
  {
    username: "user1",
    password: "pass1",
  },
  {
    username: "user2",
    password: "pass2",
  },
]);