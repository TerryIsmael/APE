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
  const wsId = req.body.wsId;
  const username = req.body.username;
  const perm = req.body.perm;
  try {
    const workspace = await Workspace.findOne({ _id: wsId });
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
        res.status(401).json({ error: 'No estás autorizado a cambiar los permisos de este workspace' });
        return;
      }
      if (reqPerm === WSPermission.Admin && (perm === WSPermission.Owner || perm === WSPermission.Admin)) {
        res.status(401).json({ error: 'No estás autorizado a cambiar los permisos de otros administradores' });
        return;
      }
      const profile: mongoose.PopulatedDoc<IProfile> = workspace.profiles.find((profile: mongoose.PopulatedDoc<IProfile>) => profile && profile._id.toString() === profileId.toString());
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

export const saveProfile = async (req: any, res: any) => {
  const wsId = req.body.wsId;
  const newProfileData : IProfile = req.body.profile;

  try {
    const workspace = await Workspace.findOne({ _id: wsId }).populate('profiles');
    if (!workspace) {
      res.status(404).json({ error: 'No se ha encontrado el workspace' });
      return;
    }

    const reqPerm = await getWSPermission(req.user._id, wsId);
    if (reqPerm !== WSPermission.Owner && reqPerm !== WSPermission.Admin) {
      res.status(401).json({ error: 'No estás autorizado a crear o editar perfiles' });
      return;
    }

    if (!newProfileData) {
      res.status(400).json({ error: 'No se ha especificado el perfil' });
      return;
    }

    if (reqPerm === WSPermission.Admin && (newProfileData.wsPerm === WSPermission.Owner || newProfileData.wsPerm === WSPermission.Admin)) {
      res.status(401).json({ error: 'No estás autorizado a poner el permiso de administrador o propietario' });
      return;
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
        res.status(404).json({ error: `Hay usuarios que no existen en el workspace` });
        return;
      }
    }

    if (newProfileData._id) {
      const newProfile = await Profile.findOne({ _id: newProfileData._id });
      if (!newProfile) {
        res.status(404).json({ error: 'No se ha encontrado el perfil' });
        return;
      } 
      newProfile.name = newProfileData.name;
      newProfile.profileType = newProfileData.profileType;
      newProfile.wsPerm = newProfileData.wsPerm;
      newProfile.users = areInWorkspace;
      await newProfile.save();
    } else {
      const newProfile = new Profile({ _id: newProfileData._id, name: newProfileData.name, profileType: newProfileData.profileType, wsPerm: newProfileData.wsPerm, users: areInWorkspace});
      await newProfile.save();
      workspace.profiles.push(newProfile._id);
    }

    await workspace.save();
    await sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
    res.status(201).json(workspace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};