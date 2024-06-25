import { afterAll, beforeAll } from "bun:test";
import { app } from '../app.ts';
import User from "../src/schemas/userSchema.ts";
import Item from "../src/schemas/itemSchema.ts";
import Invitation from "../src/schemas/invitationSchema.ts";
import Chat from "../src/schemas/chatSchema.ts";
import Profile from "../src/schemas/profileSchema.ts";
import Workspace from "../src/schemas/workspaceSchema.ts";
import bcrypt from 'bcrypt';

export let server: any;

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server = app.listen(app.get('serverPort'), (err?: Error) => {
      if (err) return reject(err);
      console.log('Test server running on port '+ app.get('serverPort'));
      resolve();
    });
  });
}

beforeAll(async () => {
    await startServer();
    await User.deleteMany({ });
    await Workspace.deleteMany({ });
    await Profile.deleteMany({ });
    await Chat.deleteMany({ });
    await Invitation.deleteMany({ });
    await Item.deleteMany({ });
    await User.create({ username: 'userTest', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'userTest@gmail.com'});
});

afterAll(async () => {
    //await User.deleteOne({ username: 'userTest' });
    server.close();
});