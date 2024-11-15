import type { IProfile } from '../models/profile.ts';
import { ProfileType, WSPermission } from '../models/profile.ts';
import Workspace from '../schemas/workspaceSchema.ts';
import Profile from '../schemas/profileSchema.ts';
import User from '../schemas/userSchema.ts';
import Item from '../schemas/itemSchema.ts';
import { parseValidationError } from '../utils/errorParser.ts';
import { getUserPermission, getWSPermission } from '../utils/permsFunctions.ts';
import { ItemType, type IItem } from '../models/item.ts';
import { Permission } from '../models/profilePerms.ts';
import type { IProfilePerms } from '../models/profilePerms.ts';
import mongoose from 'mongoose';
import type { IUser } from '../models/user.ts';
import fs from 'fs';
import { sendMessageToUser, sendMessageToWorkspace } from '../config/websocket.ts';
import Invitation from '../schemas/invitationSchema.ts';
import type { IInvitation } from '../models/invitation.ts';
import type { IWorkspace } from '../models/workspace.ts';
import { deleteUserFromWs } from '../utils/deleteUserFromWs.ts';
import Chat from '../schemas/chatSchema.ts';
import { ChatType } from '../models/chat.ts';

export const getWorkspace = async (req: any, res: any) => {
  try {
    const wsId = req.params.wsId;
    if (!wsId) {
      const profiles = await Profile.find({ name: req.user._id, wsPerm: 'Owner' }).select('_id');
      const workspace = await Workspace.findOne({default: 1, profiles: { $in: profiles }});
      await workspace?.populate('items');
      await workspace?.populate('items.profilePerms.profile');
      await workspace?.populate('profiles');
      await workspace?.populate('profiles.users');
      return res.status(200).json(workspace);
    } else {
      const workspace = await Workspace.findOne({ _id: wsId });
      if (!workspace) {
        return res.status(404).json({ error: 'No se ha encontrado el workspace' });
      }

      if (await getWSPermission(req.user._id, wsId)){
        await workspace.populate('items');
        const itemsToShow = [];
        for (const item of workspace.items) {
          if (await getUserPermission(req.user._id, wsId, item?._id.toString())) {
            itemsToShow.push(item);
          }
        }
        workspace.items = itemsToShow;
        await workspace.populate('items');
        await workspace?.populate('items.profilePerms.profile');
        await workspace.populate('profiles');
        await workspace.populate('profiles.users');
        return res.status(200).json(workspace);
      } else {
        return res.status(403).json({ error: 'No estás autorizado para ver ese workspace' });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserWorkspaces = async (req: any, res: any) => {
  try {
    const profiles = await Profile.find({ name: req.user._id });
    const workspaces = await Workspace.find({ profiles: { $in: profiles } });
    const formattedWorkspaces : any = [];
    for (const ws of workspaces) {
      formattedWorkspaces.push({ _id: ws._id, name: ws.name, perm: await getWSPermission(req.user._id, ws._id.toString()) })
    }
    res.status(200).json({ formattedWorkspaces });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getWorkspaceFavs = async (req: any, res: any) => {
  try {
    const wsId = req.body.wsId;
    let workspace;
    if (!wsId) {
      const profiles = await Profile.find({ name: req.user._id, wsPerm: 'Owner' }).select('_id');
      workspace = await Workspace.findOne({default: 1, profiles: { $in: profiles }});
    }else{
      workspace = await Workspace.findOne({ _id: wsId });
    }
   
    
    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }

    if (await getWSPermission(req.user._id, workspace._id.toString())){
      await workspace.populate('items');
      await workspace.populate('items.profilePerms.profile');
      await workspace.populate('profiles');
      await workspace.populate('profiles.users');

      const foldersToShow = [];
      for (const item of workspace.items) {
        if (await getUserPermission(req.user._id, workspace._id.toString(), item?._id.toString()) && item && (item as IItem).itemType === ItemType.Folder) {
          foldersToShow.push(item);
        }
      }

      const favItems = [];
      for (const item of workspace.items) {
        if (await getUserPermission(req.user._id, workspace._id.toString(), item?._id.toString()) && item && req.user.favorites.includes(item._id)) {
          favItems.push(item);
        }
      }

      workspace.items = favItems;
      await workspace.populate('items');
      await workspace.populate('items.profilePerms.profile');
      await workspace.populate('profiles');
      await workspace.populate('profiles.users');
      return res.status(200).json({ workspace: workspace, folders: foldersToShow });
    } else {
      return res.status(403).json({ error: 'No estás autorizado para ver ese workspace' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getWorkspaceNotices = async (req: any, res: any) => {
  try {
    const wsId = req.body.wsId;
    let workspace;
    if (!wsId) {
      const profiles = await Profile.find({ name: req.user._id, wsPerm: 'Owner' }).select('_id');
      workspace = await Workspace.findOne({default: 1, profiles: { $in: profiles }}).populate('items');
    }else{
      workspace = await Workspace.findOne({ _id: wsId }).populate('items');
    }

    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }
    if (!(await getWSPermission(req.user._id, workspace._id.toString()))) {
      return res.status(403).json({ error: 'No estás autorizado para ver ese workspace' });
    } 
    await workspace.populate('items');
    const itemsToShow = [];
    for (const item of workspace.items) {
      if (await getUserPermission(req.user._id, workspace._id.toString(), item?._id.toString()) && item && ((item as IItem).itemType === ItemType.Folder || (item as IItem).itemType === ItemType.Notice)) {
        itemsToShow.push(item);
      }
    }

    workspace.items = itemsToShow;
    await workspace.populate('items');
    await workspace.populate('profiles');
    await workspace.populate('profiles.users');
    
    const notices = (workspace.items as mongoose.PopulatedDoc<IItem>[]).filter(
      (item): item is IItem => item instanceof mongoose.Document && item.itemType === ItemType.Notice
    );

    const noticesWithOwner : any[] = [];

    for (let i = 0; i < notices.length; i++) {
      const profileId = (((notices[i] as unknown as IItem).profilePerms.find((profilePerm: IProfilePerms) => profilePerm.permission == Permission.Owner)?.profile as unknown as IProfile) as unknown as mongoose.Types.ObjectId).toString();
      const profile = await Profile.findOne({ _id: profileId });
      const userId = (await profile?.populate('users'))?.users[0];
      const owner = (await User.findById(userId).exec()) as IUser;
      noticesWithOwner.push({ notice: notices[i], owner: { username: owner.username, email: owner.email }});
    }
    
    const foldersToShow = [];
    for (const item of workspace.items) {
      if (await getUserPermission(req.user._id, workspace._id.toString(), item?._id.toString()) && item && (item as IItem).itemType === ItemType.Folder) {
        foldersToShow.push(item);
      }
    }
    res.status(200).json({_id: workspace._id, notices: noticesWithOwner, folders: foldersToShow, profiles: workspace.profiles, name: workspace.name});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getWorkspaceFolders = async (req: any, res: any) => {
  try {
    const wsId = req.body.wsId;
    let workspace;
    if (!wsId) {
      const profiles = await Profile.find({ name: req.user._id, wsPerm: 'Owner' }).select('_id');
      workspace = await Workspace.findOne({default: 1, profiles: { $in: profiles }});
    }else{
      workspace = await Workspace.findOne({ _id: wsId });
    }

    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }
    const wsPerm = await getWSPermission(req.user._id, workspace._id.toString());
    if (!wsPerm) {
      return res.status(403).json({ error: 'No estás autorizado para ver ese workspace' });
    } 
    await workspace.populate('items');
    const foldersToShow = [];
    for (const item of workspace.items) {
      if (await getUserPermission(req.user._id, workspace._id.toString(), item?._id.toString()) && item && (item as IItem).itemType === ItemType.Folder) {
        foldersToShow.push(item);
      }
    }

    workspace.items = foldersToShow;
    await workspace.populate('items');
    await workspace.populate('profiles');
    await workspace.populate('profiles.users');
    res.status(200).json({_id: workspace._id, name: workspace.name, folders: foldersToShow, permission: wsPerm});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createWorkspace = async (req: any, res: any) => {
  const wsName = req.body.wsName;
  const user = req.user;

  if (!wsName) {
    return res.status(400).json({ error: 'No se ha especificado el campo wsName'});
  }

  try {
    const profile = new Profile({ name: user._id, profileType: ProfileType.Individual, wsPerm: WSPermission.Owner, users: [user] });
    profile.save();
    const workspace = new Workspace({ name: wsName, items: [], profiles: [profile] });
    try {
      await workspace.validate();
    } catch (error) {
      return res.status(400).json({ errors: parseValidationError(error) });
    }
    await workspace.save();

    const chat = new Chat({ name: workspace.name, type: ChatType.WORKSPACE, workspace: workspace._id, users: [req.user], messages: [] });
    await chat.save();

    if (!fs.existsSync(`uploads/${workspace._id}`)) {
      fs.mkdirSync(`uploads/${workspace._id}/temp`, { recursive: true });
    }
    res.status(201).json({ wsId: workspace._id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const editWorkspace = async (req: any, res: any) => {
  const newWs = req.body.workspace;

  if (!newWs) {
    return res.status(400).json({ error: 'No se ha especificado el campo workspace' });
  }

  try {
    const workspace = await Workspace.findOne({ _id: newWs._id });
    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }
    const reqPerm = await getWSPermission(req.user._id, newWs._id);
    if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
      return res.status(403).json({ error: 'No estás autorizado a editar el workspace' });
    }
    workspace.name = newWs.name;
    try {
      await workspace.validate();
    } catch (error) {
      return res.status(400).json({ errors: parseValidationError(error) });
    }
    await workspace.save();

    const chat = await Chat.findOne({ workspace: newWs._id });
    if(chat){
      chat.name = newWs.name;
      await chat.save();
    }

    await workspace?.populate('items');
    await workspace?.populate('items.profilePerms.profile');
    await workspace?.populate('profiles');
    await workspace?.populate('profiles.users');
    res.status(201).json(workspace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export const addUserToWorkspace = async (req: any, res: any) => {
  const wsId = req.body.workspace;
  const username = req.body.username;
  const perm = req.body.perm;

  if (!wsId || !username || !perm) {
    const missingFields = [!wsId?"workspace":null, !username?"username":null, !perm?"perm":null].filter(Boolean).join(', ');
    return res.status(400).json({ error: 'No se han especificado el/los campo(s) '+ missingFields });
  }

  try {
    const workspace = await Workspace.findOne({ _id: wsId }).populate('profiles');
    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    } 

    const reqPerms = await getWSPermission(req.user._id, wsId);
    if (!([WSPermission.Owner, WSPermission.Admin].find(x => x == reqPerms))) {
      return res.status(403).json({ error: 'No estás autorizado para añadir usuarios a este workspace' });
    }

    if (perm === WSPermission.Owner) {
      return res.status(403).json({ error: 'No puedes añadir un propietario' });
    }

    if (reqPerms === WSPermission.Admin && perm === WSPermission.Admin) {
      return res.status(403).json({ error: 'No estás autorizado a añadir a otros administradores' });
    }

    const user = await User.findOne({ username: username });
    if (!user) {
      return res.status(404).json({ error: 'No se ha encontrado el usuario' });
    }

    if (workspace.profiles.find((profile: mongoose.PopulatedDoc<IProfile>) => profile && ((profile as unknown as IProfile).users as  mongoose.Types.ObjectId[]).find((u: mongoose.Types.ObjectId) => u.toString() === user._id.toString()))) {
      return res.status(409).json({ error: 'El usuario ya está en el workspace' });
    }
    
    const profile = new Profile({ name: user._id, profileType: ProfileType.Individual, wsPerm: perm, users: [user] });
    try{
      await profile.validate();
    } catch (error) {
      return res.status(400).json({ errors: parseValidationError(error) });
    }
    await profile.save();
    workspace.profiles.push(profile._id);
    await workspace.save();

    const chat = await Chat.findOne({ workspace: wsId });
    if (chat) {
      chat.users.push(user._id);
      await chat.save();
    }

    sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
    sendMessageToWorkspace(wsId, { type: 'chatAction' });
    sendMessageToUser(user._id.toString(), { type: 'addedToWorkspace' });
    sendMessageToUser(user._id.toString(), { type: 'chatAction'});
    res.status(201).json(workspace);
  
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const changeWSPerms = async (req: any, res: any) => {
  const { wsId, profileId, perm } = req.body;

  if (!wsId || !profileId || !perm) {
    const missingFields = [!wsId?"wsId":null, !profileId?"profileId":null, !perm?"perm":null].filter((field) => field !== null).join(', ');
    return res.status(400).json({ error: 'No se han especificado el/los campo(s) '+ missingFields });
  }

  try {
      const workspace = await Workspace.findOne({ _id: wsId }).populate('profiles');
      if (!workspace) {
        return res.status(404).json({ error: 'No se ha encontrado el workspace' });
      }
      const reqPerm = await getWSPermission(req.user._id, wsId);
      if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
        return res.status(403).json({ error: 'No estás autorizado a cambiar los permisos de este workspace' });
      }
      
      if (perm === WSPermission.Owner) {
        return res.status(403).json({ error: 'No puedes añadir un propietario' });
      }
      const profile: mongoose.PopulatedDoc<IProfile> = workspace.profiles.find((profile: mongoose.PopulatedDoc<IProfile>) => profile && profile._id.toString() === profileId.toString());
      if (!profile) {
        return res.status(404).json({ error: 'El perfil no existe o no pertenece a este workspace' });
      }
      if (profile instanceof mongoose.Document) {
        if (reqPerm === WSPermission.Admin && (profile.wsPerm === WSPermission.Owner || profile.wsPerm === WSPermission.Admin)) {
          return res.status(403).json({ error: 'No estás autorizado a cambiar los permisos de otros administradores' });
        }
        if (profile.wsPerm === WSPermission.Owner) {
          return res.status(403).json({ error: 'No puedes cambiar los permisos del propietario' });
        }
        profile.wsPerm = perm;
        try {
          await profile.validate();
        } catch (error) {
          return res.status(400).json({ errors: parseValidationError(error) });
        }
        profile.save();
      }
      sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
      res.status(201).json(workspace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createInvitation = async (req: any, res: any) => {
  const wsId = req.body.workspace;
  const profileId = req.body.profile;
  const linkDuration = req.body.linkDuration;

  if (!wsId || !linkDuration) {
    const missingFields = [!wsId?"workspace":null, !linkDuration?"linkDuration":null].filter((field) => field !== null).join(', ');
    return res.status(400).json({ error: 'No se han especificado el/los campo(s) '+ missingFields });
  }

  try {
    const workspace = await Workspace.findOne({ _id: wsId });
    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }

    const reqPerm = await getWSPermission(req.user._id, wsId);
    if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
      return res.status(403).json({ error: 'No estás autorizado para crear invitaciones en este workspace' });
    }
    const profile = await Profile.findOne({ _id: profileId });

    if (profile?.profileType === ProfileType.Individual) {
      return res.status(403).json({ error: 'No puedes crear enlaces para perfiles individuales' });
    }

    if (reqPerm === WSPermission.Admin && profile?.wsPerm === WSPermission.Admin) {
      return res.status(403).json({ error: 'No estás autorizado a añadir a otros administradores' });
    }

    const code = Math.random().toString(36).substring(2, 18);
    let expirationDate: Date | undefined = undefined;
    switch (linkDuration) {
      case 'day':
        expirationDate = new Date(Date.now() + 86400000);
        break;
      case 'week':
        expirationDate = new Date(Date.now() + 604800000);
        break;
      case 'month':
        expirationDate = new Date(Date.now() + 2592000000);
        break;
      case 'none':
        break;
      default:
        return res.status(400).json({ error: 'Duración de la invitación no válida' });
    }
    const invitation = new Invitation({ code: code, workspace: wsId, profile: profileId, expirationDate: expirationDate });
    try {
      await invitation.validate();
    } catch (error) {
      return res.status(400).json({ errors: parseValidationError(error) });
    }
    await invitation.save();
    res.status(201).json({success: true, invitation: invitation});
  }
  catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getInvitations = async (req: any, res: any) => {
  const wsId = req.params.workspace;
  try {
    const workspace = await Workspace.findOne({ _id: wsId });
    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }
    const reqPerm = await getWSPermission(req.user._id, wsId);
    if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
      return res.status(403).json({ error: 'No estás autorizado para ver las invitaciones de este workspace' });
    }
    let invitations= await Invitation.find({ workspace: wsId }).populate('profile');
    if (reqPerm !== WSPermission.Owner) { 
      invitations = invitations.filter((invitation) => (invitation.profile as unknown as IProfile)?.wsPerm !== WSPermission.Admin);
    }
    res.status(200).json(invitations);
  }
  catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleActiveInvitation = async (req: any, res: any) => {
  const invId = req.body.invId;

  if (!invId) {
    return res.status(400).json({ error: 'No se ha especificado el campo invId' });
  }

  try {
    const invitation: mongoose.Document<IInvitation> | null = await Invitation.findOne({ _id: invId });
    if (!invitation) {
      return res.status(404).json({ error: 'No se ha encontrado la invitación' });
    }
    const wsId = invitation.get("workspace")._id.toString();
    const reqPerm = await getWSPermission(req.user._id, wsId);
    if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) { 
      return res.status(403).json({ error: ('No estás autorizado para '+ (invitation.get('active')?'desactivar':'activar') + ' invitaciones en este workspace')});
    }
    invitation.set("active", !invitation.get("active"));
    await invitation.save();
    res.status(200).json({ message: 'Invitación ' + (invitation.get("active") ? 'activada' : 'desactivada') });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteInvitation = async (req: any, res: any) => {
  const invId = req.body.invId;

  if (!invId) {
    return res.status(400).json({ error: 'No se ha especificado el campo invId' });
  }

  try {
    const invitation = await Invitation.findOne({ _id: invId });
    if (!invitation) {
      return res.status(404).json({ error: 'No se ha encontrado la invitación' });
    }
    const wsId = invitation.get("workspace")._id.toString();
    const reqPerm = await getWSPermission(req.user._id, wsId);
    if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
      return res.status(403).json({ error: 'No estás autorizado para borrar invitaciones en este workspace' });
    }
    await invitation.deleteOne();
    res.status(200).json({ message: 'Invitación eliminada' });
  }
  catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getInvitation = async (req: any, res: any) => {
  const code = req.params.code;

  if (!code) {
    return res.status(400).json({ error: 'No se ha especificado el campo code' });
  }

  try {
    const invitation = await Invitation.findOne({ code: code }).populate('profile').populate('workspace').populate('workspace.profiles');
    if (!invitation) {
      return res.status(404).json({ error: 'No se ha encontrado la invitación' });
    }
    if (!invitation.get("active")) {
      return res.status(403).json({ error: 'La invitación ha sido desactivada' });
    }
    if (invitation.get("expirationDate") < new Date()) {
      return res.status(403).json({ error: 'La invitación ha expirado' });
    }

    await invitation.populate('workspace.profiles');

    const parsedInvitation = {
      _id: invitation._id,
      code: invitation.code,
      active: invitation.active,
      expirationDate: invitation.expirationDate,
      profile: invitation.profile?{ _id: invitation.profile._id, name: (invitation.profile as unknown as IProfile).name, wsPerm: (invitation.profile as unknown as IProfile).wsPerm}:null,
      workspace: { _id: invitation.workspace._id, name: (invitation.workspace as unknown as IWorkspace).name, numUsers: (invitation.workspace as unknown as IWorkspace).profiles.filter((profile) => (profile as IProfile)?.profileType === ProfileType.Individual).length},
    }
    res.status(200).json(parsedInvitation);
  }
  catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export const useInvitation = async (req: any, res: any) => {
  const code = req.params.code;

  if (!code) {
    return res.status(400).json({ error: 'No se ha especificado el campo code' });
  }

  try {
    const invitation = await Invitation.findOne({ code: code }).populate('profile').populate('workspace');
    if (!invitation) {
      return res.status(404).json({ error: 'No se ha encontrado la invitación' });
    }
    if (!invitation.get("active")) {
      return res.status(403).json({ error: 'La invitación ha sido desactivada' });
    }
    if (invitation.get("expirationDate") < new Date()) {
      return res.status(403).json({ error: 'La invitación ha expirado' });
    }

    const workspace = await Workspace.findOne({ _id: invitation.workspace._id }).populate('profiles');
    if (!workspace) {
      return res.status(404).json({ error: 'El workspace fue eliminado' });
    }

    if (workspace.profiles.some((profile: mongoose.PopulatedDoc<IProfile>) => profile && ((profile as unknown as IProfile).users as  mongoose.Types.ObjectId[]).find((u: mongoose.Types.ObjectId) => u.toString() === req.user._id.toString()))) {
      return res.status(409).json({ error: 'Ya estás en el workspace' });
    }

    const profile = invitation.profile;
    const user = req.user;
    const userProfile = new Profile({ name: user._id, profileType: ProfileType.Individual, wsPerm: WSPermission.Read, users: [user] });
    await userProfile.save();
    workspace.profiles.push(userProfile._id);
    await workspace.save();

    const chat = await Chat.findOne({ workspace: workspace._id });
    if(chat){
      chat.users.push(user);
      await chat.save();
    }

    if (profile instanceof mongoose.Document){
      profile.get("users").push(mongoose.Types.ObjectId.createFromHexString(user._id.toString()));
      await profile.save();
    }

    sendMessageToWorkspace(workspace._id.toString(), { type: 'workspaceUpdated' });
    res.status(200).json({ message: 'Invitación usada' });
  }catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const saveProfile = async (req: any, res: any) => {
  const wsId = req.body.wsId;
  const newProfileData : IProfile = req.body.profile;

  if (!wsId || !newProfileData) {
    const missingFields = [!wsId?"wsId":null, !newProfileData?"profile":null].filter((field) => field !== null).join(', ');
    return res.status(400).json({ error: 'No se han especificado el/los campo(s) ' + missingFields });
  }

  try {
    const workspace = await Workspace.findOne({ _id: wsId }).populate('profiles');
    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }

    const reqPerm = await getWSPermission(req.user._id, wsId);
    if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
      return res.status(403).json({ error: 'No estás autorizado a crear o editar perfiles' });
    }

    if (reqPerm === WSPermission.Admin && newProfileData.wsPerm === WSPermission.Admin) {
      return res.status(403).json({ error: 'No estás autorizado a añadir a otros administradores' });
    }

    if (newProfileData.wsPerm === WSPermission.Owner) {
      return res.status(403).json({ error: 'No puedes añadir un propietario' });
    }

    const sameNameProfile = workspace.profiles.find((profile: mongoose.PopulatedDoc<IProfile>) => profile instanceof mongoose.Document && profile.name == newProfileData.name);
    if (sameNameProfile && (!newProfileData._id || sameNameProfile._id.toString() !== newProfileData._id.toString())) {
      return res.status(409).json({ error: 'El perfil ya está en el workspace' });
    }
    
    let areInWorkspace : mongoose.Types.ObjectId[] = [];
    if (newProfileData.users && newProfileData.users.length !== 0) {
      for (const userId of newProfileData.users) {
        const existingProfile = (workspace.profiles as (mongoose.PopulatedDoc<IProfile, mongoose.Types.ObjectId> | IProfile)[]).find(
          (profile): profile is IProfile => 
            (profile as IProfile).profileType === ProfileType.Individual && (profile as IProfile).name.toString() === userId?.toString()
        );

        if (existingProfile) {
          areInWorkspace.push(existingProfile.users[0] as mongoose.Types.ObjectId);
        }
      }

      if (areInWorkspace.length !== newProfileData.users.length) {
        return res.status(404).json({ error: `Hay usuarios que no existen en el workspace` });
      }
    }

    if (newProfileData._id) {
      const newProfile = await Profile.findOne({ _id: newProfileData._id });
      if (!newProfile) {
        return res.status(404).json({ error: 'No se ha encontrado el perfil' });
      }
      newProfile.name = newProfileData.name;
      newProfile.profileType = newProfileData.profileType;
      newProfile.wsPerm = newProfileData.wsPerm;
      newProfile.users = areInWorkspace;
      try {
        await newProfile.validate();
      } catch (error) {
        return res.status(400).json({ errors: parseValidationError(error) });
      }
      await newProfile.save();
    } else {
      if (newProfileData.profileType === ProfileType.Individual) {
        return res.status(403).json({ error: 'No puedes crear perfiles individuales' });
      }
      const newProfile = new Profile({ _id: newProfileData._id, name: newProfileData.name, profileType: newProfileData.profileType, wsPerm: newProfileData.wsPerm, users: areInWorkspace});
      try {
        await newProfile.validate();
      } catch (error) {
        return res.status(400).json({ errors: parseValidationError(error) });
      }
      await newProfile.save();
      workspace.profiles.push(newProfile._id);
    }

    await workspace.save();
    sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
    res.status(201).json(workspace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteProfile = async (req: any, res: any) => {
  const wsId = req.body.wsId;
  const profileId = req.body.profileId;

  if (!wsId || !profileId) {
    const missingFields = [!wsId?"wsId":null, !profileId?"profileId":null].filter((field) => field !== null).join(', ');
    return res.status(400).json({ error: 'No se han especificado el/los campo(s) '+ missingFields });
  }

  try {
    const workspace = await Workspace.findOne({ _id: wsId }).populate('profiles');
    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }

    const reqPerm = await getWSPermission(req.user._id, wsId);
    if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
      return res.status(403).json({ error: 'No estás autorizado a eliminar perfiles' });
    }

    const profile = workspace.profiles.find(profile => profile?._id.toString() === profileId) as mongoose.PopulatedDoc<IProfile, mongoose.Types.ObjectId | undefined>;
    if (!profile) {
      return res.status(404).json({ error: 'No se ha encontrado el perfil en el workspace' });
    }

    if (reqPerm === WSPermission.Admin && ((profile as IProfile).wsPerm === WSPermission.Owner || (profile as IProfile).wsPerm === WSPermission.Admin) && req.user._id.toString() !== (profile as IProfile)?.name.toString()) {
      return res.status(403).json({ error: 'No estás autorizado a borrar perfiles con permiso de administrador o propietario' });
    }

    if ((profile as IProfile).wsPerm === WSPermission.Owner) {
      return res.status(403).json({ error: 'No puedes borrar al propietario' });
    }

    if ((profile as IProfile).profileType === ProfileType.Individual) { 
      await deleteUserFromWs((profile as IProfile).name, workspace);
    } else {
      workspace.profiles = (workspace.profiles as mongoose.Types.ObjectId[]).filter((profId) => profId._id.toString() !== profile._id.toString());
      await Profile.deleteOne({ _id: profileId });
      await workspace.save();
      sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
    }
    
    sendMessageToUser((profile as IProfile).name, { type: 'profileDeleted', wsAffected: wsId });
    res.status(201).json(workspace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const leaveWorkspace = async (req: any, res: any) => {
  const wsId = req.body.wsId;
  const profileName = req.user._id;

  if (!wsId) {
    return res.status(400).json({ error: 'No se ha especificado el campo wsId' });
  }
  
  try {
    const workspace = await Workspace.findOne({ _id: wsId }).populate('profiles');
    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }

    const profile = await Profile.findOne({ name: profileName, _id: { $in: workspace.profiles } });
    if (!profile) {
      return res.status(404).json({ error: 'No se ha encontrado el perfil en el workspace' });
    }
    
    if (workspace.default && (await getWSPermission(req.user._id, wsId) === WSPermission.Owner)){
      return res.status(403).json({ error: 'No puedes abandonar el workspace por defecto' });
    }

    await deleteUserFromWs(req.user._id, workspace);
    sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
    sendMessageToWorkspace(wsId, { type: 'chatAction' });
    res.status(200).json(workspace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteWorkspace = async (req: any, res: any) => {
  const wsId = req.body.wsId;

  if (!wsId) {
    return res.status(400).json({ error: 'No se ha especificado el campo wsId' });
  }

  try {
    const workspace = await Workspace.findOne({ _id: wsId }).populate('profiles').populate('items');
    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }

    const reqPerm = await getWSPermission(req.user._id, wsId);
    if (reqPerm !== WSPermission.Owner) {
      return res.status(403).json({ error: 'No estás autorizado a borrar el workspace' });
    }

    for (const profile of workspace.profiles) {
      await Profile.deleteOne({ _id: profile });
    }

    for (const item of workspace.items) {
      await Item.deleteOne({ _id: item });
    }

    await Chat.deleteMany({ workspace: wsId });
    await Invitation.deleteMany({ workspace: workspace._id });
    await workspace.deleteOne();

    const chat = await Chat.findOne({ workspace: wsId });
    if (chat) {
      await Chat.deleteOne( { _id: chat._id } );
    }

    if (fs.existsSync(`uploads/${wsId}`)) {
      fs.rmdirSync(`uploads/${wsId}`, { recursive: true });
    }

    sendMessageToWorkspace(workspace._id.toString(), { type: 'workspaceDeleted'});
    res.status(200).json({ message: 'Workspace eliminado' });
  }
  catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};