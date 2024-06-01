import multer from 'multer';
import fs from 'fs';
import { uploadFileError } from '../utils/uploadFileError';
import type { IUser } from '../models/user.ts';
import { getWSPermission } from '../utils/permsFunctions.ts';
import { WSPermission } from '../models/profile.ts';
import Workspace from '../schemas/workspaceSchema.ts';
import { type IItem, ItemType } from '../models/item.ts';
import { FileItem } from '../schemas/itemSchema.ts';
import { Permission } from '../models/profilePerms.ts';

const storage = multer.diskStorage({
    
    destination: (req, _, cb) => {
      const workspace: string = req.body.workspace;
      const dir: string = `uploads/${workspace}`;
  
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
  
      cb(null, dir);
    },

    filename: async (req, file, cb) => {
      const user: IUser = req.user as IUser;
      const item = new FileItem({ name: file.originalname, path: req.body.path, itemType: ItemType.File, length: file.size, uploadDate: new Date(), modifiedDate: new Date(), profilePerms: [{ profile: user._id, permission: Permission.Owner }] });
      const workspace = await Workspace.findOne({ _id: req.body.workspace }).populate('items');
      await item.save();
      workspace?.items.push(item.id);
      await workspace?.save();
      cb(null, item._id.toString());
    }

  });
  
export const uploader = multer({
  storage,
  preservePath: true,
  fileFilter: async (req, file, cb) => {
    const error = await checkFile(req, file);
    if (error) {
      cb(new uploadFileError(error, 400));
    } else {
      cb(null, true);
    } 
  }
});

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
    if (perm === WSPermission.Read || perm === undefined) {
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


