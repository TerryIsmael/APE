import  Item  from '../schemas/itemSchema.ts';
import type { Request, Response, NextFunction } from 'express';
import Workspace from '../schemas/workspaceSchema.ts';
import { getWSPermission } from '../utils/permsFunctions.ts';
import { WSPermission } from '../models/profile.ts';
import { ItemType, type IItem } from '../models/item.ts';
import fs from 'fs';

export const validateFile = async (req : Request, res : Response, next : NextFunction) => {
    const error = await checkFile(req);
    if (error) {
        if (req.file)
            fs.unlinkSync(req.file.path);
        if (req.params.itemId)
            await Item.findByIdAndDelete(req.params.itemId).exec();
        res.status(400).json({ error: error });
    } else {
        next();
    }
};

const checkFile = async (req: any) => {
    const wsId: string = req.body.workspace;
    const path = req.body.path ? req.body.path : "";
    const userId = req.user._id;

    const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
        if (!workspace) {
            return 'No se ha encontrado el workspace';
        }
        const perm = await getWSPermission(userId, wsId)
        if (perm === WSPermission.Read || !perm) {
            return 'No tienes permiso para subir archivos a este workspace';
        } 

        const folders = path.split('/');
        const folder = folders[folders.length - 1];
        const existingFolder = (workspace.items as unknown as IItem[]).find((item: IItem) => item.name === folder && item.itemType === ItemType.Folder);
        const folderPath = folders.slice(0, -1).join('/');
        if (path != "" && (!existingFolder || existingFolder.path != folderPath)) {
            return 'La ruta no es válida';
        }

        const existingItem = (workspace.items as unknown as IItem[]).find((item: IItem) => item.name === req.file.originalname && item.path === path);
        if (existingItem) {
            return 'No puede haber 2 items con el mismo nombre en una ruta';
        }

    return undefined;
};