import { describe, it, expect, beforeAll } from "bun:test";
import request from 'supertest';
import { app } from '../app.ts';
import Profile from "../src/schemas/profileSchema.ts";
import Workspace from "../src/schemas/workspaceSchema.ts";
import User from "../src/schemas/userSchema.ts";
import { getWSPermission } from "../src/utils/permsFunctions.ts";
import { WSPermission, type IProfile } from "../src/models/profile.ts";
import { Permission } from "../src/models/profilePerms.ts";
import mongoose from "mongoose";
import type { IUser } from "../src/models/user.ts";
import bcrypt from 'bcrypt';
import Invitation from "../src/schemas/invitationSchema.ts";
import type { IInvitation } from '../src/models/invitation';
import Item, { FolderItem, NoticeItem } from "../src/schemas/itemSchema.ts";
import { ItemType } from "../src/models/item.ts";
import type { IWorkspace } from "../src/models/workspace.ts";

let workspaceId: String | undefined;
let workspace: IWorkspace | null;
let allPermProfiles: mongoose.Types.ObjectId[];

type UserDocument = mongoose.Document<unknown, {}, IUser> & IUser & Required<{ _id: mongoose.Types.ObjectId }> | null;
let ownerUser: UserDocument, adminUser: UserDocument, writeReadUser: UserDocument, notMemberUser: UserDocument

type profileDocument = mongoose.Document<unknown, {}, IProfile> & IProfile & Required<{ _id: mongoose.Types.ObjectId; }> | null;
let ownerProfile: profileDocument, adminProfile: profileDocument, writeReadProfile: profileDocument, notMemberUserProfile: profileDocument, groupProfile: profileDocument, groupAdminProfile: profileDocument, groupProfileNotExists: profileDocument, groupProfileToDelete1: profileDocument, groupProfileToDelete2: profileDocument, adminProfileToDelete: profileDocument;

let invitation: IInvitation | null;
let invitationToDelete1: IInvitation | null;
let invitationToDelete2: IInvitation | null;

let ownerAgent = request.agent(app);
let adminAgent = request.agent(app);
let writeReadAgent = request.agent(app);
let notMemberAgent = request.agent(app);
let inviteAgent = request.agent(app);

let workspaceDelete: IWorkspace | null;

const createAgents = async () => {
    await ownerAgent.post('/login').send({ username: 'userTest', password: '12345678910aA@'});
    await adminAgent.post('/login').send({ username: 'adminUser', password: '12345678910aA@'});
    await writeReadAgent.post('/login').send({ username: 'writeReadUser', password: '12345678910aA@'});
    await notMemberAgent.post('/login').send({ username: 'notMemberUser', password: '12345678910aA@'});
    await inviteAgent.post('/login').send({ username: 'userInvite', password: '12345678910aA@'});
};

const populateUsersAndProfiles = async () => {
    workspaceId = workspace?._id.toString();

    adminUser = await User.create({ username: 'adminUser', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'adminTest@gmail.com'});
    adminProfile = await Profile.create({profileType: 'Individual', name: adminUser._id, users: [adminUser._id], wsPerm: WSPermission.Admin});

    writeReadUser = await User.create({ username: 'writeReadUser', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'writeReadTest@gmail.com'});
    writeReadProfile = await Profile.create({profileType: 'Individual', name: writeReadUser._id, users: [writeReadUser._id], wsPerm: WSPermission.Write});

    groupProfile = await Profile.create({profileType: 'Group', name: 'groupProfile', users: [], wsPerm: WSPermission.Read});
    groupAdminProfile = await Profile.create({profileType: 'Group', name: 'groupAdminProfile', users: [], wsPerm: WSPermission.Admin});
    groupProfileNotExists = await Profile.create({profileType: 'Group', name: 'notInWs', users: [], wsPerm: WSPermission.Read});
    
    notMemberUser = await User.create({ username: 'notMemberUser', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'notMemberTest@gmail.com'});
    notMemberUserProfile = await Profile.create({profileType: 'Individual', name: notMemberUser._id, users: [notMemberUser._id], wsPerm: WSPermission.Write});
    await User.create({ username: 'userInvite', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'inviteTest@gmail.com'});

    groupProfileToDelete1 = await Profile.create({profileType: 'Group', name: 'groupProfileToDelete', users: [], wsPerm: WSPermission.Read});
    groupProfileToDelete2 = await Profile.create({profileType: 'Group', name: 'groupProfileTDelete', users: [], wsPerm: WSPermission.Read});

    const adminToDelete = await User.create({ username: 'adminToDelete', password : bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'adminToDelete@gmail.com'});
    adminProfileToDelete = await Profile.create({profileType: 'Individual', name: adminToDelete._id, users: [adminToDelete._id], wsPerm: WSPermission.Admin});
    
    workspace?.profiles.push(adminProfile._id, writeReadProfile._id, groupProfile._id, groupAdminProfile._id, groupProfileToDelete1._id, groupProfileToDelete2._id, adminProfileToDelete._id);
    allPermProfiles = workspace?.profiles as mongoose.Types.ObjectId[];
};

const createInvitations = async () => {
    invitation = await Invitation.create({ workspace: workspace?._id , code: 'aaaaaaaaaa', profile: groupProfile?._id, active: true });
    invitationToDelete1 = await Invitation.create({ workspace: workspace?._id , code: 'aaaaaaaaab', profile: groupProfile?._id, active: true });
    invitationToDelete2 = await Invitation.create({ workspace: workspace?._id , code: 'aaaaaaaaac', profile: groupProfile?._id, active: true });
};

const createItems = async () => {
    const notice1 = await NoticeItem.create({ name: 'NoticeTest1', path: "/notices",  itemType: ItemType.Notice, profilePerms: [{profile:ownerProfile?._id, permission: Permission.Owner}], text: 'NoticeTestContent', important: false });
    const notice2 = await NoticeItem.create({ name: 'NoticeTest2', path: "/notices",  itemType: ItemType.Notice, profilePerms: [{profile:ownerProfile?._id, permission: Permission.Owner}, {profile:writeReadProfile?._id, permission: Permission.Owner}], text: 'NoticeTestContent2', important: false });
    const folder1 = await FolderItem.create({ name: 'FolderTest1',  path: "",  itemType: ItemType.Folder, profilePerms: [{profile:ownerProfile?._id, permission: Permission.Owner} ]});
    const folder2 = await FolderItem.create({ name: 'FolderTest2',  path: "",  itemType: ItemType.Folder, profilePerms: [{profile:ownerProfile?._id, permission: Permission.Owner}, {profile:writeReadProfile?._id, permission: Permission.Owner} ]});
    workspace?.items.push(notice1._id, notice2._id, folder1._id, folder2._id);
    [ownerUser, adminUser, writeReadUser, notMemberUser].forEach((user) => {
        user?.favorites.push(notice1._id, notice2._id, folder1._id, folder2._id);
        user?.save();
    });
};

const createWorkspaceToDelete = async () => {
    const ownerProfileWsDelete = await Profile.create({profileType: 'Individual', name: ownerUser?._id, users: [ownerUser?._id], wsPerm: WSPermission.Owner});
    const adminWsDelete = await Profile.create({profileType: 'Individual', name: ownerUser?._id, users: [adminUser?._id], wsPerm: WSPermission.Admin});
    const writeReadWsDelete = await Profile.create({profileType: 'Individual', name: ownerUser?._id, users: [writeReadUser?._id], wsPerm: WSPermission.Write});
    workspaceDelete = await Workspace.create({name: 'Workspace de '+ ownerUser?.username, creationDate: new Date(), items: [], profiles: [], default: true});
    
    workspaceDelete?.profiles.push(ownerProfileWsDelete._id, adminWsDelete._id, writeReadWsDelete._id);
    await workspaceDelete?.save();
};

const initDb = async () => {
    await User.deleteMany({ });
    await Workspace.deleteMany({ });
    await Profile.deleteMany({ });
    await Item.deleteMany({ });
    await Invitation.deleteMany({ });

    ownerUser = await User.create({ username: 'userTest', password: bcrypt.hashSync('12345678910aA@', 10), firstName: 'Test', surnames: 'Test', email: 'userTest@gmail.com'});
    ownerProfile = await Profile.create({profileType: 'Individual', name: ownerUser._id, users: [ownerUser._id], wsPerm: WSPermission.Owner});
    workspace = await Workspace.create({name: 'Workspace de ' + ownerUser.username, creationDate: new Date(), items: [], profiles: [ownerProfile._id], default: true});
};

beforeAll(async () => { 
    await initDb();
    await populateUsersAndProfiles();
    await createItems();
    await workspace?.save();
    await createInvitations();
    await createAgents();
    await createWorkspaceToDelete();
});

describe('/workspace POST', () => {
    it('201', async () => {
        const res = await ownerAgent.post('/workspace')
        .send({ wsName: 'workspaceCreateTest' });
        expect(res.status).toBe(201);
    });

    it('400 Null name', async () => {
        const res = await ownerAgent.post('/workspace')
        .send({});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se ha especificado el campo wsName');
    });

    it('400 Empty name', async () => {
        const res = await ownerAgent.post('/workspace')
        .send({ wsName: ' ' });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del workspace debe tener entre 1 y 55 caracteres');
    });

    it('400 Long name', async () => {
        const res = await ownerAgent.post('/workspace')
        .send({ wsName: 'VeryLargeWorkspaceNameVerLargeWorkspaceNameVeryLargeWork' });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del workspace debe tener entre 1 y 55 caracteres');
    });
});

describe('/workspace GET', () => {
    it('200 Default workspace', async () => {
        const res = await ownerAgent.get('/workspace');
        expect(res.status).toBe(200);
        const resObject = JSON.parse(res.text);
        expect(resObject.name).toBe("Workspace de userTest");
        const isOwner = await getWSPermission(ownerUser?._id, resObject._id.toString());
        expect(isOwner).toBe(WSPermission.Owner);
    });
    
    it('200 With id', async () => {
        const res = await ownerAgent.get('/workspace/' + workspaceId);
        expect(res.status).toBe(200);
        const resObject = JSON.parse(res.text);
        expect(resObject.name).toBe("Workspace de userTest");
        const isOwner = await getWSPermission(ownerUser?._id, resObject._id.toString());
        expect(isOwner).toBe(WSPermission.Owner);
    });

    it('404 NotExists', async () => {
        const notExistingId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
        const res = await ownerAgent.get('/workspace/' + notExistingId);
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('403 NotMemberUser', async () => {
        const res = await notMemberAgent.get('/workspace/' + workspaceId);
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para ver ese workspace');
    });
});

describe('/workspace/edit POST', async () => {
    const workspace = await Workspace.findOne({ _id: workspaceId });
    it('201 Owner', async () => {
        const res = await ownerAgent.post('/workspace/edit')
        .send({ workspace: { _id: workspaceId, name: 'EditedWorkspaceName', default: true, profiles: workspace?.profiles, items: workspace?.items, creationDate: workspace?.creationDate  } });
        expect(res.status).toBe(201);
        const workspaceEdited = await Workspace.findOne({ _id: workspaceId });
        expect(workspaceEdited?.name).toBe('EditedWorkspaceName');
    });

    it('201 Admin', async () => {
        const res = await adminAgent.post('/workspace/edit')
        .send({ workspace: { _id: workspaceId, name: 'Workspace de userTest', default: true, profiles: workspace?.profiles, items: workspace?.items, creationDate: workspace?.creationDate  } });
        expect(res.status).toBe(201);
        const workspaceEdited = await Workspace.findOne({ _id: workspaceId });
        expect(workspaceEdited?.name).toBe('Workspace de userTest');
    });

    it('400 Null name', async () => {
        const res = await ownerAgent.post('/workspace/edit')
        .send({ workspace: { _id: workspaceId, default: true, profiles: workspace?.profiles, items: workspace?.items, creationDate: workspace?.creationDate  } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del workspace es obligatorio');
    });
    
    it('400 Empty name', async () => {
        const res = await ownerAgent.post('/workspace/edit')
        .send({ workspace: { _id: workspaceId, default: true, name: ' ', profiles: workspace?.profiles, items: workspace?.items, creationDate: workspace?.creationDate  } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del workspace debe tener entre 1 y 55 caracteres');
    });

    it('400 Large name', async () => {
        const res = await ownerAgent.post('/workspace/edit')
        .send({ workspace: { _id: workspaceId, default: true, name: 'VeryLargeWorkspaceNameVerLargeWorkspaceNameVeryLargeWork', profiles: workspace?.profiles, items: workspace?.items, creationDate: workspace?.creationDate  } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre del workspace debe tener entre 1 y 55 caracteres');
    });

    it('404 Not found', async () => {
        const res = await ownerAgent.post('/workspace/edit')
        .send({ workspace: { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', default: true, name: workspace?.name, profiles: workspace?.profiles, items: workspace?.items, creationDate: workspace?.creationDate  } });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('403 NotMemberUser', async () => {
        const res = await notMemberAgent.post('/workspace/edit')
        .send({ workspace: { _id: workspaceId, default: true, name: 'EditingAttempt', profiles: workspace?.profiles, items: workspace?.items, creationDate: workspace?.creationDate  } });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a editar el workspace');
    });

    it('403 WriteReadUser', async () => {
        const res = await writeReadAgent.post('/workspace/edit')
        .send({ workspace: { _id: workspaceId, default: true, name: 'EditingAttempt', profiles: workspace?.profiles, items: workspace?.items, creationDate: workspace?.creationDate  } });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a editar el workspace');
    });
});

describe('/invite PUT', () => {
    it('201 Owner', async () => {
        const res = await ownerAgent.put('/invite')
        .send({ workspace: workspaceId, username: 'userInvite', perm: Permission.Read });
        expect(res.status).toBe(201);

        Workspace.findOne({ _id: workspaceId }).then((workspace) => {
            if (workspace) {
                workspace.profiles = allPermProfiles;
                workspace.save();
            }
        });
    });

    it('201 Admin', async () => {
        const res = await adminAgent.put('/invite')
        .send({ workspace: workspaceId, username: 'userInvite', perm: Permission.Read });
        expect(res.status).toBe(201);
    });
    
    it('400 Null username', async () => {
        const res = await ownerAgent.put('/invite')
        .send({ workspace: workspaceId, perm: Permission.Read });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) username');
    });

    it('400 Null permission', async () => {
        const res = await ownerAgent.put('/invite')
        .send({ workspace: workspaceId, username: 'userInvite' });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) perm');
    });

    it('404 UserNotExists', async () => {
        const res = await ownerAgent.put('/invite')
        .send({ workspace: workspaceId, username: 'notExistingUser', perm: WSPermission.Read });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el usuario');
    });

    it('404 WsNotExists', async () => {
        const res = await ownerAgent.put('/invite')
        .send({ workspace: "aaaaaaaaaaaaaaaaaaaaaaaa", username: 'userInvite', perm: WSPermission.Read });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('409 AlreadyInWorkspace', async () => {
        const res = await ownerAgent.put('/invite')
        .send({ workspace: workspaceId, username: 'userInvite', perm: WSPermission.Read });
        expect(res.status).toBe(409);
        expect(JSON.parse(res.text).error).toBe('El usuario ya está en el workspace');
    });

    it('403 NotMemberUser', async () => {
        const res = await notMemberAgent.put('/invite')
        .send({ workspace: workspaceId, username: 'userInvite', perm: WSPermission.Read });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para añadir usuarios a este workspace');
    });

    it('403 WriteReadUser', async () => {
        const res = await writeReadAgent.put('/invite')
        .send({ workspace: workspaceId, username: 'userInvite', perm: WSPermission.Read });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para añadir usuarios a este workspace');
    });

    it('403 Add owner', async () => {
        const res = await ownerAgent.put('/invite')
        .send({ workspace: workspaceId, username: 'userInvite', perm: WSPermission.Owner });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No puedes añadir un propietario');
    });

    it('403 Add admin another admin', async () => {
        const res = await adminAgent.put('/invite')
        .send({ workspace: workspaceId, username: 'userInvite', perm: WSPermission.Admin });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a añadir a otros administradores');
    });
});

describe('/invitation POST', () => {
    it('201 Owner', async () => {
        const res = await ownerAgent.post('/invitation')
        .send({ workspace: workspaceId, profile: groupProfile?._id.toString(), linkDuration: 'day' });
        expect(res.status).toBe(201);
    });

    it('201 Admin', async () => {
        const res = await adminAgent.post('/invitation')
        .send({ workspace: workspaceId, profile: groupProfile?._id.toString(), linkDuration: 'day' });
        expect(res.status).toBe(201);
    });

    it('403 Create admin with another admin profile', async () => {
        const res = await adminAgent.post('/invitation')
        .send({ workspace: workspaceId, profile: groupAdminProfile?._id.toString(), linkDuration: 'day' });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a añadir a otros administradores');
    });

    it('403 WriteReadUser', async () => {
        const res = await writeReadAgent.post('/invitation')
        .send({ workspace: workspaceId, profile: groupProfile?._id.toString(), linkDuration: 'day' });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para crear invitaciones en este workspace');
    });
    
    it('403 NotMemberUser', async () => {
        const res = await notMemberAgent.post('/invitation')
        .send({ workspace: workspaceId, profile: groupProfile?._id.toString(), linkDuration: 'day' });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para crear invitaciones en este workspace');
    });

    it('404 Workspace not exists', async () => {
        const res = await ownerAgent.post('/invitation')
        .send({ workspace: 'aaaaaaaaaaaaaaaaaaaaaaaa', profile: groupProfile?._id.toString(), linkDuration: 'day' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('404 Profile not exists in ws', async () => {
        const res = await ownerAgent.post('/invitation')
        .send({ workspace: workspaceId, profile: groupProfileNotExists?._id.toString(), linkDuration: 'day' });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('Este perfil no existe en el workspace seleccionado');
    });

    it('404 Profile not exists', async () => {
        const res = await ownerAgent.post('/invitation')
        .send({ workspace: workspaceId, profile: 'aaaaaaaaaaaaaaaaaaaaaaaa', linkDuration: 'day' });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('Este perfil no existe');
    });

    it('400 Null fields', async () => {
        const res = await ownerAgent.post('/invitation')
        .send({});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) workspace, linkDuration');
    });
});

describe('/invitation PUT', () => {
    it('201 Owner', async () => {
        const res = await ownerAgent.put('/invitation')
        .send({ 'invId': invitation?._id });
        expect(res.status).toBe(200);
        
        const editedInv = await Invitation.findOne({ _id: invitation?._id });
        expect(editedInv?.active).toBe(false);
    });

    it('201 Admin', async () => {
        const res = await adminAgent.put('/invitation')
        .send({ 'invId': invitation?._id });
        expect(res.status).toBe(200);
        
        const editedInv = await Invitation.findOne({ _id: invitation?._id });
        expect(editedInv?.active).toBe(true);
    });
    
    it('400 Null fields', async () => {
        const res = await ownerAgent.put('/invitation')
        .send({});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se ha especificado el campo invId');
    });

    it('403 WriteReadUser', async () => {
        const res = await writeReadAgent.put('/invitation')
        .send({ 'invId': invitation?._id });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para desactivar invitaciones en este workspace');
    });

    it('403 notMemberUser', async () => {
        const res = await notMemberAgent.put('/invitation')
        .send({ 'invId': invitation?._id });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para desactivar invitaciones en este workspace');
    });

    it('404 notFound', async () => {
        const res = await ownerAgent.put('/invitation')
        .send({ 'invId': 'aaaaaaaaaaaaaaaaaaaaaaaa'});
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado la invitación');
    });
});

describe('/invitation/:workspace GET', () => {
    it('200 Owner', async () => {
        const res = await ownerAgent.get('/invitation/' + workspaceId);
        expect(res.status).toBe(200);
    });

    it('200 Admin', async () => {
        const res = await adminAgent.get('/invitation/' + workspaceId);
        expect(res.status).toBe(200);
    });

    it('403 WriteReadUser', async () => {
        const res = await writeReadAgent.get('/invitation/' + workspaceId);
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para ver las invitaciones de este workspace');
    });
    
    it('403 NotMemberUser', async () => {
        const res = await notMemberAgent.get('/invitation/' + workspaceId);
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para ver las invitaciones de este workspace');
    });

    it('404 Workspace not exists', async () => {
        const res = await ownerAgent.get('/invitation/aaaaaaaaaaaaaaaaaaaaaaaa');
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });
});

describe('/invite/:code GET', async () => {
    it('200 Owner', async () => {
        const res = await ownerAgent.get('/invite/' + invitationToDelete1?.code);
        expect(res.status).toBe(200);
    });

    it('403 NotMemberUser', async () => {
        Workspace.findOne({ _id: workspaceId }).then((workspace) => {
            if (workspace) {
                workspace.profiles = allPermProfiles;
                workspace.save();
            }
        });

        const res = await inviteAgent.get('/invite/' + invitationToDelete1?.code);
        expect(res.status).toBe(200);
    });

    it('404 NotExists', async () => {
        const res = await ownerAgent.get('/invite/aaaaaaaaaaaaaaaaaaaaaaaa');
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado la invitación');
    });

    it('400 Deactivated', async () => {
        invitationToDelete1?invitationToDelete1.active = false:null;
        await invitationToDelete1?.save();
        const res = await ownerAgent.get('/invite/'+ invitationToDelete1?.code);
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('La invitación ha sido desactivada');
    });
});

describe('/invite/:code POST', async () => {
    it('403 Deactivated', async () => {
        const res = await inviteAgent.post('/invite/' + invitationToDelete1?.code);        
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('La invitación ha sido desactivada');
    });

    it('200 NotMemberUser', async () => {
        const res = await inviteAgent.post('/invite/' + invitationToDelete2?.code);
        expect(res.status).toBe(200);
    });

    it('404 NotExists', async () => {
        const res = await ownerAgent.post('/invite/aaaaaaaaaaaaaaaaaaaaaaaa');
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado la invitación');
    });

    it('409 Already in workspace', async () => {
        const res = await ownerAgent.post('/invite/' + invitationToDelete2?.code);
        expect(res.status).toBe(409);
        expect(JSON.parse(res.text).error).toBe('Ya estás en el workspace');
    });

    it('400 Deactivated', async () => {
        invitationToDelete1?invitationToDelete1.active = false:null;
        await invitationToDelete1?.save();
        const res = await ownerAgent.post('/invite/'+ invitationToDelete1?.code);
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('La invitación ha sido desactivada');
    });
});

describe('/invitation DELETE', async () => {
    it('200 Owner', async () => {
        const res = await ownerAgent.delete('/invitation')
        .send({ invId: invitationToDelete1?._id.toString() });
        expect(res.status).toBe(200);
    });

    it('200 Admin', async () => {
        const res = await adminAgent.delete('/invitation')
        .send({ invId: invitationToDelete2?._id.toString() });
        expect(res.status).toBe(200);
    });

    it('403 WriteReadUser', async () => {
        const res = await writeReadAgent.delete('/invitation')
        .send({ invId: invitation?._id.toString() });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para borrar invitaciones en este workspace');
    });

    it('403 NotMemberUser', async () => {
        const res = await notMemberAgent.delete('/invitation')
        .send({ invId: invitation?._id.toString() });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para borrar invitaciones en este workspace');
    });

    it('404 Not Exists', async () => {
        const res = await ownerAgent.delete('/invitation')
        .send({ invId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado la invitación');
    });

    it('400 Null fields', async () => {
        const res = await ownerAgent.delete('/invitation')
        .send({});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se ha especificado el campo invId');
    });
});

describe('/profile POST creating', () => {
    it('201 Owner', async () => {
        const res = await ownerAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: 'ProfileCreatedOwner', profileType: 'Group', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(201);
    });

    it('201 Admin', async () => {
        const res = await adminAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: 'ProfileCreatedAdmin', profileType: 'Group', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(201);
    });

    it('403 notMemberUser', async () => {
        const res = await notMemberAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: 'ProfileAttempt', profileType: 'Group', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a crear o editar perfiles');
    });

    it('403 writeReadUser', async () => { 
        const res = await writeReadAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: 'ProfileAttempt', profileType: 'Group', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a crear o editar perfiles');
    });

    it('403 createOwner', async () => { 
        const res = await ownerAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: 'ProfileAttempt', profileType: 'Group', users: [], wsPerm: 'Owner' } });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No puedes añadir un propietario');
    });

    it('403 Admin creates admin', async () => { 
        const res = await adminAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: 'ProfileAttempt', profileType: 'Group', users: [], wsPerm: 'Admin' } });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a añadir a otros administradores');
    });

    it('403 Create individual profile', async () => { 
        const res = await ownerAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: 'ProfileAttempt', profileType: 'Individual', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No puedes crear perfiles individuales');
    });

    it('404 NotExistsWorkspace', async () => { 
        const res = await ownerAgent.post('/profile')
        .send({ wsId: 'aaaaaaaaaaaaaaaaaaaaaaaa', profile: { name: 'ProfileAttempt', profileType: 'Group', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('404 Some users do not exist', async () => { 
        const res = await ownerAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: 'ProfileAttempt', profileType: 'Group', users: [ adminUser?._id, mongoose.Types.ObjectId.createFromHexString('aaaaaaaaaaaaaaaaaaaaaaaa')], wsPerm: 'Read' } });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('Hay usuarios que no existen en el workspace');
    });

    it('409 Same name profile', async () => { 
        const res = await ownerAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: 'groupProfile' , profileType: 'Individual', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(409);
        expect(JSON.parse(res.text).error).toBe('El perfil ya está en el workspace');
    });

    it('400 Null fields', async () => { 
        const res = await ownerAgent.post('/profile')
        .send({});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) wsId, profile');
    });

    it('400 Empty name', async () => { 
        const res = await ownerAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: '   ', profileType: 'Group', users: [], wsPerm: 'Read' } });        
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre identificador no puede estar vacío');
    });

    it('400 Invalid perm', async () => { 
        const res = await ownerAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: 'ProfileAttempt', profileType: 'Group', users: [], wsPerm: 'ReadWrite' } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El permiso debe ser Read, Write o Admin');
    });

    it('400 Invalid profileType', async () => { 
        const res = await ownerAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: 'ProfileAttempt', profileType: 'Workspace', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El tipo del perfil debe ser Group o Individual');    
    });

    it('400 Large name', async () => { 
        const res = await ownerAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { name: 'VeryLargeProfileVeryLargeProfileVeryLargeProfileVeryLargeProf' , profileType: 'Group', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre identificador no puede tener más de 60 caracteres');
    });
});

describe('/profile POST editing', () => {
    it('201 Owner', async () => {
        const res = await ownerAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { _id: groupProfile?._id, name: 'groupProfileEdited', profileType: 'Group', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(201);

        const editedProfile = await Profile.findOne({ _id: groupProfile?._id });
        expect(editedProfile?.name).toBe('groupProfileEdited');
    });

    it('201 Admin', async () => {
        const res = await adminAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { _id: groupProfile?._id, name: 'groupProfile', profileType: 'Group', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(201);

        const editedProfile = await Profile.findOne({ _id: groupProfile?._id });
        expect(editedProfile?.name).toBe('groupProfile');
    });

    it('404 NotExistsProfile', async () => {
        const res = await ownerAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { _id: "aaaaaaaaaaaaaaaaaaaaaaaa" , name: 'notInWs', profileType: 'Group', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el perfil');
    });

    it('400 Large name', async () => { 
        const res = await ownerAgent.post('/profile')
        .send({ wsId: workspaceId, profile: { _id: groupProfile?._id, name: 'VeryLargeProfileVeryLargeProfileVeryLargeProfileVeryLargeProf' , profileType: 'Group', users: [], wsPerm: 'Read' } });
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).errors).toBeArrayOfSize(1);
        expect(JSON.parse(res.text).errors[0]).toBe('El nombre identificador no puede tener más de 60 caracteres');
    });
});

describe('/perms PUT', () => {
    it('201 Owner', async () => {
        const res = await ownerAgent.put('/perms')
        .send({ wsId: workspaceId, profileId: groupProfile?._id.toString(), perm: 'Write' });
        expect(res.status).toBe(201);

        const editedProfile = await Profile.findOne({ _id: groupProfile?._id });
        expect(editedProfile?.wsPerm).toBe(WSPermission.Write);
    });

    it('201 Admin', async () => {
        const res = await adminAgent.put('/perms')
        .send({ wsId: workspaceId, profileId: groupProfile?._id.toString(), perm: 'Read' });        
        expect(res.status).toBe(201);

        const editedProfile = await Profile.findOne({ _id: groupProfile?._id });
        expect(editedProfile?.wsPerm).toBe(WSPermission.Read);
    });

    it('403 WriteReadUser', async () => {
        const res = await writeReadAgent.put('/perms')
        .send({ wsId: workspaceId, profileId: groupProfile?._id.toString(), perm: 'Write' });        
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a cambiar los permisos de este workspace');
    });

    it('403 NotMemberUser', async () => {
        const res = await notMemberAgent.put('/perms')
        .send({ wsId: workspaceId, profileId: groupProfile?._id.toString(), perm: 'Write' });        
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a cambiar los permisos de este workspace');
    });

    it('403 Change owner', async () => {
        const res = await ownerAgent.put('/perms')
        .send({ wsId: workspaceId, profileId: ownerProfile?._id.toString(), perm: 'Read' });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No puedes cambiar los permisos del propietario');
    });

    it('403 Change to owner', async () => {
        const res = await ownerAgent.put('/perms')
        .send({ wsId: workspaceId, profileId: groupProfile?._id.toString(), perm: 'Owner' });        
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No puedes añadir un propietario');
    });

    it('403 Admin changes admin', async () => {
        await Profile.findOne({ _id: groupProfile?._id }).then((profile) => {
            if (profile) {
                profile.wsPerm = WSPermission.Admin;
                profile.save();
            }
        });

        const res = await adminAgent.put('/perms')
        .send({ wsId: workspaceId, profileId: groupProfile?._id.toString(), perm: 'Write' });        
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a cambiar los permisos de otros administradores');

        await Profile.findOne({ _id: groupProfile?._id }).then((profile) => {
            if (profile) {
                profile.wsPerm = WSPermission.Read;
                profile.save();
            }
        });
    });

    it('403 Null fields', async () => {
        const res = await ownerAgent.put('/perms')
        .send({});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) wsId, profileId, perm');
    });

    it('404 NotExistsProfile', async () => {
        const res = await ownerAgent.put('/perms')
        .send({ wsId: workspaceId, profileId: "aaaaaaaaaaaaaaaaaaaaaaaa", perm: 'Read' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('El perfil no existe o no pertenece a este workspace');
    });

    it('404 NotExistsWorkspace', async () => {
        const res = await ownerAgent.put('/perms')
        .send({ wsId: "aaaaaaaaaaaaaaaaaaaaaaaa", profileId: groupProfile?._id, perm: 'Read' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('404 ProfileOfOtherWorkspace', async () => {
        const res = await ownerAgent.put('/perms')
        .send({ wsId: workspaceId, profileId: notMemberUserProfile?._id, perm: 'Read' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('El perfil no existe o no pertenece a este workspace');
    });
});

describe('/profile DELETE', () => {
    it('201 Owner', async () => {
        const res = await ownerAgent.delete('/profile')
        .send({ wsId: workspaceId, profileId: groupProfileToDelete1?._id.toString() });
        expect(res.status).toBe(201);

        const deletedProfile = await Profile.findOne({ _id: groupProfileToDelete1?._id });
        expect(deletedProfile).toBeNull();
    });

    it('201 Admin', async () => {
        const res = await ownerAgent.delete('/profile')
        .send({ wsId: workspaceId, profileId: groupProfileToDelete2?._id.toString() });
        expect(res.status).toBe(201);

        const deletedProfile = await Profile.findOne({ _id: groupProfileToDelete2?._id });
        expect(deletedProfile).toBeNull();
    });

    it('403 notMemberUser', async () => {
        const res = await notMemberAgent.delete('/profile')
        .send({ wsId: workspaceId, profileId: groupProfile?._id.toString() });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a eliminar perfiles');
    });

    it('403 writeReadUser', async () => {
        const res = await writeReadAgent.delete('/profile')
        .send({ wsId: workspaceId, profileId: groupProfile?._id.toString() });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a eliminar perfiles');
    });

    it('403 Admin deletes admin', async () => {
        const res = await adminAgent.delete('/profile')
        .send({ wsId: workspaceId, profileId: adminProfileToDelete?._id.toString() });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a borrar perfiles con permiso de administrador o propietario');
    });

    it('403 Admin deletes owner', async () => {
        const res = await adminAgent.delete('/profile')
        .send({ wsId: workspaceId, profileId: ownerProfile?._id.toString() });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a borrar perfiles con permiso de administrador o propietario');
    });

    it('403 Delete Owner', async () => {
        const res = await ownerAgent.delete('/profile')
        .send({ wsId: workspaceId, profileId: ownerProfile?._id.toString() });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No puedes borrar al propietario');
    });

    it('404 NotExistsWorkspace', async () => {
        const res = await ownerAgent.delete('/profile')
        .send({ wsId: 'aaaaaaaaaaaaaaaaaaaaaaaa', profileId: groupProfile?._id.toString() });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('404 NotExistsProfile', async () => {
        const res = await ownerAgent.delete('/profile')
        .send({ wsId: workspaceId, profileId: notMemberUserProfile?._id.toString() });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el perfil en el workspace');
    });

    it('400 Null fields', async () => {
        const res = await ownerAgent.delete('/profile')
        .send({});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se han especificado el/los campo(s) wsId, profileId');
    });
});

describe('/leave DELETE', async () => { 
    it('200', async () => {
        const res = await inviteAgent.delete('/leave')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(200);
    });

    it('403 DefaultWorkspace', async () => {
        const res = await ownerAgent.delete('/leave')
        .send({ wsId: workspaceDelete?._id });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No puedes abandonar el workspace por defecto');
    });

    it('404 WorkspaceNotExists', async () => {
        const res = await ownerAgent.delete('/leave')
        .send({ wsId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('404 ProfileNotExists', async () => {
        const res = await notMemberAgent.delete('/leave')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el perfil en el workspace');
    });

    it('400 Null fields', async () => {
        const res = await ownerAgent.delete('/leave')
        .send({});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se ha especificado el campo wsId');
    });
});

describe('/workspace/notices POST', () => {
    it('201 Owner', async () => {
        const res = await ownerAgent.post('/workspace/notices')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(200);
        const jsonRes = JSON.parse(res.text);
        expect(jsonRes.name).toBe('Workspace de userTest');
        expect(jsonRes.notices).toBeArrayOfSize(2);
        expect(jsonRes.folders).toBeArrayOfSize(2);
    });

    it('201 Admin', async () => {
        const res = await adminAgent.post('/workspace/notices')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(200);
        const jsonRes = JSON.parse(res.text);
        expect(jsonRes.name).toBe('Workspace de userTest');
        expect(jsonRes.notices).toBeArrayOfSize(2);
        expect(jsonRes.folders).toBeArrayOfSize(2);
    });

    it('403 WriteReadUser', async () => {
        const res = await writeReadAgent.post('/workspace/notices')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(200);
        const jsonRes = JSON.parse(res.text);
        expect(jsonRes.name).toBe('Workspace de userTest');
        expect(jsonRes.notices).toBeArrayOfSize(1);
        expect(jsonRes.folders).toBeArrayOfSize(1);
    });

    it('404 NotExists', async () => {
        const res = await ownerAgent.post('/workspace/notices')
        .send({ wsId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('403 NotMemberUser', async () => {
        const res = await notMemberAgent.post('/workspace/notices')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para ver ese workspace');
    });

});

describe('/workspace/folders POST', () => {
    it('201 Owner', async () => {
        const res = await ownerAgent.post('/workspace/notices')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(200);
        const jsonRes = JSON.parse(res.text);
        expect(jsonRes.name).toBe('Workspace de userTest');
        expect(jsonRes.folders).toBeArrayOfSize(2);
    });

    it('201 Owner default', async () => {
        const res = await ownerAgent.post('/workspace/notices');
        expect(res.status).toBe(200);
        const jsonRes = JSON.parse(res.text);
        expect(jsonRes.name).toBe('Workspace de userTest');
        expect(jsonRes.folders).toBeArrayOfSize(2);
    });

    it('201 Admin', async () => {
        const res = await adminAgent.post('/workspace/notices')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(200);
        const jsonRes = JSON.parse(res.text);
        expect(jsonRes.name).toBe('Workspace de userTest');
        expect(jsonRes.folders).toBeArrayOfSize(2);
    });

    it('403 WriteReadUser', async () => {
        const res = await writeReadAgent.post('/workspace/notices')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(200);
        const jsonRes = JSON.parse(res.text);
        expect(jsonRes.name).toBe('Workspace de userTest');
        expect(jsonRes.folders).toBeArrayOfSize(1);
    });

    it('404 NotExists', async () => {
        const res = await ownerAgent.post('/workspace/notices')
        .send({ wsId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('403 NotMemberUser', async () => {
        const res = await notMemberAgent.post('/workspace/notices')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para ver ese workspace');
    });
});

describe('/workspace/favorites POST', () => {
    it('201 Owner', async () => {
        const res = await ownerAgent.post('/workspace/favorites')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(200);
        const jsonRes = JSON.parse(res.text);
        expect(jsonRes.workspace.items).toBeArrayOfSize(4);
        expect(jsonRes.folders).toBeArrayOfSize(2);
    });
    it('201 Owner default', async () => {
        const res = await ownerAgent.post('/workspace/favorites');
        expect(res.status).toBe(200);
        const jsonRes = JSON.parse(res.text);
        expect(jsonRes.workspace.items).toBeArrayOfSize(4);
        expect(jsonRes.folders).toBeArrayOfSize(2);
    });
    it('201 Admin', async () => {
        const res = await adminAgent.post('/workspace/favorites')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(200);
        const jsonRes = JSON.parse(res.text);
        expect(jsonRes.workspace.items).toBeArrayOfSize(4);
        expect(jsonRes.folders).toBeArrayOfSize(2);
    });
    it('403 WriteReadUser', async () => {
        const res = await writeReadAgent.post('/workspace/favorites')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(200);
        const jsonRes = JSON.parse(res.text);
        expect(jsonRes.workspace.items).toBeArrayOfSize(2);
        expect(jsonRes.folders).toBeArrayOfSize(1);
    });
    it('404 NotExists', async () => {
        const res = await ownerAgent.post('/workspace/favorites')
        .send({ wsId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });
    it('403 NotMemberUser', async () => {
        const res = await notMemberAgent.post('/workspace/favorites')
        .send({ wsId: workspaceId });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado para ver ese workspace');
    });

});

describe('/workspace DELETE', () => {
    it('403 Admin', async () => {
        const res = await adminAgent.delete('/workspace')
        .send({ wsId: workspaceDelete?._id.toString() });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a borrar el workspace');
    });

    it('403 WriteReadUser', async () => {
        const res = await writeReadAgent.delete('/workspace')
        .send({ wsId: workspaceDelete?._id.toString() });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a borrar el workspace');
    });

    it('403 NotMemberUser', async () => {
        const res = await notMemberAgent.delete('/workspace')
        .send({ wsId: workspaceDelete?._id.toString() });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.text).error).toBe('No estás autorizado a borrar el workspace');
    });

    it('404 WorkspaceNotExists', async () => {
        const res = await ownerAgent.delete('/workspace')
        .send({ wsId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).error).toBe('No se ha encontrado el workspace');
    });

    it('400 Null fields', async () => {
        const res = await ownerAgent.delete('/workspace')
        .send({});
        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).error).toBe('No se ha especificado el campo wsId');
    });

    it('200 Owner', async () => {
        const res = await ownerAgent.delete('/workspace')
        .send({ wsId: workspaceDelete?._id });
        expect(res.status).toBe(200);
        const deletedWorkspace = await Workspace.findOne({ _id: workspaceDelete?._id });
        expect(deletedWorkspace).toBeNull();
    });
});