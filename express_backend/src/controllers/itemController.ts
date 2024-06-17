import mongoose, { type Types } from 'mongoose';
import fs from 'fs';
import type { IUser } from '../models/user.ts';
import { type IProfile } from '../models/profile.ts';
import type { IProfilePerms } from '../models/profilePerms.ts';
import { ItemType, type IItem } from '../models/item.ts';
import { Permission } from '../models/profilePerms.ts';
import User from '../schemas/userSchema.ts';
import Workspace from '../schemas/workspaceSchema.ts';
import Item from '../schemas/itemSchema.ts';
import { CalendarItem, FileItem, FolderItem, NoteItem, NoticeItem, TimerItem } from '../schemas/itemSchema.ts';
import { getUserPermission } from '../utils/permsFunctions.ts';
import type { NextFunction } from 'express';
import Profile from '../schemas/profileSchema.ts';
import type { ICalendar, INote, INotice, ITimer } from '../models/typeItem.ts';
import { parseValidationError } from '../utils/errorParser.ts';
import { sendMessageToWorkspace } from '../config/websocket.ts';
import { updateFilesPath } from '../utils/updateFiles.ts';

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

            if (path != "/notices" && path != "" && (!existingFolder || existingFolder.path != folderPath) && !isRoot) {
                res.status(404).json({ error: 'No se ha encontrado la carpeta' });
                return;
            } else {
                let item;
                try {
                    switch (itemData.itemType) {
                        case ItemType.Folder:
                            item = new FolderItem();
                            break;
                        case ItemType.Timer:
                            item = new TimerItem({ duration: itemData.duration, remainingTime: itemData.duration, initialDate: new Date() });
                            break;
                        case ItemType.Note:
                            item = new NoteItem({ text: itemData.text });
                            break;
                        case ItemType.Notice:
                            item = new NoticeItem({ text: itemData.text, important: itemData.important });
                            break;
                        case ItemType.Calendar:
                            item = new CalendarItem({events:[]});
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
                const profile = await Profile.findOne({ name: req.user._id, _id : { $in: workspace.profiles }});
                item.profilePerms = [{ profile: new mongoose.Types.ObjectId(profile?._id), permission: Permission.Owner } as IProfilePerms];
                const perm = await getUserPermission(req.user._id, wsId);
                if (perm === Permission.Read || !perm) {
                    res.status(403).json({ error: 'No estás autorizado para añadir items a este workspace' });
                } else {
                    try {
                        await item.save();
                        workspace.items.push(item.id);
                        await workspace.save();
                        sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
                        res.status(201).json(item);
                    } catch (error) {
                        res.status(400).json({ errors: parseValidationError(error) });
                    }
                }
            }
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const editItem = async (req: any, res: any) => {
    const wsId = req.body.workspace;
    const itemData = req.body.item;
    const oldName = req.body.oldName;

    try {
        const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
        if (!workspace) {
            res.status(404).json({ error: 'No se ha encontrado el workspace' });
            return;
        }
        const item = (workspace.items as unknown as IItem[]).find((item: IItem) => item._id.toString() === itemData._id);
        if (!item) {
            res.status(404).json({ error: 'No se ha encontrado el item' });
            return;
        }
        const perm = await getUserPermission(req.user._id, wsId, itemData._id);
        if (!perm || perm === Permission.Read) {
            res.status(403).json({ error: 'No estás autorizado para editar este item' });
            return;
        }
        item.name = itemData.name;
        item.modifiedDate = new Date();
        item.path = itemData.path;

        switch (item.itemType) {
            case ItemType.Timer:
                (item as ITimer).duration = itemData.duration;
                (item as ITimer).remainingTime = itemData.remainingTime;
                (item as ITimer).initialDate = itemData.initialDate;
                break;
            case ItemType.Note:
                (item as INote).text = itemData.text;
                break;
            case ItemType.Notice:
                (item as INotice).text = itemData.text;
                (item as INotice).important = itemData.important;
                break;
            case ItemType.Calendar:
                (item as ICalendar).events = itemData.events;
                break;
            default:
                break;
        }
        try {
            item.validateSync();
            await item.save();

            if (item.itemType === ItemType.Folder && item.name !== oldName) {
                await updateFilesPath(item, oldName, wsId);
            }

        } catch (error) {
            res.status(400).json({ errors: parseValidationError(error) });
            return;
        }
        sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
        res.status(200).json(item);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const changeItemPerms = async (req: any, res: any) => {
    const { itemId, profileId, perm } = req.body;

    const wsId = req.body.workspace;
    try {
        const workspace = await Workspace.findOne({ _id: wsId }).populate('items').populate('profiles').populate('profiles.users').populate('items.profilePerms.profile');
        if (!workspace) {
            res.status(404).json({ error: 'No se ha encontrado el workspace' });
            return;
        }
        const item = await Item.findOne({ _id: itemId }).populate('profilePerms.profile');
        if (!item) {
            res.status(404).json({ error: 'No se ha encontrado el item' });
            return;
        }
        const reqPerm = await getUserPermission(req.user._id, wsId, itemId);
        if (reqPerm !== Permission.Owner) {
            res.status(403).json({ error: 'No estás autorizado para cambiar los permisos de este item' });
            return;
        }
        const profile  = workspace.profiles.find(profile => profile && profile._id.toString() === profileId) as IProfile;
        if (!profile) {
            res.status(404).json({ error: 'El perfil no existe en el workspace' });
            return;
        }
        const itemPerm = await getUserPermission(req.user._id, wsId, itemId);
        if (!itemPerm || (itemPerm !== Permission.Owner)) {
            res.status(403).json({ error: 'No tienes permiso para cambiar permisos' });
            return;
        }
        const profilePerms = item.profilePerms.filter((profilePerm: IProfilePerms) =>{
            return profilePerm.profile?._id.toString() !== profile._id.toString();

        });
        if (perm !== "None") {
            const newProfilePerm = item.profilePerms.create({
                profile: profile._id,
                permission: perm
            });
            profilePerms.push(newProfilePerm);
        }

        item.profilePerms = profilePerms as Types.DocumentArray<IProfilePerms>;
        await item.save();
        await workspace.save();
        sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
        res.status(201).json(item);
    } catch (error: any) {
        res.status(500).json({ error: error.message }); 
    }
};

export const createFile = async (req: any, _: any, next: NextFunction) => {
    try{
        const profile = await Profile.findOne({ name: req.user._id });
        const item = new FileItem({ name: new mongoose.Types.ObjectId, path: "temp_path", itemType: ItemType.File, length: 0, uploadDate: new Date(), modifiedDate: new Date(), profilePerms: [{ profile: profile?._id, permission: Permission.Owner }] });
        await item.save();
        req.params.itemId = item.id;
        next();
    } catch (error) {
        next(error);
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
            res.status(403).json({ error: 'No estás autorizado para ver este archivo' });
            return;
        }
        if (fs.existsSync(`uploads/${wsId}/${fileId}`)) {
            const encodedFileName = encodeURIComponent(file.name);
            res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
      
            const fileStream = fs.createReadStream(`uploads/${wsId}/${fileId}`);
      
            fileStream.on('error', (_) => {
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
            res.status(403).json({ error: 'No estás autorizado para borrar este item' });
            return;
        }
        (workspace.items as unknown as IItem[]) = (workspace.items as unknown as IItem[]).filter((item: IItem) => item._id.toString() !== itemId);
        await Item.deleteOne({ _id: itemId });
        await workspace.save();
        if (item.itemType === ItemType.File) {
            fs.unlink(`uploads/${wsId}/${itemId}`, () => { });
        }
        sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
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
            res.status(403).json({ error: 'No estás autorizado para ver este archivo' });
            return;
        }
        const user = await User.findOne({ _id: loggedUser._id }).exec();
        if (!user) {
            res.status(404).json({ error: 'No se ha encontrado el usuario' });
            return;
        }
        const liked = user.favorites.includes(itemId);
        if (liked) {
            user.favorites  = user.favorites.filter((fav: mongoose.Types.ObjectId | mongoose.PopulatedDoc<IItem>) => fav instanceof mongoose.Types.ObjectId && fav.toString() !== itemId);
        } else {
            user.favorites.push(itemId);
        }
        await User.updateOne({ _id: loggedUser._id }, { $set: { favorites: user.favorites } });
        !liked ? res.json({ success: true, message: 'Item ' + itemId + ' marcado como favorito' }) : res.json({ success: true, message: 'Item ' + itemId + ' desmarcado como favorito' });

    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
};