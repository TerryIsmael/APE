import { describe, it, expect, beforeAll } from "bun:test";
import request from 'supertest';
import { app } from '../app.ts';
import Profile from "../src/schemas/profileSchema.ts";
import Workspace from "../src/schemas/workspaceSchema.ts";
import User from "../src/schemas/userSchema.ts";
import { WSPermission, type IProfile } from "../src/models/profile.ts";
import mongoose from "mongoose";
import type { IUser } from "../src/models/user.ts";
import type { IWorkspace } from "../src/models/workspace.ts";
import bcrypt from 'bcrypt';
import Item, { CalendarItem, FolderItem, NoteItem, NoticeItem, TimerItem } from "../src/schemas/itemSchema.ts";
import { ItemType, type IItem } from "../src/models/item.ts";
import { Permission } from "../src/models/profilePerms.ts";
import type { ICalendar, IFolder, INote, INotice, ITimer } from "../src/models/typeItem.ts";

let workspaceId: String | undefined;
let workspace: IWorkspace | null;

type UserDocument = mongoose.Document<unknown, {}, IUser> & IUser & Required<{ _id: mongoose.Types.ObjectId }> | null;
let adminUser: UserDocument, writeUser: UserDocument, readUser: UserDocument, notMemberUser: UserDocument

type profileDocument = mongoose.Document<unknown, {}, IProfile> & IProfile & Required<{ _id: mongoose.Types.ObjectId; }> | null;
let ownerProfile: profileDocument, adminProfile: profileDocument, writeProfile: profileDocument, readProfile: profileDocument, notMemberUserProfile: profileDocument;

let folder1: IItem | null, folderInsideF1: IItem | null, noteItem: IItem | null, noticeItem: IItem | null, timerItem: IItem | null, calendarItem: IItem | null;

let ownerAgent = request.agent(app);
let adminAgent = request.agent(app);
let writeAgent = request.agent(app);
let readAgent = request.agent(app);
let notMemberAgent = request.agent(app);

const trash: mongoose.Document<unknown, {}, any>[] = [];
const itemTrash: (mongoose.Document<unknown, {}, IItem> & IItem & Required<{ _id: mongoose.Types.ObjectId; }> | null)[] = [];

const createAgents = async () => {
    await ownerAgent.post('/login').send({ username: 'userTest', password: '12345678910aA@'});
    await adminAgent.post('/login').send({ username: 'adminUser', password: '12345678910aA@'});
    await writeAgent.post('/login').send({ username: 'writeUser', password: '12345678910aA@'});
    await readAgent.post('/login').send({ username: 'readUser', password: '12345678910aA@'});
    await notMemberAgent.post('/login').send({ username: 'notMemberUser', password: '12345678910aA@'});
};

const populateUsersAndProfiles = async () => {
    workspaceId = workspace?._id.toString();

    adminUser = await User.create({ username: 'adminUser', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'adminTest@gmail.com'});
    adminProfile = await Profile.create({profileType: 'Individual', name: adminUser._id, users: [adminUser._id], wsPerm: WSPermission.Admin});

    writeUser = await User.create({ username: 'writeUser', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'writeTest@gmail.com'});
    writeProfile = await Profile.create({profileType: 'Individual', name: writeUser._id, users: [writeUser._id], wsPerm: WSPermission.Write});
    
    readUser = await User.create({ username: 'readUser', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'readTest@gmail.com'});
    readProfile = await Profile.create({profileType: 'Individual', name: readUser._id, users: [readUser._id], wsPerm: WSPermission.Read});
    
    notMemberUser = await User.create({ username: 'notMemberUser', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'notMemberTest@gmail.com'});
    notMemberUserProfile = await Profile.create({profileType: 'Individual', name: notMemberUser._id, users: [notMemberUser._id], wsPerm: WSPermission.Write});

    workspace?.profiles.push(adminProfile._id, writeProfile._id, readProfile._id);
    trash.push(adminUser, adminProfile, writeUser, writeProfile, readUser, readProfile, notMemberUser, notMemberUserProfile);
};

const createItems = async () => {
    folder1 = await FolderItem.create({ name: 'FolderBase',  path: "",  itemType: ItemType.Folder, profilePerms: [ { profile: ownerProfile?._id, permission: Permission.Owner }, { profile: readProfile?._id, permission: Permission.Write } ]});
    folderInsideF1 = await FolderItem.create({ name: 'FolderInside',  path: "FolderBase",  itemType: ItemType.Folder, profilePerms: [ { profile: ownerProfile?._id, permission: Permission.Owner } ]});
    
    noteItem = await NoteItem.create({ name: 'NoteItem', text: 'Example Test Content', path: "", itemType: ItemType.Note, profilePerms: [ { profile: ownerProfile?._id, permission: Permission.Owner } ]});
    noticeItem = await NoticeItem.create({ name: 'NoticeItem', text: 'Example Notice Content', important: true, path: "/notices", itemType: ItemType.Notice, profilePerms: [ { profile: ownerProfile?._id, permission: Permission.Owner } ]});
    calendarItem = await CalendarItem.create({ name: 'CalendarItem', events: [], path: 'FolderBase', itemType: ItemType.Calendar, profilePerms: [ { profile: ownerProfile?._id, permission: Permission.Owner } , {profile: writeProfile?._id, permission: Permission.Write } ]});
    timerItem = await TimerItem.create({ name: 'TimerItem', path: "",  itemType: ItemType.Timer, duration: 120, remainingTime: 120, profilePerms: [ { profile: ownerProfile?._id, permission: Permission.Owner } ]});

    workspace?.items.push(folder1._id, folderInsideF1._id, noteItem._id, noticeItem._id, calendarItem._id, timerItem._id);
    readUser?.favorites.push(folder1._id);
    readUser?.save();
};

const initDb = async () => {
    await User.deleteMany({ });
    await Workspace.deleteMany({ });
    await Profile.deleteMany({ });
    await Item.deleteMany({ });
    const user = await User.create({ username: 'userTest', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'userTest@gmail.com'});
    ownerProfile = await Profile.create({profileType: 'Individual', name: user._id, users: [user._id], wsPerm: WSPermission.Owner});
    workspace = await Workspace.create({name: 'Workspace de '+user.username, creationDate: new Date(), items: [], profiles: [ownerProfile._id], default: true});
};

beforeAll(async () => { 
    await initDb();
    await populateUsersAndProfiles();
    await createItems();
    await workspace?.save();
    await createAgents();
});

describe('/item POST', () => {
    it('201 Owner & Folder', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: 'FolderOwnerTest', itemType: 'Folder'} });
        expect(res.status).toBe(201);
    });

    it('201 Admin & Timer', async () => {
        const res = await adminAgent.post('/item').send({ workspace: workspaceId, item: { name: 'AdminTimerTest', itemType: 'Timer', duration: 120 } });
        expect(res.status).toBe(201);
    });

    it('201 WriteUser & Calendar', async () => {
        const res = await writeAgent.post('/item').send({ workspace: workspaceId, item: { name: 'WriteCalendarTest', itemType: 'Calendar'} });
        expect(res.status).toBe(201);
    });

    it('201 ReadUser with perms in folder & Note', async () => {
        const res = await readAgent.post('/item').send({ workspace: workspaceId, item: { name: 'NoteTest', path: 'FolderBase', itemType: 'Note', text: 'Example Test Content' } });
        expect(res.status).toBe(201);
    });

    it('201 Notice', async () => {
        const res = await writeAgent.post('/item').send({ workspace: workspaceId, item: { name: 'NoticeTest', itemType: 'Notice', text: 'Example Notice Content', important: true } });
        expect(res.status).toBe(201);

        const wsWithItems = await Workspace.findById(workspaceId).populate('items');
        wsWithItems?.items.forEach((item) => {
            itemTrash.push(item as IItem);
        });
    });
    
    it('403 ReadUser', async () => {
        const res = await readAgent.post('/item').send({ workspace: workspaceId, item: { name: 'ReadTest', itemType: 'Folder'} });
        expect(res.status).toBe(403)
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para añadir items en este directorio');
    });

    it('403 ReadUser without perms', async () => {
        const res = await readAgent.post('/item').send({ workspace: workspaceId, item: { name: 'NotCreated', path: 'FolderBase/FolderInside', itemType: 'New Note', text: 'Example Test Content' } });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para añadir items en este directorio');
    });

    it('403 Write without perms and path different from home', async () => {
        const res = await writeAgent.post('/item').send({ workspace: workspaceId, item: { name: 'NotCreated', path: 'FolderBase', itemType: 'New Note', text: 'Example Test Content' } });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para añadir items en este directorio');
    });

    it('403 NotMemberUser', async () => {
        const res = await notMemberAgent.post('/item').send({ workspace: workspaceId, item: { name: 'NotMemberTest', itemType: 'Folder'} });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para añadir items en este directorio');
    });

    it('404 WorkspaceNotExists', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: 'aaaaaaaaaaaaaaaaaaaaaaaa', item: { name: 'NotCreated', itemType: 'Folder'} });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('404 FolderNotExists', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: 'NotCreated', path: 'folderNotExists', itemType: 'Folder'} });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado la carpeta');
    });

    it('409 Duplicated name in same path', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: 'FolderOwnerTest', itemType: 'Folder'} });
        expect(res.status).toBe(409);
        expect(JSON.parse(res.text).error).toBe('No puede haber 2 items con el mismo nombre en una ruta');
    });

    it('400 Null fields', async () => {
        const res = await ownerAgent.post('/item').send({  });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) workspace, item');
    });

    it('400 Invalid itemType', async () => { 
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: 'InvalidType', itemType: 'InvalidType'} });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('Tipo de item no válido');
    });

    it('400 Null Name', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { itemType: 'Folder'} });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del item es obligatorio');
    });

    it('400 Empty Name', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: ' ', itemType: 'Folder'} });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del item no puede estar vacío');
    });

    it('400 Long Name', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: 'a'.repeat(331), itemType: 'Folder'} });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del item no pueden tener más de 330 caracteres');
    });

    it('400 Null NoteText', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: 'NoteTitle', itemType: 'Note' } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El texto de la nota es obligatorio');
    });

    it('400 Empty NoteText', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: 'NoteTitle', itemType: 'Note', text: ' ' } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El texto de la nota no puede estar vacío');
    });

    it('400 Null NoticeText', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: 'NoticeTitle', itemType: 'Notice' } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El texto del anuncio es obligatorio');
    });

    it('400 Empty NoticeText', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: 'NoticeTitle', itemType: 'Notice', text: ' ' } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El texto del anuncio no puede estar vacío y no puede superar los 1000 caracteres');
    });

    it('400 Large NoticeText', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: 'NoticeTitle', itemType: 'Notice', text: 'a'.repeat(1001) } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El texto del anuncio no puede estar vacío y no puede superar los 1000 caracteres');
    });

    it('400 Null TimerDuration', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: 'TimerName', itemType: 'Timer' } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('La duración del temporizador es obligatoria');
    });

    it('400 Zero or lower TimerDuration', async () => {
        const res = await ownerAgent.post('/item').send({ workspace: workspaceId, item: { name: 'TimerName', itemType: 'Timer', duration: 0 } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('La duración del temporizador no puede ser 0 o inferior');
    });
});

describe('/item PUT', () => {
    it('200 Owner & Calendar', async () => {
        const itemToModify = calendarItem as ICalendar;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, events: itemToModify.events, name: 'EditedCalendar', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(200);

        const editedItem = await CalendarItem.findById(calendarItem?._id);
        expect(editedItem?.name).toBe('EditedCalendar');
    });

    it('200 Admin', async () => {
        const itemToModify = calendarItem as ICalendar;
        const res = await adminAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, events: itemToModify.events, name: 'CalendarItem', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(200);

        const editedItem = await CalendarItem.findById(calendarItem?._id);
        expect(editedItem?.name).toBe('CalendarItem');
    });

    it('200 Write or Read user with item perms', async () => {
        const itemToModify = calendarItem as ICalendar;
        const res = await writeAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, events: itemToModify.events, name: 'EditedCalendar', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(200);

        const editedItem = await CalendarItem.findById(calendarItem?._id);
        expect(editedItem?.name).toBe('EditedCalendar');
    });

    it('200 Note', async () => {
        const itemToModify = noteItem as INote;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, text: 'Edited Note Text', name: 'EditedNote', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(200);

        const editedItem = await NoteItem.findById(noteItem?._id);
        expect(editedItem?.name).toBe('EditedNote');
        expect(editedItem?.text).toBe('Edited Note Text');
    });

    it('200 Notice', async () => {
        const itemToModify = noticeItem as INotice;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, text: 'Edited Notice Text', important: false, name: 'EditedNotice', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(200);

        const editedItem = await NoticeItem.findById(noticeItem?._id);
        expect(editedItem?.name).toBe('EditedNotice');
        expect(editedItem?.text).toBe('Edited Notice Text');
        expect(editedItem?.important).toBe(false);
    });

    it('200 Timer', async () => {
        const itemToModify = timerItem as ITimer;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, duration: 180, remainingTime: 180, initialDate: itemToModify.initialDate, active: itemToModify.active, name: 'EditedTimer', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(200);

        const editedItem = await TimerItem.findById(timerItem?._id);
        expect(editedItem?.name).toBe('EditedTimer');
        expect(editedItem?.duration).toBe(180);
        expect(editedItem?.remainingTime).toBe(180);
    });

    it('200 Folder', async () => {
        const itemToModify = folder1 as IFolder;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, name: 'EditedFolder', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(200);

        const editedItem = await FolderItem.findById(folder1?._id);
        expect(editedItem?.name).toBe('EditedFolder');
        folder1 = itemToModify;

        const itemOfFolder = await CalendarItem.findById(calendarItem?._id);
        expect(itemOfFolder?.path).toBe('EditedFolder');
    });

    it('403 Write or Read user without item perms', async () => {
        const itemToModify = noteItem as INote;
        const res = await writeAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, text: itemToModify.text, name: 'EditedNote', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para editar este item');
    });

    it('403 NotMemberUser', async () => {
        const itemToModify = noteItem as INote;
        const res = await notMemberAgent.put('/item').send({ workspace: workspaceId, item: {  _id: itemToModify._id, text: itemToModify.text, name: 'EditedNote', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para editar este item');
    });

    it('404 WorkspaceNotExists', async () => {
        const itemToModify = noteItem as INote;
        const res = await ownerAgent.put('/item').send({ workspace: 'aaaaaaaaaaaaaaaaaaaaaaaa', item: {  _id: itemToModify._id, text: itemToModify.text, name: 'EditedNote', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('404 ItemNotExists', async () => {
        const itemToModify = noteItem as INote;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: {  _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', text: itemToModify.text, name: 'EditedNote', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el item');
    });

    it('400 Null fields', async () => {
        const res = await ownerAgent.put('/item').send({  });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) workspace, item');
    });

    it('400 Change itemType', async () => {
        const itemToModify = timerItem as ITimer;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, duration: itemToModify.duration, remainingTime: itemToModify.remainingTime, initialDate: itemToModify.initialDate, active: itemToModify.active, name: itemToModify.name, path: itemToModify.path, itemType: 'Note', profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se puede cambiar el tipo de item');
    });
    
    it('400 Invalid itemType', async () => {
        const itemToModify = timerItem as ITimer;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, duration: itemToModify.duration, remainingTime: itemToModify.remainingTime, initialDate: itemToModify.initialDate, active: itemToModify.active, name: itemToModify.name, path: itemToModify.path, itemType: 'InvalidType', profilePerms: itemToModify.profilePerms  } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se puede cambiar el tipo de item');
    });

    it('400 Null Name', async () => {
        const itemToModify = noteItem as INote;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, text: itemToModify.text, path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del item es obligatorio');
    });

    it('400 Empty Name', async () => {
        const itemToModify = noteItem as INote;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, text: itemToModify.text, name: ' ', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del item no puede estar vacío');
    });

    it('400 Long Name', async () => {
        const itemToModify = noteItem as INote;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: {_id: itemToModify._id, text: itemToModify.text, name: 'a'.repeat(331), path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del item no pueden tener más de 330 caracteres');
    });

    it('400 Null NoteText', async () => {
        const itemToModify = noteItem as INote;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, name: 'EditedItem', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El texto de la nota es obligatorio');
    });

    it('400 Empty NoteText', async () => {
        const itemToModify = noteItem as INote;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, text: ' ', name: itemToModify.name, path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El texto de la nota no puede estar vacío');
    });

    it('400 Null NoticeText', async () => {
        const itemToModify = noticeItem as INotice;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, oldName: 'NoticeItem', item: { _id: itemToModify._id, important: itemToModify.important, name: 'EditedItem', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El texto del anuncio es obligatorio');
    });

    it('400 Empty NoticeText', async () => {
        const itemToModify = noticeItem as INotice;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, oldName: 'NoticeItem', item: { _id: itemToModify._id, text: ' ', important: itemToModify.important, name: itemToModify.name, path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El texto del anuncio no puede estar vacío y no puede superar los 1000 caracteres');
    });

    it('400 Large NoticeText', async () => {
        const itemToModify = noticeItem as INotice;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, text: 'a'.repeat(1001), important: itemToModify.important, name: itemToModify.name, path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El texto del anuncio no puede estar vacío y no puede superar los 1000 caracteres');
    });

    it('400 Null TimerDuration', async () => {
        const itemToModify = timerItem as ITimer;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, remainingTime: itemToModify.remainingTime, initialDate: itemToModify.initialDate, active: itemToModify.active, name: 'EditedItem', path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('La duración del temporizador es obligatoria');
    });

    it('400 Zero or lower TimerDuration', async () => {
        const itemToModify = timerItem as ITimer;
        const res = await ownerAgent.put('/item').send({ workspace: workspaceId, item: { _id: itemToModify._id, duration: 0, remainingTime: itemToModify.remainingTime, initialDate: itemToModify.initialDate, active: itemToModify.active, name: itemToModify.name, path: itemToModify.path, itemType: itemToModify.itemType, profilePerms: itemToModify.profilePerms } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('La duración del temporizador no puede ser 0 o inferior');
    });
});

describe('/item/timer POST', () => {
    it('200 Start', async () => {
        const res = await ownerAgent.post('/item/timer').send({ workspace: workspaceId, timerId: timerItem?._id, action: 'init' });
        expect(res.status).toBe(200);
    });

    it('400 AlreadyStartedTimer', async () => {
        const res = await ownerAgent.post('/item/timer').send({ workspace: workspaceId, timerId: timerItem?._id, action: 'init' });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('El temporizador ya está iniciado');
    });
    
    it('200 Stop', async () => {
        const res = await ownerAgent.post('/item/timer').send({ workspace: workspaceId, timerId: timerItem?._id, action: 'stop' });
        expect(res.status).toBe(200);
    });

    it('400 AlreadyStoppedTimer', async () => {
        const res = await ownerAgent.post('/item/timer').send({ workspace: workspaceId, timerId: timerItem?._id, action: 'stop' });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('El temporizador no está iniciado');
    });
    
    it('200 Reset', async () => {
        const res = await ownerAgent.post('/item/timer').send({ workspace: workspaceId, timerId: timerItem?._id, action: 'reset' });
        expect(res.status).toBe(200);
    });

    it('200 Edit', async () => {
        const res = await ownerAgent.post('/item/timer').send({ workspace: workspaceId, timerId: timerItem?._id, action: 'edit', duration: 1 });
        expect(res.status).toBe(200);
    });

    it('403 ReadUser', async () => {
        const res = await readAgent.post('/item/timer').send({ workspace: workspaceId, timerId: timerItem?._id, action: 'init' });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No tienes permisos para modificar el temporizador');
    });

    it('400 InvalidAction', async () => {
        const res = await ownerAgent.post('/item/timer').send({ workspace: workspaceId, timerId: timerItem?._id, action: 'invalid' });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('Acción no válida');
    });

    it('404 TimerNotExists', async () => {
        const res = await ownerAgent.post('/item/timer').send({ workspace: workspaceId, timerId: 'aaaaaaaaaaaaaaaaaaaaaaaa', action: 'init' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('Temporizador no encontrado');
    });

    it('404 WorkspaceNotExists', async () => {
        const res = await ownerAgent.post('/item/timer').send({ workspace: 'aaaaaaaaaaaaaaaaaaaaaaaa', timerId: timerItem?._id, action: 'init' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('Workspace no encontrado');
    });

    it('400 Null fields', async () => {
        const res = await ownerAgent.post('/item/timer').send({  });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) workspace, timerId, action');
    });
    
    it('400 EditWithoutDuration', async () => {
        const res = await ownerAgent.post('/item/timer').send({ workspace: workspaceId, timerId: timerItem?._id, action: 'edit' });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('Duración no especificada');
    });

    it('403 ReadUser', async () => {
        const res = await readAgent.post('/item/timer').send({ workspace: workspaceId, timerId: timerItem?._id, action: 'init' });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No tienes permisos para modificar el temporizador');
    });
});

describe('/item/like PUT', () => {
    it('200 Owner', async () => {
        const res = await ownerAgent.put('/item/like').send({ workspace: workspaceId, itemId: noteItem?._id });
        expect(res.status).toBe(200);
    });

    it('200 Admin', async () => {
        const res = await adminAgent.put('/item/like').send({ workspace: workspaceId, itemId: noteItem?._id });
        expect(res.status).toBe(200);
    });

    it('200 WithoutPermUser', async () => {
        const res = await writeAgent.put('/item/like').send({ workspace: workspaceId, itemId: noteItem?._id });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para ver este item');
    });

    it('200 NotMemberUser', async () => {
        const res = await notMemberAgent.put('/item/like').send({ workspace: workspaceId, itemId: noteItem?._id });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para ver este item');
    });

    it('404 ItemNotExists', async () => {
        const res = await ownerAgent.put('/item/like').send({ workspace: workspaceId, itemId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el item');
    });

    it('404 WorkspaceNotExists', async () => {
        const res = await ownerAgent.put('/item/like').send({ workspace: 'aaaaaaaaaaaaaaaaaaaaaaaa', itemId: noteItem?._id });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('400 Null fields', async () => {
        const res = await ownerAgent.put('/item/like').send({  });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) workspace, itemId');
    });

    it('400 ItemNotInWs', async () => {
        const item = await FolderItem.create({ name: 'ItemNotInWs', path: '', itemType: ItemType.Folder });
        const res = await ownerAgent.put('/item/like').send({ workspace: workspaceId, itemId: item._id });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('El item no pertenece al workspace');
    });

});

describe('/item DELETE GENERAL', () => {
    it('200 Owner', async () => {
        const itemToDelete = itemTrash.pop();
        const res = await ownerAgent.delete('/item').send({ workspace: workspaceId, itemId: itemToDelete?._id });
        expect(res.status).toBe(200);
    });
    
    it('200 Admin', async () => {
        const itemToDelete = itemTrash.pop();
        const res = await adminAgent.delete('/item').send({ workspace: workspaceId, itemId: itemToDelete?._id });
        expect(res.status).toBe(200);
    });

    it('200 WriteUser', async () => {
        const itemToDelete = itemTrash.pop();
        if (writeProfile) {
            itemToDelete?.profilePerms.push({profile: writeProfile._id, permission: Permission.Write});
        }
        itemToDelete?.save();
        const res = await writeAgent.delete('/item').send({ workspace: workspaceId, itemId: itemToDelete?._id });
        expect(res.status).toBe(200);
    });
    
    it('403 ReadUser', async () => {
        const itemToDelete = itemTrash[1];
        if (readProfile) {
            itemToDelete?.profilePerms.push({profile: readProfile._id, permission: Permission.Read});
        }
        itemToDelete?.save();
        const res = await readAgent.delete('/item').send({ workspace: workspaceId, itemId: itemToDelete?._id });
        expect(res.status).toBe(403);
    });
    
    it('403 Without permission', async () => {
        const itemToDelete = itemTrash[0];
        const res = await readAgent.delete('/item').send({ workspace: workspaceId, itemId: itemToDelete?._id });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para borrar este item');
    
    });
    
    it('403 NotMemberUser', async () => {
        const itemToDelete = itemTrash[0];
        const res = await notMemberAgent.delete('/item').send({ workspace: workspaceId, itemId: itemToDelete?._id });
        expect(res.status).toBe(403);
    });

    it('404 ItemNotExists', async () => {
        const res = await ownerAgent.delete('/item').send({ workspace: workspaceId, itemId: '1234567890abcdef12345678' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el item');
    });

    it('404 WorkspaceNotExists', async () => {
        const itemToDelete = itemTrash[0];
        const res = await ownerAgent.delete('/item').send({ workspace: '1234567890abcdef12345678', itemId: itemToDelete?._id });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });
    
    it('400 Null fields', async () => {
        const res = await ownerAgent.delete('/item').send({  });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) workspace, itemId');
    }); 
});
    
describe('/item DELETE FOLDERS', async () => {
    const folder1 = await FolderItem.create({ name: 'FolderToCheck1',  path: "",  itemType: ItemType.Folder, profilePerms: [ { profile: ownerProfile?._id, permission: Permission.Owner }, { profile: writeProfile?._id, permission: Permission.Write }]});
    const folder2 = await FolderItem.create({ name: 'FolderToCheck2-1',  path: "FolderToCheck1",  itemType: ItemType.Folder, profilePerms: [ { profile: ownerProfile?._id, permission: Permission.Owner }, { profile: writeProfile?._id, permission: Permission.Write } ]});
    const folder3 = await FolderItem.create({ name: 'FolderToCheck2-2',  path: "FolderToCheck1",  itemType: ItemType.Folder, profilePerms: [ { profile: readProfile?._id, permission: Permission.Owner }]});
    itemTrash.push(folder1, folder2, folder3);
    workspace?.items.push(folder1._id, folder2._id, folder3._id);
    await workspace?.save();
    it('200 Owner', async () => {
        const res = await ownerAgent.delete('/item').send({ workspace: workspaceId, itemId: folder1?._id, check: true });
        expect(res.status).toBe(200);
    });

    it('200 Admin', async () => {
        const res = await adminAgent.delete('/item').send({ workspace: workspaceId, itemId: folder1?._id, check: true });
        expect(res.status).toBe(200);
    });

    it('403 CanSeeAllItemsInside', async () => {
        const res = await writeAgent.delete('/item').send({ workspace: workspaceId, itemId: folder1?._id, check: true });
        expect(res.status).toBe(409);
        expect(JSON.parse(res.text).error).toBe('Hay items de otros usuarios en este directorio');
    });

    it('200 Owner W/O Check', async () => {
        const res = await ownerAgent.delete('/item').send({ workspace: workspaceId, itemId: folder1?._id });
        expect(res.status).toBe(200);
    });
});

describe('/item/perms PUT', async () => {
    const itemToEdit = await FolderItem.create({ name: 'FolderToEdit', path: '', itemType: ItemType.Folder, profilePerms: [ { profile: writeProfile?._id, permission: Permission.Owner }, { profile: readProfile?._id, permission: Permission.Read }]}); 
    itemTrash.push(itemToEdit);
    
    it('200 OwnerOfWS', async () => {
        const res = await ownerAgent.put('/item/perms').send({ workspace: workspaceId, itemId: itemToEdit?._id, profileId: readProfile?._id, perm: Permission.Write });
        expect(res.status).toBe(200);
    });
    
    it('200 Admin', async () => {
        const res = await adminAgent.put('/item/perms').send({ workspace: workspaceId, itemId: itemToEdit?._id, profileId: readProfile?._id, perm: Permission.Read });
        expect(res.status).toBe(200);
    });

    it('200 OwnerOfFile', async () => {
        const res = await writeAgent.put('/item/perms').send({ workspace: workspaceId, itemId: itemToEdit?._id, profileId: readProfile?._id, perm: Permission.Write });
        expect(res.status).toBe(200);
    });

    it('403 WithWritePerms', async () => {
        const res = await readAgent.put('/item/perms').send({ workspace: workspaceId, itemId: itemToEdit?._id, profileId: readProfile?._id, perm: Permission.Read });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para cambiar los permisos de este item');
    });
    
    it('403 WithoutPerms', async () => {
        const res = await notMemberAgent.put('/item/perms').send({ workspace: workspaceId, itemId: itemToEdit?._id, profileId: readProfile?._id, perm: Permission.Read });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para cambiar los permisos de este item');
    });

    it('404 ItemNotExists', async () => {
        const res = await ownerAgent.put('/item/perms').send({ workspace: workspaceId, itemId: 'aaaaaaaaaaaaaaaaaaaaaaaa', profileId: readProfile?._id, perm: Permission.Read });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el item');
    });
    
    it('404 WorkspaceNotExists', async () => {
        const res = await ownerAgent.put('/item/perms').send({ workspace: 'aaaaaaaaaaaaaaaaaaaaaaaa', itemId: itemToEdit?._id, profileId: readProfile?._id, perm: Permission.Read });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('404 ProfileNotExists', async () => {
        const res = await ownerAgent.put('/item/perms').send({ workspace: workspaceId, itemId: itemToEdit?._id, profileId: 'aaaaaaaaaaaaaaaaaaaaaaaa', perm: Permission.Read });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('El perfil no existe en el workspace');
    });

    it('400 Null fields', async () => {
        const res = await ownerAgent.put('/item/perms').send({  });
        expect(res.status).toBe(400);
        expect(res.text).toBe('{"error":"No se han especificado el/los campo(s) workspace, itemId, profileId, perm"}');
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) workspace, itemId, profileId, perm');
    });

    it('400 InvalidPerm', async () => {
        const res = await ownerAgent.put('/item/perms').send({ workspace: workspaceId, itemId: itemToEdit?._id, profileId: readProfile?._id, perm: 'InvalidPerm' });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('El permiso del archivo debe ser Read, Write, o None para eliminar el permiso');
    });
});