import type { IProfile } from '../models/profile.ts';
import { ItemType, type IItem } from '../models/item.ts';
import { ProfileType, WSPermission } from '../models/profile.ts';
import type { IProfilePerms } from '../models/profilePerms.ts';
import { Permission } from '../models/profilePerms.ts';
import type { IUser } from '../models/user.ts';
import { CalendarItem, EventItem, FileItem, FolderItem, NoteItem, NoticeItem, StudySessionItem, TimerItem } from '../schemas/itemSchema.ts';
import Workspace, { Profile } from '../schemas/workspaceSchema.ts';
import { Item } from '../schemas/itemSchema.ts';
import User from '../schemas/userSchema.ts';
import { parseValidationError } from '../utils/errorParser.ts';
import { getUserPermission, getWSPermission } from '../utils/permsFunctions.ts';
import mongoose from 'mongoose';
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
    res.status(201).json(workspace);
  } catch (error: any) {
    res.status(409).json({ error: error.message });
  }
};

export const addUserToWorkspace = async (req: any, res: any) => {
  const wsId = req.body.wsId;
  const username = req.body.username;
  const perm = req.body.perm;
  try{
    const workspace = await Workspace.findOne({ _id: wsId });
  if (!workspace) {
    res.status(404).json({ error: 'No se ha encontrado el workspace' });
    return;
  } 
  const reqPerms = await getWSPermission(req.user._id, wsId);
  if (!([WSPermission.Owner, WSPermission.Admin].find(x => x == reqPerms))) {
    console.log(await getWSPermission(req.user._id, wsId));
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
  }catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

export const addItemToWorkspace = async (req: any, res: any) => {

  const wsId = req.body.workspace;
  const path = req.body.path ? req.body.path : "";
  const itemData = req.body.item;
  try {
    const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
    if (!workspace) {
      res.status(404).json({ error: 'No se ha encontrado el workspace' });
    }
    else {
      const folders = path.split('/');
      const folder = folders[folders.length - 1];
      const isRoot = folder == wsId
      const existingFolder = (workspace.items as unknown as IItem[]).find((item: IItem) => item.name === folder && item.itemType === ItemType.Folder);
      const folderPath = folders.slice(0, -1).join('/');

      if (path != "" && (!existingFolder || existingFolder.path != folderPath) && !isRoot) {
        res.status(404).json({ error: 'No se ha encontrado la carpeta' });
        return;
      } else {
        const existingItem = (workspace.items as unknown as IItem[]).find((item: IItem) => item.name === itemData.name && item.itemType === itemData.itemType);
        if (existingItem) {
          res.status(409).json({ error: 'Ya existe un item con ese nombre' });
          return;
        } else {
          let item;
          try {
            switch (itemData.itemType) {
              case ItemType.Folder:
                item = new FolderItem();
                break;
              case ItemType.Timer:
                item = new TimerItem({ duration: itemData.duration, remainingTime: itemData.remainingTime, initialDate: itemData.initialDate });
                break;
              case ItemType.Note:
                item = new NoteItem({ text: itemData.text });
                break;
              case ItemType.Notice:
                item = new NoticeItem({ text: itemData.text, important: itemData.important });
                break;
              case ItemType.Calendar:
                item = new CalendarItem({}); // TODO
                break;
              case ItemType.Event:
                item = new EventItem({ event: { initDate: itemData.initDate, finalDate: itemData.finalDate } });
                break;
              case ItemType.StudySession:
                item = new StudySessionItem({}); // TODO
                break;
              default:
                res.status(400).json({ error: 'Tipo de item no válido' });
                return;
            }
          } catch (error) {
            res.status(400).json({ error: 'Los atributos del item no son válidos' });
            return;
          }

          item.name = itemData.name;
          item.path = path;
          item.itemType = itemData.itemType;
          item.uploadDate = new Date();
          item.modifiedDate = new Date();
          item.profilePerms = [{ profile: req.user._id, permission: Permission.Owner } as IProfilePerms];
          const perm = await getUserPermission(req.user._id, wsId);
          if (perm === Permission.Read || !perm) {
            res.status(401).json({ error: 'No estás autorizado para añadir items a este workspace' });
          } else {
            await item.save();
            workspace.items.push(item.id);
            await workspace.save();
            res.status(201).json(item);
          }
        }
      }
    }
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

export const changePerms = async (req: any, res: any) => {
  const { fileId, username, perm } = req.body;
  const wsId = req.body.workspace;
  try {
    const workspace= await Workspace.findOne({ _id: wsId }).populate('items');
    if (!workspace) {
      res.status(404).json({ error: 'No se ha encontrado el workspace' });
      return;
    }
    const item = (workspace.items as unknown as IItem[]).find((item: IItem) => item._id.toString() === fileId);
    if (!item) {
      res.status(404).json({ error: 'No se ha encontrado el item' });
      return;
    }
    const reqPerm = await getUserPermission(req.user._id, wsId, fileId);
    if (reqPerm !== Permission.Owner) {
      res.status(401).json({ error: 'No estás autorizado para cambiar los permisos de este item' });
      return;
    }
    const profile = workspace.profiles.find((profile: IProfile) => profile.name === username);
    if (!profile) {
      res.status(404).json({ error: 'El usuario no está en este workspace' });
      return;
    }
    const profilePerms = item.profilePerms.filter((profilePerm: IProfilePerms) => profilePerm.profile.toString() !== profile._id.toString());
    if (perm !== "None") {
        item.profilePerms.push({ profile: profile, permission: perm });
    }
    item.profilePerms = profilePerms;
    await workspace.save();
    res.status(201).json(item);
  }
  catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

export const downloadFile = async (req: any, res: any) => 
{
  const wsId = req.query.workspace;
  const fileId = req.query.fileId;
  try {
    const workspace = await Workspace.findOne({ _id: wsId });
    if (!workspace) {
      res.status(404).json({ error: 'No se ha encontrado el workspace' });
      return;
    }
    const file = await FileItem.findOne({ _id: fileId });
    if (!file) {
      res.status(404).json({ error: 'No se ha encontrado el archivo' });
      return;
    }
    const perm = await getUserPermission(req.user._id, wsId, fileId);
    if (!perm) {
      res.status(401).json({ error: 'No estás autorizado para ver este archivo' });
      return;
    }
    if (fs.existsSync(`uploads/${wsId}/${fileId}`)) {
        res.setHeader('Content-disposition', `attachment; filename=${file.name}`);
        res.setHeader('Content-type', 'application/octet-stream');

        const fileStream = fs.createReadStream(`uploads/${wsId}/${fileId}`);
        fileStream.pipe(res);
    } else {
        res.status(404).json({ success: false, error: 'El archivo no existe'} );
    }
  }
  catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

export const deleteItemFromWorkspace = async (req: any, res: any) => {
  const wsId = req.body.workspace;
  const fileId = req.body.fileId;
  try {
    const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
    if (!workspace) {
      res.status(404).json({ error: 'No se ha encontrado el workspace' });
      return;
    }
    const item = (workspace.items as unknown as IItem[]).find((item: IItem) => item._id.toString() === fileId);
    if (!item) {
      res.status(404).json({ error: 'No se ha encontrado el item' });
      return;
    }
    const perm = await getUserPermission(req.user._id, wsId, fileId);
    console.log(perm);
    if (![Permission.Owner, Permission.Write].find(x => x == perm)){
      res.status(401).json({ error: 'No estás autorizado para borrar este item' });
      return;
    }
    (workspace.items as unknown as IItem[]) = (workspace.items as unknown as IItem[]).filter((item: IItem) => item._id.toString() !== fileId);
    await Item.deleteOne({ _id: fileId });
    await workspace.save();
    fs.unlink(`uploads/${wsId}/${fileId}`, ()=>{});
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

export const toggleFavorite = async (req: any, res: any) => {
  const wsId = req.body.workspace;
  const { fileId } = req.body;
  const user = req.user as IUser;
  try {
    const item = await FileItem.findOne({ _id: fileId });
    if (!item) {
      res.status(404).json({ error: 'No se ha encontrado el archivo' });
      return;
    }
    const perm = await getUserPermission(user._id, wsId, fileId);
    if (!perm) {
      res.status(401).json({ error: 'No estás autorizado para ver este archivo' });
      return;
    }
    const liked = user.favorites.includes(fileId);
    user.favorites = user.favorites.filter((fav: mongoose.Types.ObjectId) => fav.toString() !== fileId);
    user.favorites.push(fileId);
    await user.save();

    liked?res.json({ success: true, message: 'Archivo '+ fileId + ' marcado como favorito'}):res.json({ success: true, message: 'Archivo '+ fileId + ' desmarcado como favorito'});

  } catch(error: any) {
    res.status(404).json({ error: error.message });
  }
}