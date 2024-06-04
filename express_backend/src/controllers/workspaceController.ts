import type { IProfile } from '../models/profile.ts';
import { ProfileType, WSPermission } from '../models/profile.ts';
import Workspace, { Profile } from '../schemas/workspaceSchema.ts';
import User from '../schemas/userSchema.ts';
import { parseValidationError } from '../utils/errorParser.ts';
import { getWSPermission } from '../utils/permsFunctions.ts';
import { ItemType, type IItem } from '../models/item.ts';
import { Permission } from '../models/profilePerms.ts';
import type { IProfilePerms } from '../models/profilePerms.ts';
import type mongoose from 'mongoose';
import type { IUser } from '../models/user.ts';
import fs from 'fs';

export const getWorkspace = async (req: any, res: any) => {
  try {
    const wsId = req.query.wsId;
    if (!wsId) {
      const workspace = await Workspace.findOne({
        default: true, profiles: {
          $elemMatch: {
            name: req.user._id.toString(),
            wsPerm: WSPermission.Owner
          }
        }
      }).populate('items');
      res.status(200).json(workspace);
      return;
    } else {
      const workspace = await Workspace.findOne({ _id: wsId });
      if (workspace) {
        if (workspace.profiles.find((profile: IProfile) => profile.name == req.user._id.toString())) {
          workspace.populate('items');
          res.status(200).json(workspace);
        } else {
          res.status(401).json({ error: 'No estás autorizado para ver ese workspace' });
        }
      } else {
        res.status(404).json({ error: 'No se ha encontrado el workspace' });
      }
    }
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getWorkspaceNotices = async (req: any, res: any) => {
  try {
    const wsId = req.body.wsId;
    if (!wsId) {
      res.status(400).json({ error: 'No se ha especificado el workspace' });
      return;
    }

    const workspace = await Workspace.findOne({
      _id: wsId,
      profiles: {
        $elemMatch: {
          users: req.user._id,
        }
      }
    }).populate('items');

    if (!workspace) {
      res.status(404).json({ error: 'No se ha encontrado el workspace / No estás autorizado para ver ese workspace' });
      return;
    }

    const notices : IItem[] = (workspace.items as unknown as IItem[]).filter((item: IItem) => item.itemType == ItemType.Notice);
    const noticesWithOwner : any[] = [];

    for (let i = 0; i < notices.length; i++) {
      const userId = ((notices[i] as unknown as IItem).profilePerms.find((profile: IProfilePerms) => profile.permission == Permission.Owner)?.profile as unknown as mongoose.Types.ObjectId).toString();
      const owner = (await User.findById(userId).exec()) as IUser;
      noticesWithOwner.push({ notice: notices[i], owner: { username: owner.username, email: owner.email }});
    }

    const folders = (workspace.items as unknown as IItem[]).filter((item: IItem) => item.itemType == ItemType.Folder);
    res.status(200).json({_id: workspace._id, notices: noticesWithOwner, folders: folders, profiles: workspace.profiles, name: workspace.name});
    return;

  } catch (error: any) {
    res.status(404).json({ error: error.message });
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

  const profiles = workspace.profiles.filter((profile: IProfile) => profile.name !== user._id.toString());
    if (perm !== "None") {
        workspace.profiles.push(new Profile({ name: user._id, profileType: ProfileType.Individual, wsPerm: perm, users: [user] }));
    }
    workspace.profiles = profiles;
    await workspace.save();

  res.status(201).json(workspace);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};
