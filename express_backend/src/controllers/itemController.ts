import mongoose from 'mongoose';
import fs from 'fs';
import type { IUser } from '../models/user.ts';
import type { IProfile } from '../models/profile.ts';
import type { IProfilePerms } from '../models/profilePerms.ts';
import { ItemType, type IItem } from '../models/item.ts';
import { Permission } from '../models/profilePerms.ts';
import User from '../schemas/userSchema.ts';
import Workspace from '../schemas/workspaceSchema.ts';
import Item from '../schemas/itemSchema.ts';
import { CalendarItem, EventItem, FileItem, FolderItem, NoteItem, NoticeItem, StudySessionItem, TimerItem } from '../schemas/itemSchema.ts';
import { getUserPermission } from '../utils/permsFunctions.ts';
import { randomInt } from 'crypto';
import type { NextFunction } from 'express';

export const addItemToWorkspace = async (req: any, res: any) => {

    const wsId = req.body.workspace;
    const path = req.body.path ? req.body.path : "";
    const itemData = req.body.item;
    try {
        const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
        if (!workspace) {
            res.status(404).json({ error: 'No se ha encontrado el workspace' });
        } else {
            const folders = path.split('/');
            const folder = folders[folders.length - 1];
            const isRoot = folder == wsId;
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
};

export const changePerms = async (req: any, res: any) => {
    const { fileId, username, perm } = req.body;
    const wsId = req.body.workspace;
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
    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
};

export const createFile = async (req: any, _: any, next: NextFunction) => {
    try{
        const item = new FileItem({ name: new mongoose.Types.ObjectId, path: "temp_path", itemType: ItemType.File, length: 0, uploadDate: new Date(), modifiedDate: new Date(), profilePerms: [{ profile: req.user._id, permission: Permission.Owner }] });
        await item.save();
        req.params.itemId = item.id;
        next();
    } catch (error) {
        console.log(error);
    }
};

export const downloadFile = async (req: any, res: any) => {
    const wsId = req.body.workspace;
    const fileId = req.body.fileId;
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
            const encodedFileName = encodeURIComponent(file.name);
            res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
      
            const fileStream = fs.createReadStream(`uploads/${wsId}/${fileId}`);
      
            fileStream.on('error', (err) => {
              res.status(500).json({ success: false, error: 'Error al leer el archivo' });
            });
      
            fileStream.pipe(res).on('finish', () => {
                
            });
          
        } else {
            res.status(404).json({ success: false, error: 'El archivo no existe' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteItemFromWorkspace = async (req: any, res: any) => {
    const wsId = req.body.workspace;
    const itemId = req.body.itemId;
    try {
        const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
        if (!workspace) {
            res.status(404).json({ error: 'No se ha encontrado el workspace' });
            return;
        }
        const item = (workspace.items as unknown as IItem[]).find((item: IItem) => item._id.toString() === itemId);
        if (!item) {
            res.status(404).json({ error: 'No se ha encontrado el item' });
            return;
        }
        const perm = await getUserPermission(req.user._id, wsId, itemId);

        if (![Permission.Owner, Permission.Write].find(x => x == perm)) {
            res.status(401).json({ error: 'No estás autorizado para borrar este item' });
            return;
        }
        (workspace.items as unknown as IItem[]) = (workspace.items as unknown as IItem[]).filter((item: IItem) => item._id.toString() !== itemId);
        await Item.deleteOne({ _id: itemId });
        await workspace.save();
        if (item.itemType === ItemType.File) {
          fs.unlink(`uploads/${wsId}/${itemId}`, () => { });
        }
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
};

export const toggleFavorite = async (req: any, res: any) => {
    const wsId = req.body.workspace;
    const { itemId } = req.body;
    const loggedUser = req.user as IUser;
    try {
        const item = await Item.findOne({ _id: itemId });
        if (!item) {
            res.status(404).json({ error: 'No se ha encontrado el item' });
            return;
        }
        const perm = await getUserPermission(loggedUser._id, wsId, itemId);
        if (!perm) {
            res.status(401).json({ error: 'No estás autorizado para ver este archivo' });
            return;
        }
        const user = await User.findOne({ _id: loggedUser._id }).exec();
        if (!user) {
            res.status(404).json({ error: 'No se ha encontrado el usuario' });
            return;
        }
        const liked = user.favorites.includes(itemId);
        if (liked) {
          (user.favorites as mongoose.Types.ObjectId[]) = user.favorites.filter((fav: mongoose.Types.ObjectId) => fav.toString() !== itemId);
        } else {
          user.favorites.push(itemId);
        }
        await User.updateOne({ _id: loggedUser._id }, { $set: {favorites: user.favorites} });
        !liked ? res.json({ success: true, message: 'Item ' + itemId + ' marcado como favorito' }) : res.json({ success: true, message: 'Item ' + itemId + ' desmarcado como favorito' });

    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
};