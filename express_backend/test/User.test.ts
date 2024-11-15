import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import request from 'supertest';
import { app } from '../app.ts';
import fs from 'fs';
import Profile from "../src/schemas/profileSchema.ts";
import Workspace from "../src/schemas/workspaceSchema.ts";
import User from "../src/schemas/userSchema.ts";
import bcrypt from 'bcrypt';
import Chat from "../src/schemas/chatSchema.ts";
import { WSPermission } from "../src/models/profile.ts";
import { FolderItem } from "../src/schemas/itemSchema.ts";
import { Permission } from "../src/models/profilePerms.ts";
import { ItemType } from "../src/models/item.ts";
import type mongoose from 'mongoose';

let notLoggedAgent = request.agent(app);
let userAgent = request.agent(app);
let trash: (mongoose.Types.ObjectId|undefined)[] = [];

beforeAll( async () => {
  await User.deleteMany({ });
  await Workspace.deleteMany({ });
  await Profile.deleteMany({ });

  const user = await User.create({ username: 'userTestEdit', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'userTestEdit@gmail.com'});
  const user2 = await User.create({ username: 'chatUser', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'chatUser', surnames: 'chatUser', email: 'chatUser@gmail.com'});

  await Chat.create({ name: 'userTestEditChat', type: "Private", users: [user._id], messages: [], updatedAt: new Date() });
  await Chat.create({ name: 'userTestEditChat', type: "Private", users: [user._id, user2._id], messages: [], updatedAt: new Date() });
  const profile = await Profile.create({profileType: 'Individual', name: user._id, users: [user._id], wsPerm: WSPermission.Owner});
  const workspace = await Workspace.create({name: 'Workspace de ' + user.username, creationDate: new Date(), items: [], profiles: [profile._id], default: true});
  const item = await FolderItem.create({name: 'FolderTest', creationDate: new Date(), itemType: ItemType.Folder, profilePerms: [{profile: profile._id, perm: Permission.Owner}]});
  workspace.items.push(item._id);
  await workspace.save();
});

afterAll( async () => {
  trash = trash.filter((id) => id !== undefined);
  for(const id of trash) {
    fs.rmSync(`uploads/${id}`, { recursive: true });
  }
});

describe('/register POST', () => {
  it('201', async () => {
    const res = await notLoggedAgent.post('/register')
      .send({ username: 'UserTestNew', password: '12345678910aA@', firstName: 'Test', surnames: 'Test', email: 'UserTestNew@gmail.com'});
    expect(res.status).toBe(201);
    const user = await User.findOne({ username: 'UserTestNew' });
    const profiles = await Profile.find({ name: user?._id, wsPerm: 'Owner' }).select('_id');
    const workspace = await Workspace.findOne({default: 1, profiles: { $in: profiles }});
    fs.access(`uploads/${workspace?._id}/temp`, fs.constants.F_OK, (err) => {
      if (err) {
        return new Error('No se ha encontrado la carpeta por defecto');
      } else{
        trash.push(workspace?._id);
      }
    });
  });
  
  it('400 Username and email duplicated', async () => {
    const res = await notLoggedAgent.post('/register')
      .send({ username: 'UserTestNew', password: '12345678910aA@', firstName: 'Test', surnames: 'Test', email: 'UserTestNew@gmail.com'});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(2);
  });

  it('400 Username duplicated', async () => {
    const res = await notLoggedAgent.post('/register')
      .send({ username: 'UserTestNew', password: '12345678910aA@', firstName: 'Test', surnames: 'Test', email: 'notExistEmail@gmail.com'});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
    expect(JSON.parse(res.text).errors[0]).toBe('Este nombre de usuario ya está en uso');
  });

  it('400 Email duplicated', async () => {
    const res = await notLoggedAgent.post('/register')
      .send({ username: 'notExistUser', password: '12345678910aA@', firstName: 'Test', surnames: 'Test', email: 'UserTestNew@gmail.com'});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
    expect(JSON.parse(res.text).errors[0]).toBe('Este email ya está en uso');
  });

  it('400 Null password', async () => { 
    const res = await notLoggedAgent.post('/register')
    .send({ username: 'userTest@', firstName: 'Test1', surnames: 'Test1', email: 'notExistingEmail@gmail.com'});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(2);
  });

  it('400 Null fields with valid password', async () => {
    const res = await notLoggedAgent.post('/register')
      .send({ password: '12345678910aA@' });
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(4);
  });

  it('400 Empty password', async () => { 
    const res = await notLoggedAgent.post('/register')
    .send({ username: 'userTest@', password: ' ', firstName: 'Test1', surnames: 'Test1', email: 'notExistingEmail@gmail.com'});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(2);
  });

  it('400 Empty fields with valid password', async () => {
    const res = await notLoggedAgent.post('/register')
      .send({ username: ' ', password: '12345678910aA@', firstName: ' ', surnames: ' ', email: ' '});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(4);
  });

  it('400 Large fields', async () => {
    const res = await notLoggedAgent.post('/register')
      .send({ username: 'userTestOver16use', password: '12345678910aA@', firstName: 'LargeNameLargeNameLargeNameLargeNameLargeNameLargeNameLargeNameLargeNameLargeNameLargeNameLargeNameLa', surnames: 'LargeSurnameLargeSurnameLargeSurnameLargeSurnameLargeSurnameLargeSurnameLargeSurnameLargeSurnameLarge', email: 'LargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLargeEmailL@LargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLar.LargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLar.LargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLar'});
      expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(4);
  });
  
  it('400 Invalid policy password', async () => {
    const res = await notLoggedAgent.post('/register')
      .send({ username: 'userTest@', password: '12345678910aAB', firstName: 'Test1', surnames: 'Test1', email: 'notExistingEmail@gmail.com'});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
    expect(JSON.parse(res.text).errors[0]).toBe('La contraseña debe tener al menos una letra minúscula, una letra mayúscula, un número y un carácter especial');
  });

  it('400 Invalid policy fields with valid password', async () => {
    const res = await notLoggedAgent.post('/register')
      .send({ username: 'userTest@', password: '12345678910aA@', firstName: 'Test1', surnames: 'Test1', email: 'notExistingEmail@gmail.com'});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(3);
  });
});

describe('/login POST', () => {
  it('200 Login', async () => {
    const res = await userAgent.post('/login')
      .send({ username: 'userTestEdit', password: '12345678910aA@' });
    expect(res.status).toBe(200);
  });

  it('401 ExistingSession', async () => {
    const res = await userAgent.post('/login')
      .send({ username: 'userTestEdit', password: '12345678910aA@' });
    expect(res.status).toBe(401);
  });

  it('404 UserNotExists', async () => {
    const res = await notLoggedAgent.post('/login')
      .send({ username: 'userNotExist', password: '12345678910aA@' });
    expect(res.status).toBe(404);
    expect(JSON.parse(res.text).error).toBe('No existe ninguna cuenta con este nombre de usuario');
  });

  it('404 Invalid credentials', async () => {
    const res = await notLoggedAgent.post('/login')
      .send({ username: 'userTestEdit', password: 'invalidPassword' });
    expect(res.status).toBe(404);
    expect(JSON.parse(res.text).error).toBe('Contraseña incorrecta');
  });
});

describe('/user GET', () => {
  it('200 getUser', async () => {
    const res2 = await userAgent.get('/user');
    expect(res2.status).toBe(200);
  });
});

describe('/logout GET', () => {
  it('200 logout', async () => {
    const res = await userAgent.post('/logout');
    expect(res.status).toBe(200);
  });

  it('401 logout', async () => {
    const res = await userAgent.post('/logout');
    expect(res.status).toBe(401);
    expect(JSON.parse(res.text).error).toBe('No existe ninguna sesión activa');
  });
});

describe('/user/edit POST', () => {
  it('200 Edit', async () => {
    await userAgent.post('/login')
    .send({ username: 'userTestEdit', password: '12345678910aA@'});
    const res = await userAgent.post('/user/edit')
      .send({user:{ username: 'userTestEdited', password: '12345678910aA@', firstName: 'Test edited', surnames: 'Test edited', email: 'userTestEdited@gmail.com'}});
    expect(res.status).toBe(200);
  });

  it('400 Username and email duplicated', async () => {
    const res = await userAgent.post('/user/edit')
      .send({user:{ username: 'UserTestNew', password: '12345678910aA@', firstName: 'Test', surnames: 'Test', email: 'UserTestNew@gmail.com'}});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(2);
  });

  it('400 Username duplicated', async () => {
    const res = await userAgent.post('/user/edit')
      .send({user:{ username: 'UserTestNew', password: '12345678910aA@', firstName: 'Test', surnames: 'Test', email: 'userTestEdit@gmail.com'}});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
    expect(JSON.parse(res.text).errors[0]).toBe('Este nombre de usuario ya está en uso');
  });

  it('400 Email duplicated', async () => {
    const res = await userAgent.post('/user/edit')
      .send({user:{ username: 'userTestEdit', password: '12345678910aA@', firstName: 'Test', surnames: 'Test', email: 'UserTestNew@gmail.com'}});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
    expect(JSON.parse(res.text).errors[0]).toBe('Este email ya está en uso');
  });

  it('400 Without object', async () => {
    const res = await userAgent.post('/user/edit');
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).error).toBe("No se ha proporcionado el objeto user");
  });

  it('400 Null fields with valid password', async () => {
    const res = await userAgent.post('/user/edit')
      .send({user: { password: '12345678910aA@' }});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(4);
  });

  it('400 Empty password', async () => {
    const res = await userAgent.post('/user/edit')
      .send({user:{ username: 'userTestEdit', password: ' ', firstName: 'Test', surnames: 'Test', email: 'userTestEdit@gmail.com'}});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(2);
  });

  it('400 Empty fields', async () => {
    const res = await userAgent.post('/user/edit')
      .send({user:{ username: '  ', password: '12345678910aA@', firstName: '  ', surnames: '  ', email: '  '}});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(4);
  });

  it('400 Large fields', async () => {
    const res = await userAgent.post('/user/edit')
      .send({user:{ username: 'userTestOver16use', password: '12345678910aA@', firstName: 'LargeNameLargeNameLargeNameLargeNameLargeNameLargeNameLargeNameLargeNameLargeNameLargeNameLargeNameLa', surnames: 'LargeSurnameLargeSurnameLargeSurnameLargeSurnameLargeSurnameLargeSurnameLargeSurnameLargeSurnameLarge', email: 'LargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLargeEmailL@LargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLar.LargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLar.LargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLargeEmailLar'}});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(4);
  });

  it('400 Invalid policy password', async () => {
    const res = await userAgent.post('/user/edit')
      .send({user:{ username: 'userTestEdit', password: '12345678910aAB', firstName: 'Test', surnames: 'Test', email: 'userTestEdit@gmail.com'}});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
    expect(JSON.parse(res.text).errors[0]).toBe('La contraseña debe tener al menos una letra minúscula, una letra mayúscula, un número y un carácter especial');
  });

  it('400 Invalid policy fields', async () => {
    const res = await userAgent.post('/user/edit')
      .send({user:{ username: 'userTest@', password: '12345678910aA@', firstName: 'Test1', surnames: 'Test1', email: 'userTestEdit@gmail.com'}});
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).errors).toBeArrayOfSize(3);
  });

  it('401 Not Logged', async () => {
    const res = await notLoggedAgent.post('/user/edit')
      .send({user:{ username: 'userTest@', password: '12345678910aA@', firstName: 'Test1', surnames: 'Test1', email: 'userTestEdit@gmail.com'}});
    expect(res.status).toBe(401);
    expect(JSON.parse(res.text).error).toBe('No estás autenticado');
  });
});

describe('/user/find POST', () => {
  it('200 foundByUsername', async () => {
    const res = await userAgent.post('/user/find')
      .send({ findTerm: 'UserTestNew'});
    expect(res.status).toBe(200);
  });

  it('200 foundByEmail', async () => {
    const res = await userAgent.post('/user/find')
      .send({ findTerm: 'UserTestNew@gmail.com'});
    expect(res.status).toBe(200);
  });

  it('404 usernameNotExists', async () => {
    const res = await userAgent.post('/user/find')
      .send({ findTerm: 'userNotExists'});
    expect(res.status).toBe(404);
  });

  it('404 emailNotExists', async () => {
    const res = await userAgent.post('/user/find')
      .send({ findTerm: 'emailNotExists'});
    expect(res.status).toBe(404);
  });
  it('404 NullField', async () => {
    const res = await userAgent.post('/user/find')
      .send({ });
    expect(res.status).toBe(400);
  });
});

describe('/user/data GET', () => {
  it('200 found', async () => {
    const user = await User.findOne({ username: 'UserTestNew' });
    const res = await userAgent.post('/user/data')
      .send({ userId: user?._id});
    expect(res.status).toBe(200);
  });
  it('400 NullField', async () => {
    const res = await userAgent.post('/user/data')
      .send({ });
    expect(res.status).toBe(400);
    expect(JSON.parse(res.text).error).toBe('No se ha especificado el campo userId');
  });
});

describe('/user DELETE', () => {
  it('200 Deleted', async () => {
    const res = await userAgent.delete('/user');
    expect(res.status).toBe(200);
  });
});