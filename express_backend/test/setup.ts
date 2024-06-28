import { afterAll, beforeAll } from "bun:test";
import { app } from '../app.ts';
import User from "../src/schemas/userSchema.ts";
import Item from "../src/schemas/itemSchema.ts";
import Invitation from "../src/schemas/invitationSchema.ts";
import Chat from "../src/schemas/chatSchema.ts";
import Profile from "../src/schemas/profileSchema.ts";
import Workspace from "../src/schemas/workspaceSchema.ts";

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
});

afterAll(async () => {
  await User.deleteMany({ });
  await Workspace.deleteMany({ });
  await Profile.deleteMany({ });
  await Chat.deleteMany({ });
  await Invitation.deleteMany({ });
  await Item.deleteMany({ });  
  server.close();
});