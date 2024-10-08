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
import type { ICalendar, IFile, INote, INotice, ITimer } from '../models/typeItem.ts';
import { parseValidationError } from '../utils/errorParser.ts';
import { sendMessageToWorkspace } from '../config/websocket.ts';
import { deleteFolderItems, updateFilesPath } from '../utils/updateFiles.ts';
import mammoth from 'mammoth';
import { promisify } from 'util';
import { asBlob } from 'html-docx-js-typescript';

interface WriteOperation {
    newContent: string;
    resolve: (value?: void | PromiseLike<void>) => void;
    reject: (reason?: any) => void;
}

const fileQueues: { [filePath: string]: WriteOperation[] } = {};

const openAsync = promisify(fs.open);

export const addItemToWorkspace = async (req: any, res: any) => {

    const wsId = req.body.workspace;
    const itemData = req.body.item;

    if (!wsId || !itemData) {
        const missingFields = [!wsId?"workspace":null, !itemData?"item":null].filter((field) => field !== null).join(', ');
        return res.status(400).json({ error: 'No se han especificado el/los campo(s) ' + missingFields });
    }

    try {
        const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
        if (!workspace) {
            return res.status(404).json({ error: 'No se ha encontrado el workspace' });
        }
        let path = req.body.item.path ? req.body.item.path : "";
        if (req.body.item.itemType == ItemType.Notice){
            path = "/notices";
        }
        const folders = path.split('/');
        const folder = folders[folders.length - 1];
        const existingFolder = (workspace.items as unknown as IItem[]).find((item: IItem) => item.name === folder && item.itemType === ItemType.Folder);
        const folderPath = folders.slice(0, -1).join('/');

        if (path != "/notices" && path != "" && (!existingFolder || existingFolder.path != folderPath)) {
            return res.status(404).json({ error: 'No se ha encontrado la carpeta' });
        }

        const perm = await getUserPermission(req.user._id, wsId, existingFolder?._id.toString());
        if (perm === Permission.Read || !perm) {
            return res.status(403).json({ error: 'No estás autorizado para añadir items en este directorio' });
        } 

        const existingItem = (workspace.items as unknown as IItem[]).find((item: IItem) => item.name === itemData.name && item.path === path);
        if (existingItem) {
            return res.status(409).json({ error: 'No puede haber 2 items con el mismo nombre en una ruta' });
        }

        let item;
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
                item = new CalendarItem({ events: [] });
                break;
            default:
                return res.status(400).json({ error: 'Tipo de item no válido' });
        }

        item.name = itemData.name;
        item.path = path;
        item.itemType = itemData.itemType;
        item.uploadDate = new Date();
        item.modifiedDate = new Date();
        const profile = await Profile.findOne({ name: req.user._id, _id : { $in: workspace.profiles }});
        item.profilePerms = [{ profile: new mongoose.Types.ObjectId(profile?._id), permission: Permission.Owner } as IProfilePerms];
        
        try {
            await item.validate();                
        } catch (error) {
            return res.status(400).json({ errors: parseValidationError(error) });
        }

        await item.save();
        workspace.items.push(item.id);
        await workspace.save();
        sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
        res.status(201).json(item);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const editItem = async (req: any, res: any) => {
    const wsId = req.body.workspace;
    const itemData = req.body.item;

    if (!wsId || !itemData) {
        const missingFields = [!wsId?"workspace":null, !itemData?"item":null].filter((field) => field !== null).join(', ');
        return res.status(400).json({ error: 'No se han especificado el/los campo(s) '+ missingFields });
    }

    try {
        const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
        if (!workspace) {
            return res.status(404).json({ error: 'No se ha encontrado el workspace' });
        }
        const item = (workspace.items as unknown as IItem[]).find((item: IItem) => item._id.toString() === itemData._id);
        if (!item) {
            return res.status(404).json({ error: 'No se ha encontrado el item' });
        }
        const oldName = item.name;
        const perm = await getUserPermission(req.user._id, wsId, itemData._id);
        if (!perm || perm === Permission.Read) {
            return res.status(403).json({ error: 'No estás autorizado para editar este item' });
        }

        if (itemData.itemType && itemData.itemType !== item.itemType) {
            return res.status(400).json({ error: 'No se puede cambiar el tipo de item' });
        }

        item.name = itemData.name;
        item.modifiedDate = new Date();
        item.path = itemData.path;
        item.itemType = itemData.itemType;

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
            await item.validate();
        } catch (error) {
            return res.status(400).json({ errors: parseValidationError(error) });
        }
        await item.save();
        if (item.itemType === ItemType.Folder && item.name !== oldName) {
            await updateFilesPath(item, oldName, wsId);
        }
        
        sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
        res.status(200).json(item);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const editFile = async (req: any, res: any) => {
    const wsId = req.body.workspace;
    const fileId = req.body.fileId;

    if (!wsId || !fileId) {
        const missingFields = [!wsId?"workspace":null, !fileId?"fileId":null].filter((field) => field !== null).join(', ');
        return res.status(400).json({ error: 'No se han especificado el/los campo(s) '+ missingFields });
    }

    try {
        const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
        if (!workspace) {
            return res.status(404).json({ error: 'No se ha encontrado el workspace' });
        }
        const item = (workspace.items as unknown as IItem[]).find((item: IItem) => item._id.toString() === fileId);
        if (!item) {
            return res.status(404).json({ error: 'No se ha encontrado el item' });
        }
        const perm = await getUserPermission(req.user._id, wsId, item._id);
        if (!perm || perm === Permission.Read) {
            return res.status(403).json({ error: 'No estás autorizado para editar este item' });
        }

        replaceFileContent(`uploads/${wsId}/${fileId}`, req.body.content, req.body.workspace);

        sendMessageToWorkspace(req.body.workspace, { type: 'workspaceUpdated' });
        res.status(200).json({ success: true, message: 'Archivo editado exitosamente' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al subir el archivo. ' + error });
    }
}

async function replaceFileContent(filePath: string, newContent: string, workspace: string): Promise<void> {
    if (!fileQueues[filePath]) {
        fileQueues[filePath] = [];
    }

    return new Promise((resolve, reject) => {
        fileQueues[filePath].push({ newContent, resolve, reject });
        if (fileQueues[filePath].length === 1) {
            processQueue(filePath);
            sendMessageToWorkspace(workspace, { type: 'workspaceUpdated' });
        }
    });
}

async function processQueue(filePath: string): Promise<void> {
    const queue = fileQueues[filePath];
    if (queue.length === 0) {
        return;
    }

    const { newContent, resolve, reject } = queue[0];
    const lockFilePath = `${filePath}.lock`;

    try {
        const lockFd = await openAsync(lockFilePath, 'wx'); 

        try {
            await fs.promises.writeFile(filePath, newContent, 'utf8');
            resolve();
        } finally {
            fs.close(lockFd);
            await fs.promises.unlink(lockFilePath);
        }
    } catch (error: any) {
        if (error.code === 'EEXIST') {
            setTimeout(() => processQueue(filePath), 100);
        } else {
            console.error(`Error al reemplazar el contenido del archivo ${filePath}:`, error);
            reject(error);
        }
    } finally {
        queue.shift();
        if (queue.length > 0) {
            processQueue(filePath);
        } else {
            delete fileQueues[filePath];
        }
    }
}

export const changeItemPerms = async (req: any, res: any) => {
    const { itemId, profileId, perm } = req.body;
    const wsId = req.body.workspace;

    if (!wsId || !itemId || !profileId || !perm) {
        const missingFields = [!wsId?"workspace":null, !itemId?"itemId":null, !profileId?"profileId":null, !perm?"perm":null].filter((field) => field !== null).join(', ');
        return res.status(400).json({ error: 'No se han especificado el/los campo(s) '+ missingFields });
    }
    if (![...Object.values(Permission), "None"].filter( (x: String) => x != "Owner").includes(perm)) {
        return res.status(400).json({ error: 'El permiso del archivo debe ser Read, Write, o None para eliminar el permiso' });
    }
    try {
        const workspace = await Workspace.findOne({ _id: wsId }).populate('items').populate('profiles').populate('profiles.users').populate('items.profilePerms.profile');
        if (!workspace) {
            return res.status(404).json({ error: 'No se ha encontrado el workspace' });
        }
        const item = await Item.findOne({ _id: itemId }).populate('profilePerms.profile');
        if (!item) {
            return res.status(404).json({ error: 'No se ha encontrado el item' });
        }
        const reqPerm = await getUserPermission(req.user._id, wsId, itemId);
        if (!reqPerm || (reqPerm !== Permission.Owner)) {
            return res.status(403).json({ error: 'No estás autorizado para cambiar los permisos de este item' });
        }
        const profile  = workspace.profiles.find(profile => profile && profile._id.toString() === profileId) as IProfile;
        if (!profile) {
            return res.status(404).json({ error: 'El perfil no existe en el workspace' });
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
        
        try{
            await item.validate();
        } catch (error) {
            return res.status(400).json({ errors: parseValidationError(error) });
        }
        await item.save();
        await workspace.save();
        sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
        res.status(200).json(item);
    } catch (error: any) {
        res.status(500).json({ error: error.message }); 
    }
};

export const createFile = async (req: any, _: any, next: NextFunction) => {
    try{
        const profile = await Profile.findOne({ name: req.user._id });
        const item = new FileItem({ name: new mongoose.Types.ObjectId, path: "temp_path", itemType: ItemType.File, uploadDate: new Date(), modifiedDate: new Date(), profilePerms: [{ profile: profile?._id, permission: Permission.Owner }] });
        await item.save();
        req.params.itemId = item.id;
        next();
    } catch (error) {
        next(error);
    }
};

export const saveFile = async (req: any, res: any) => {
    const wsId = req.body.workspace;
    try {
        const item = await FileItem.findOne({ _id: req.params.itemId }).exec();
        if (!item) {
            return res.status(404).json({ success: false, error: 'Archivo no encontrado' });
        }
        item.name = req.file?req.file.originalname:item.name;
        item.path = req.file?req.body.path:"";
        const workspace = await (await Workspace.findOne({ _id: req.body.workspace }).exec())?.populate('items');
        workspace?.items.push(item._id);
        await workspace?.save();
        if (!['docx'].includes(req.file.originalname.split('.').pop())) {
            item.ready = true;
            await item.save();
        }else{
            await item.save();
            processFile(wsId, item).then(() => { }, (error) => {
                item.deleteOne();
                if (error !== 'El archivo no existe') {
                    fs.unlink(`uploads/${wsId}/temp/${item._id}`, () => { });
                }
                
            }).finally(() => {
                sendMessageToWorkspace(req.body.workspace, { type: 'workspaceUpdated' });
                
            });
        }
        sendMessageToWorkspace(req.body.workspace, { type: 'workspaceUpdated' });
        res.status(200).json({ success: true, message: 'Archivo subido exitosamente' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al subir el archivo. ' + error });
    }
};

const processFile = async (wsId: string, item: mongoose.Document<unknown, {}, IFile> & IFile & Required<{_id: Types.ObjectId;}>) => {
    try{
        if (!fs.existsSync(`uploads/${wsId}/temp/${item._id}`)) {
            return Promise.reject('El archivo no existe');
        }
    const result = await mammoth.convertToHtml({ path: `uploads/${wsId}/temp/${item._id}` });
    const html = result.value;
    fs.writeFileSync(`uploads/${wsId}/${item._id}`, html);
    fs.unlinkSync(`uploads/${wsId}/temp/${item._id}`);
    item.ready = true;
    item.save();
    return Promise.resolve();
    }catch (error){
        return Promise.reject('Error al procesar el archivo'+error);
    }
};

export const downloadFile = async (req: any, res: any) => {
    const wsId = req.body.workspace;
    const fileId = req.body.fileId;
    const editorMode = req.body.editorMode;

    if (!wsId || !fileId) {
        const missingFields = [!wsId?"workspace":null, !fileId?"fileId":null].filter((field) => field !== null).join(', ');
        return res.status(400).json({ error: 'No se han especificado el/los campo(s) '+ missingFields });
    }

    try {
        const workspace = await Workspace.findOne({ _id: wsId });
        if (!workspace) {
            return res.status(404).json({ error: 'No se ha encontrado el workspace' });
        }
        const file = await FileItem.findOne({ _id: fileId });
        if (!file) {
            return res.status(404).json({ error: 'No se ha encontrado el archivo' });
        }
        const perm = await getUserPermission(req.user._id, wsId, fileId);
        if (!perm) {
            return res.status(403).json({ error: 'No estás autorizado para ver este archivo' });
        }
        try{
            await fs.promises.access(`uploads/${wsId}/${fileId}.lock`);
            return res.status(409).json({ error: 'El archivo está siendo editado o procesado en estos momentos' });
        }catch{

        }

        if (fs.existsSync(`uploads/${wsId}/${fileId}`)) {
            const encodedFileName = encodeURIComponent(fileId);
            if(file.name.split('.').pop() === 'docx' && !editorMode){
                const htmlString = await fs.promises.readFile(`uploads/${wsId}/${fileId}`, 'utf8')
                const docxBlob = await asBlob(htmlString, {});
                

                res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"`);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

                res.send(docxBlob);
            }else{
                res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"`);
                res.setHeader('Content-Type', 'application/octet-stream');
        
                const fileStream = fs.createReadStream(`uploads/${wsId}/${fileId}`);
        
                fileStream.on('error', (_) => {
                res.status(500).json({ success: false, error: 'Error al leer el archivo' });
                });
                fileStream.pipe(res).on('finish', () => {
                });
            }
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
    const check = req.body.check;

    if (!wsId || !itemId) {
        const missingFields = [!wsId?"workspace":null, !itemId?"itemId":null].filter((field) => field !== null).join(', ');
        return res.status(400).json({ error: 'No se han especificado el/los campo(s) '+ missingFields });
    }

    try {
        const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
        if (!workspace) {
            return res.status(404).json({ error: 'No se ha encontrado el workspace' });
        }
        const item = (workspace.items as unknown as IItem[]).find((item: IItem) => item._id.toString() === itemId);
        if (!item) {
            return res.status(404).json({ error: 'No se ha encontrado el item' });
        }
        const perm = await getUserPermission(req.user._id, wsId, itemId);

        if (![Permission.Owner, Permission.Write].find(x => x == perm)) {
            return res.status(403).json({ error: 'No estás autorizado para borrar este item' });
        }
        (workspace.items as unknown as IItem[]) = (workspace.items as unknown as IItem[]).filter((item: IItem) => item._id.toString() !== itemId);
        if (item.itemType === ItemType.File) {
            fs.unlink(`uploads/${wsId}/${itemId}`, () => { });
        } else if (item.itemType === ItemType.Folder) {
            const isThereItemsOfAnother = await deleteFolderItems(req.user._id, item, wsId, check);
            if (check){
                return isThereItemsOfAnother? res.status(409).json({ error: 'Hay items de otros usuarios en este directorio' }): res.status(200).json({ success: true });
            }
        }
        if (!check) {
            await Item.deleteOne({ _id: itemId });
            await workspace.save();
            sendMessageToWorkspace(wsId, { type: 'workspaceUpdated' });
            res.status(200).json({ success: true });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const toggleFavorite = async (req: any, res: any) => {
    const wsId = req.body.workspace;
    const { itemId } = req.body;
    const loggedUser = req.user as IUser;

    if (!wsId || !itemId) {
        const missingFields = [!wsId?"workspace":null, !itemId?"itemId":null].filter((field) => field !== null).join(', ');
        return res.status(400).json({ error: 'No se han especificado el/los campo(s) '+ missingFields });
    }

    try {
        const item = await Item.findOne({ _id: itemId });
        if (!item) {
            return res.status(404).json({ error: 'No se ha encontrado el item' });
        }

        const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
        if (!workspace) {
            return res.status(404).json({ error: 'No se ha encontrado el workspace' });
        }
        if (!(workspace.items as unknown as IItem[]).some((item: IItem) => item._id.toString() === itemId)) {
            return res.status(404).json({ error: 'El item no pertenece al workspace' });
        }
        const perm = await getUserPermission(loggedUser._id, wsId, itemId);
        if (!perm) {
            return res.status(403).json({ error: 'No estás autorizado para ver este item' });
        }
        const user = await User.findOne({ _id: loggedUser._id }).exec();
        if (!user) {
            return res.status(404).json({ error: 'No se ha encontrado el usuario' });
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
        res.status(500).json({ error: error.message });
    }
};
