import { body, validationResult } from 'express-validator';
import  Item  from '../schemas/itemSchema.ts';
import User from '../schemas/userSchema.ts';
import type { Request, Response, NextFunction } from 'express';
import { Permission } from '../models/profilePerms.ts';
import type { IUser } from '../models/user.ts';
import Workspace from '../schemas/workspaceSchema.ts';
import { getWSPermission } from '../utils/permsFunctions.ts';
import { WSPermission } from '../models/profile.ts';
import { ItemType, type IItem } from '../models/item.ts';

export const validatePerm = [
    body('username').custom(async (value) => {
        const user = await User.findOne({ username: value});
        if (!user) {
            return Promise.reject('El usuario no existe');
        }
    }),
    
    body('itemId').custom(async (value) => {
        const item = await Item.findOne({ _id: value});
        if (!item) {
            return Promise.reject('El archivo no existe');
        }
    }),

    body('perm').trim().notEmpty().withMessage('El permiso del archivo es obligatorio')
    .isIn([...Object.values(Permission), "None"].filter( (x: String) => x != "Owner" )).withMessage('El permiso del archivo debe ser Read, Write, o None para eliminar el permiso'),
    
    (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
        } else {
            next();
        }
    }
];

export const validateFile = async (req : Request, res : Response, next : NextFunction) => {
    const errors = await checkFile(req, req.file);
    if (errors) {
        res.status(400).json({ errors: errors });
    } else {
        next();
    }
};


const checkFile = async (req: any, file: any) => {
    const wsId: string = req.body.workspace;
    const path = req.body.path ? req.body.path : "";
    const user: IUser = req.user as IUser;
    const userId = user?._id;
  
    const workspace = await Workspace.findOne({ _id: wsId }).populate('items');
      if (!workspace) {
        return 'No se ha encontrado el workspace';
      }
      if (userId === undefined) {
          return 'El campo userId es requerido';
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
  
      if (file.originalname.includes('../')) {
        return 'El nombre del archivo no puede contener "../"';
      }
  
      return undefined; 
    }