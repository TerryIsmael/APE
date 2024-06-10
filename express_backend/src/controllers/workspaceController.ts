import type { IProfile } from '../models/profile.ts';
import { ProfileType, WSPermission } from '../models/profile.ts';
import Workspace from '../schemas/workspaceSchema.ts';
import Profile from '../schemas/profileSchema.ts';
import User from '../schemas/userSchema.ts';
import { parseValidationError } from '../utils/errorParser.ts';
import { getWSPermission } from '../utils/permsFunctions.ts';
import { ItemType, type IItem } from '../models/item.ts';
import { Permission } from '../models/profilePerms.ts';
import type { IProfilePerms } from '../models/profilePerms.ts';
import mongoose from 'mongoose';
import type { IUser } from '../models/user.ts';
import fs from 'fs';
import { sendMessageToWorkspace } from '../config/websocket.ts';
import Invitation from '../schemas/invitationSchema.ts';
import type { IInvitation } from '../models/invitation.ts';

export const getWorkspace = async (req: any, res: any) => {
  try {
    const wsId = req.query.workspace;
    if (!wsId) {
      const profiles = await Profile.find({ name: req.user._id, wsPerm: 'Owner' }).select('_id');
      const workspace = await Workspace.findOne({default: 1, profiles: { $in: profiles }});
      await workspace?.populate('items');
      await workspace?.populate('items.profilePerms.profile');
      await workspace?.populate('profiles');
      await workspace?.populate('profiles.users');
      res.status(200).json(workspace);
      return;
    } else {
      const workspace = await Workspace.findOne({ _id: wsId });
      if (!workspace) {
        return res.status(404).json({ error: 'No se ha encontrado el workspace' });
      }

      if (await getWSPermission(req.user._id, wsId)){
        await workspace.populate('items');
        await workspace.populate('profiles');
        await workspace.populate('profiles.users');
        return res.status(200).json(workspace);
      } else {
        return res.status(401).json({ error: 'No estás autorizado para ver ese workspace' });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getWorkspaceFavs = async (req: any, res: any) => {
  try {
    const wsId = req.body.wsId;
    const workspace = await Workspace.findOne({ _id: wsId });
    
    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }

    if (await getWSPermission(req.user._id, wsId)){
      await workspace.populate('items');
      await workspace.populate('items.profilePerms.profile');
      await workspace.populate('profiles');
      await workspace.populate('profiles.users');

      const folders = (workspace.items as mongoose.PopulatedDoc<IItem>[]).filter(
        (item): item is IItem => item instanceof mongoose.Document && item.itemType === ItemType.Folder
      );

      const favItems = (workspace.items as mongoose.PopulatedDoc<IItem>[]).filter(
        (item): item is IItem => item instanceof mongoose.Document && req.user.favorites.includes(item._id)
      );
      workspace.items = favItems;
      await workspace.populate('items');
      await workspace.populate('items.profilePerms.profile');
      await workspace.populate('profiles');
      await workspace.populate('profiles.users');
      return res.status(200).json({ workspace: workspace, folders: folders });
    } else {
      return res.status(401).json({ error: 'No estás autorizado para ver ese workspace' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getWorkspaceNotices = async (req: any, res: any) => {
  try {
    const wsId = req.body.wsId;
    if (!wsId) {
      res.status(400).json({ error: 'No se ha especificado el workspace' });
      return;
    }

    const workspace = await Workspace.findOne({ _id: wsId }).populate('items');

    if (!workspace) {
      return res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }
    if (!(await getWSPermission(req.user._id, wsId))) {
      return res.status(401).json({ error: 'No estás autorizado para ver ese workspace' });
    } 

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

    const folders = (workspace.items as unknown as IItem[]).filter((item: IItem) => item.itemType == ItemType.Folder);
    res.status(200).json({_id: workspace._id, notices: noticesWithOwner, folders: folders, profiles: workspace.profiles, name: workspace.name});
    return;

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export const createWorkspace = async (req: any, res: any) => {
  const wsName = req.body.wsName;
  const user = req.user;
  try {
    const profile = { name: user._id, profileType: ProfileType.Individual, wsPerm: WSPermission.Owner, users: [user] };
    const workspace = new Workspace({ name: wsName, items: [], profiles: [profile] });
    try {
      workspace.validateSync();
    } catch (error) {
      res.status(400).json({ error: parseValidationError(error) });
    }
    await workspace.save();
    if (!fs.existsSync(`uploads/${workspace._id}`)) {
      fs.mkdirSync(`uploads/${workspace._id}`, { recursive: true });
    }
    res.status(201).json(workspace);
  } catch (error: any) {
    res.status(409).json({ error: error.message });
  }
};

export const addUserToWorkspace = async (req: any, res: any) => {
  const wsId = req.body.workspace;
  const username = req.body.username;
  const perm = req.body.perm;
  try {
    const workspace = await Workspace.findOne({ _id: wsId }).populate('profiles');
  if (!workspace) {
    res.status(404).json({ error: 'No se ha encontrado el workspace' });
    return;
  } 
  const reqPerms = await getWSPermission(req.user._id, wsId);
  if (!([WSPermission.Owner, WSPermission.Admin].find(x => x == reqPerms))) {
    res.status(401).json({ error: 'No estás autorizado para añadir usuarios a este workspace' });
    return;
  }
  const user = await User.findOne({ username: username });
  if (!user) {
    res.status(404).json({ error: 'No se ha encontrado el usuario' });
    return;
  }
  if (workspace.profiles.find((profile: mongoose.PopulatedDoc<IProfile>) => profile && ((profile as unknown as IProfile).users).find((u: mongoose.Types.ObjectId) => u.toString() === user._id.toString()))) {
    res.status(409).json({ error: 'El usuario ya está en el workspace' });
    return;
  }
  const profile = new Profile({ name: user._id, profileType: ProfileType.Individual, wsPerm: perm, users: [user] });
  await profile.save();
  workspace.profiles.push(profile._id);
  await workspace.save();
  sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
  res.status(201).json(workspace);
  
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const changeWSPerms = async (req: any, res: any) => {
  const { wsId, profileId, perm } = req.body;
  try {
      const workspace = await Workspace.findOne({ _id: wsId }).populate('profiles');
      if (!workspace) {
          res.status(404).json({ error: 'No se ha encontrado el workspace' });
          return;
      }
      const reqPerm = await getWSPermission(req.user._id, wsId);
      if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
          res.status(401).json({ error: 'No estás autorizado para cambiar los permisos de este workspace' });
          return;
      }
      const profile: mongoose.PopulatedDoc<IProfile> = workspace.profiles.find((profile: mongoose.PopulatedDoc<IProfile>) => profile && profile._id === profileId);
      if (!profile) {
          res.status(404).json({ error: 'El usuario no está en este workspace' });
          return;
      }
      if (profile instanceof mongoose.Document) {
        profile.wsPerm = perm;
        profile.save();
      }
      sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
      res.status(201).json(workspace);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const createInvitation = async (req: any, res: any) => {
  const wsId = req.body.workspace;
  const profile = req.body.profile;
  const linkDuration = req.body.linkDuration;
  try {
    const workspace = await Workspace.findOne({ _id: wsId });
    if (!workspace) {
      res.status(404).json({ error: 'No se ha encontrado el workspace' });
      return;
    }
    const reqPerm = await getWSPermission(req.user._id, wsId);
    if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
      res.status(401).json({ error: 'No estás autorizado para crear invitaciones en este workspace' });
      return;
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
        res.status(400).json({ error: 'Duración de la invitación no válida' });
        return;
    }
    const invitation = new Invitation({ code: code, workspace: wsId, profile: profile, expirationDate: expirationDate });
    await invitation.save();
    res.status(201).json({success: true, invitation: invitation});
  }
  catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export const getInvitations = async (req: any, res: any) => {
  const wsId = req.params.workspace;
  try {
    const workspace = await Workspace.findOne({ _id: wsId });
    if (!wsId) {
      res.status(400).json({ error: 'No se ha especificado el workspace' });
      return;
    }
    if (!workspace) {
      res.status(404).json({ error: 'No se ha encontrado el workspace' });
      return;
    }
    const reqPerm = await getWSPermission(req.user._id, wsId);
    if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
      res.status(401).json({ error: 'No estás autorizado para ver las invitaciones de este workspace' });
      return;
    }
    const invitations = await Invitation.find({ workspace: wsId }).populate('profile');
    res.status(200).json(invitations);
  }
  catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

export const toggleActiveInvitation = async (req: any, res: any) => {
  const invId = req.body.invId;
  try {
    const invitation: mongoose.Document<IInvitation> | null = await Invitation.findOne({ _id: invId });
    if (!invitation) {
      res.status(404).json({ error: 'No se ha encontrado la invitación' });
      return;
    }
    const wsId = invitation.get("workspace")._id.toString();
    const workspace = await Workspace.findOne({ _id: wsId });
    if (!workspace) {
      res.status(404).json({ error: 'No se ha encontrado el workspace' });
      return;
    }
    const reqPerm = await getWSPermission(req.user._id, wsId);
    if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
      res.status(401).json({ error: 'No estás autorizado para desactivar invitaciones en este workspace' });
      return;
    }
    invitation.set("active",!invitation.get("active"));
    await invitation.save();
    res.status(200).json({ message: 'Invitación '+ (invitation.get("active") ? 'activada' : 'desactivada') });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}


export const deleteInvitation = async (req: any, res: any) => {
  const invId = req.body.invId;
  try {
    const invitation = await Invitation.findOne({ _id: invId });
    if (!invitation) {
      res.status(404).json({ error: 'No se ha encontrado la invitación' });
      return;
    }
    const wsId = invitation.get("workspace")._id.toString();
    const workspace = await Workspace.findOne({ _id: wsId });
    if (!workspace) {
      res.status(404).json({ error: 'No se ha encontrado el workspace' });
      return;
    }
    const reqPerm = await getWSPermission(req.user._id, wsId);
    if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
      res.status(401).json({ error: 'No estás autorizado para borrar invitaciones en este workspace' });
      return;
    }
    console.log(invitation) 
    await invitation.deleteOne();
    res.status(200).json({ message: 'Invitación eliminada' });
  }
  catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

export const useInvitation = async (req: any, res: any) => {
  const code = req.params.code;
  try {
    const invitation = await Invitation.findOne({ code: code }).populate('profile').populate('workspace');
    if (!invitation) {
      res.status(404).json({ error: 'No se ha encontrado la invitación' });
      return;
    }
    if (!invitation.get("active")) {
      res.status(403).json({ error: 'La invitación ha sido desactivada' });
      return;
    }
    if (invitation.get("expirationDate") < new Date()) {
      res.status(403).json({ error: 'La invitación ha expirado' });
      return;
    }
    const profile = invitation.profile;
    const workspace = invitation.get("workspace");
    const user = req.user;
    const userProfile = new Profile({ name: user._id, profileType: ProfileType.Individual, wsPerm: WSPermission.Read, users: [user] });
    await userProfile.save();
    workspace.profiles.push(userProfile._id);
    await workspace.save();
    if (profile instanceof mongoose.Document){
      profile.set("users",profile.get("users").push(user));
      await profile.save();
    }
  }
  catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}








