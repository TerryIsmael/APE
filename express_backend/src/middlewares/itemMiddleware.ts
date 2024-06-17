import { body, validationResult } from 'express-validator';
import  Item  from '../schemas/itemSchema.ts';
import type { Request, Response, NextFunction } from 'express';
import { Permission } from '../models/profilePerms.ts';
import Workspace from '../schemas/workspaceSchema.ts';
import { getWSPermission, getUserPermission } from '../utils/permsFunctions.ts';
import { WSPermission } from '../models/profile.ts';
import { ItemType, type IItem } from '../models/item.ts';
import fs from 'fs';
import Profile from '../schemas/profileSchema.ts';

export const validatePerm = [
    body('profileId').custom(async (value) => {
        const profile = await Profile.findOne({ _id: value });
        if (!profile) {
            return Promise.reject('El perfil no existe');
        }
    }),
    
    body('itemId').custom(async (value) => {
        const item = await Item.findOne({ _id: value});
        if (!item) {
            return Promise.reject('El item no existe');
        }
    }),

    body('perm').trim().notEmpty().withMessage('El permiso del archivo es obligatorio')
    .isIn([...Object.values(Permission), "None"].filter( (x: String) => x != "Owner" )).withMessage('El permiso del archivo debe ser Read, Write, o None para eliminar el permiso'),
    
    (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array().map(x => x.msg) });
        } else {
            next();
        }
    }
];

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
            return 'No tienes permiso para subir archivos a este workspace.';
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

const checkItem = async (req: any) => {
    const wsId: string = req.body.workspace;
    const path = req.body.path ? req.body.path : "";
    const itemData = req.body.item;
    const userId = req.user._id;

    const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
        if (!workspace) {
            return 'No se ha encontrado el workspace';
        }

        const folders = path.split('/');
        const folder = folders[folders.length - 1];
        const existingFolder = (workspace.items as unknown as IItem[]).find((item: IItem) => item.name === folder && item.itemType === ItemType.Folder);
        const folderPath = folders.slice(0, -1).join('/');
        if (path != "/notices" && path != "" && (!existingFolder || existingFolder.path != folderPath)) {
            return 'La ruta no es válida';
        }

        const perm = await getUserPermission(userId, wsId, existingFolder?._id.toString())
        if (perm === Permission.Read || !perm) {
            return 'No tienes permiso para subir archivos a este directorio';
        } 

        const existingItem = (workspace.items as unknown as IItem[]).find((item: IItem) => item.name === itemData.name && item.path === path);
        if (existingItem) {
            return 'No puede haber 2 items con el mismo nombre en una ruta';
        }

    return undefined;
};

export const validateItem = async (req : Request, res : Response, next : NextFunction) => {
    const error = await checkItem(req);
    if (error) {
        res.status(400).json({ error: error });
    } else {
        next();
    }
};