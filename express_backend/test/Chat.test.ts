import { describe, it, expect, beforeAll } from "bun:test";
import request from 'supertest';
import { app } from '../app.ts';
import Profile from "../src/schemas/profileSchema.ts";
import Workspace from "../src/schemas/workspaceSchema.ts";
import User from "../src/schemas/userSchema.ts";
import { WSPermission } from "../src/models/profile.ts";
import mongoose from "mongoose";
import type { IUser } from "../src/models/user.ts";
import type { IWorkspace } from "../src/models/workspace.ts";
import bcrypt from 'bcrypt';
import Item from "../src/schemas/itemSchema.ts";
import Chat from "../src/schemas/chatSchema.ts";

let workspace: IWorkspace | null;
let workspaceChat: any;
let privateChat: any;
let privateChat2: any;

type UserDocument = mongoose.Document<unknown, {}, IUser> & IUser & Required<{ _id: mongoose.Types.ObjectId }> | null;
let ownerUser: UserDocument, user1: UserDocument, user2: UserDocument;

let ownerAgent = request.agent(app);
let User1Agent = request.agent(app);
let User2Agent = request.agent(app);
let User3Agent = request.agent(app);

const createAgents = async () => {
    await ownerAgent.post('/login').send({ username: 'userTest', password: '12345678910aA@'});
    await User1Agent.post('/login').send({ username: 'adminUser', password: '12345678910aA@'});
    await User2Agent.post('/login').send({ username: 'writeUser', password: '12345678910aA@'});
    await User3Agent.post('/login').send({ username: 'readUser', password: '12345678910aA@'});
};

const populateUsersAndProfiles = async () => {
    user1 = await User.create({ username: 'adminUser', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'adminTest@gmail.com'});
    const user1Profile = await Profile.create({profileType: 'Individual', name: user1._id, users: [user1._id], wsPerm: WSPermission.Admin});

    user2 = await User.create({ username: 'writeUser', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'writeTest@gmail.com'});
    const user2Profile = await Profile.create({profileType: 'Individual', name: user2._id, users: [user2._id], wsPerm: WSPermission.Write});
    
    await User.create({ username: 'readUser', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'readTest@gmail.com'});
    workspace?.profiles.push(user1Profile._id, user2Profile._id);
    workspaceChat.users.push(user1._id, user2._id);
    privateChat = await Chat.create({name: 'Chat de prueba', type: 'Private', users: [ownerUser?._id, user1._id, user2._id]});
    privateChat2 = await Chat.create({name: 'Chat de prueba 2', type: 'Private', users: [user1._id, user2._id]});

    await workspaceChat?.save();
};

const initDb = async () => {
    await User.deleteMany({ });
    await Workspace.deleteMany({ });
    await Profile.deleteMany({ });
    await Item.deleteMany({ });
    ownerUser = await User.create({ username: 'userTest', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'userTest@gmail.com'});
    const userProfile = await Profile.create({profileType: 'Individual', name: ownerUser._id, users: [ownerUser._id], wsPerm: WSPermission.Owner});
    workspace = await Workspace.create({name: 'Workspace de '+ownerUser.username, creationDate: new Date(), items: [], profiles: [userProfile._id], default: true});
    workspaceChat = await Chat.create({name: workspace.name, type: 'Workspace', workspace: workspace._id, users: [ownerUser._id]});
};

beforeAll(async () => { 
    await initDb();
    await populateUsersAndProfiles();
    await workspace?.save();
    await createAgents();
});

describe('/chats GET', () => {
    it('200 OK', async () => {
        const res = await User1Agent.get('/chats')
        expect(res.status).toBe(200);
    });
});

describe('/chat/messages POST', () => {
    it('201', async () => {
        const res = await User1Agent.post('/chat/messages')
        .send({ chatId: workspaceChat._id });
        expect(res.status).toBe(200);
    });

    it('404 Chat Not Found', async () => {
        const res = await User1Agent.post('/chat/messages')
        .send({ chatId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('Chat no encontrado');
    });

    it('400 Null Fields', async () => {
        const res = await User1Agent.post('/chat/messages')
        .send({ });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se ha especificado el campo chatId');
    });
});

describe('/chat POST', () => {
    it('201', async () => {
        const res = await User1Agent.post('/chat')
        .send({name: 'Chat de prueba', users: [user1?._id.toString(), user2?._id.toString()]});
        expect(res.status).toBe(201);
    });

    it('400 Null Fields', async () => {
        const res = await User1Agent.post('/chat')
        .send({ });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) name, users');
    });
        
    it('400 Emtpy ChatName', async () => {
        const res = await User1Agent.post('/chat')
        .send({ name: ' ', users: [user1?._id.toString(), user2?._id.toString()]});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del chat no puede estar vacío');
    });

    it('400 Large ChatName', async () => {
        const res = await User1Agent.post('/chat')
        .send({ name: 'a'.repeat(61), users: [user1?._id.toString(), user2?._id.toString()]});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre no puede tener más de 60 caracteres');
    });

    it('400 Invalid Users Amount', async () => {
        const res = await User1Agent.post('/chat')
        .send({ name: 'a'.repeat(61), users: [user1?._id.toString()]});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('Debe haber al menos 2 usuarios');
    });

    it('400 A User Not Exists', async () => {
        const res = await User1Agent.post('/chat')
        .send({ name: 'Chat', users: [user1?._id.toString(), 'aaaaaaaaaaaaaaaaaaaaaaaa']});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('Al menos uno de los usuarios especificados no existe');
    });
});

describe('/chat PUT', () => {
    it('200 OK', async () => {
        const res = await User1Agent.put('/chat')
        .send({ chatId: privateChat._id, name: 'Nuevo nombre' });
        expect(res.status).toBe(200);
    });

    it('404 Chat Not Found', async () => {
        const res = await User1Agent.put('/chat')
        .send({ chatId: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Nuevo nombre' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('Chat no encontrado');
    });
    
    it('400 Null Fields', async () => {
        const res = await User1Agent.put('/chat')
        .send({ });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) name, chatId');
    });
    
    it('403 Not in chat', async () => {
        const res = await User3Agent.put('/chat')
        .send({ chatId: privateChat._id, name: 'Nuevo nombre' });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No puedes cambiar el nombre de un chat en el que no estás');
    });

    it('403 Workspace Chat', async () => {
        const res = await User1Agent.put('/chat')
        .send({ chatId: workspaceChat._id, name: 'Nuevo nombre' });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No puedes cambiar el nombre de un chat de workspace');
    });

    it('400 Empty Name', async () => {
        const res = await User1Agent.put('/chat')
        .send({ chatId: privateChat._id, name: '  ' });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del chat no puede estar vacío');
    });
    
    it('400 Large Name', async () => {
        const res = await User1Agent.put('/chat')
        .send({ chatId: privateChat._id, name: 'a'.repeat(61) });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre no puede tener más de 60 caracteres');
    });
});

describe('/chat/message POST', () => {
    it('201', async () => {
        const res = await User1Agent.post('/chat/message')
        .send({ chatId: privateChat._id, message: 'Mensaje de prueba' });
        expect(res.status).toBe(201);
    });
    
    it('404 Chat Not Found', async () => {
        const res = await User1Agent.post('/chat/message')
        .send({ chatId: 'aaaaaaaaaaaaaaaaaaaaaaaa', message: 'Mensaje de prueba' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('Chat no encontrado');
    });

    it('400 Null Fields', async () => {
        const res = await User1Agent.post('/chat/message')
        .send({ });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) chatId, message');
    });

    it('400 Empty Message', async () => {
        const res = await User1Agent.post('/chat/message')
        .send({ chatId: privateChat._id, message: '  ' });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('El mensaje no puede estar vacío');
    });

    it('403 Not in chat', async () => {
        const res = await User3Agent.post('/chat/message')
        .send({ chatId: privateChat._id, message: 'Mensaje de prueba' });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No puedes enviar mensajes a un chat en el que no estás');
    });
});

describe('/chat DELETE', () => {
    it('200 Leave', async () => {
        const res = await User1Agent.delete('/chat')
        .send({ chatId: privateChat2._id });
        expect(res.status).toBe(200);

        const chat = await Chat.findById(privateChat._id);
        expect(chat).toBeObject();
    });

    it('200 Leave and Delete', async () => {
        const res = await User2Agent.delete('/chat')
        .send({ chatId: privateChat2._id });
        expect(res.status).toBe(200);

        const chat = await Chat.findById(privateChat2._id);
        expect(chat).toBeNull();
    });

    it('403 Not in chat', async () => {
        const res = await User3Agent.delete('/chat')
        .send({ chatId: privateChat._id });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No puedes abandonar un chat en el que no estás');
    });

    it('403 Workspace Chat', async () => {
        const res = await User1Agent.delete('/chat')
        .send({ chatId: workspaceChat._id });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No puedes abandonar un chat de workspace');
    });

    it('404 Chat Not Found', async () => {
        const res = await User1Agent.delete('/chat')
        .send({ chatId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('Chat no encontrado');
    });

    it('400 Null Fields', async () => {
        const res = await User1Agent.delete('/chat')
        .send({ });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se ha especificado el campo chatId');
    });
});