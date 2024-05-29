import multer from 'multer';
import fs from 'fs';
import { uploadFileError } from '../utils/uploadFileError';
import type { IUser } from '../models/user.ts';
import { getWSPermission } from '../utils/permsFunctions.ts';
import { WSPermission } from '../models/profile.ts';

const storage = multer.diskStorage({
    
    destination: (req, _, cb) => {
      const workspace: string = req.body.workspace;
      const dir: string = `uploads/${workspace}`;
  
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
  
      cb(null, dir);
    },

    filename: (_, file, cb) => {
      cb(null, file.originalname);
    }

  });
  
  export const uploader = multer({
    storage,
    preservePath: true,
    fileFilter: async (req, file, cb) => {
      const workspaceId: string = req.body.workspace;
      const user: IUser = req.user as IUser;
      const userId = user?._id;
      if (workspaceId === undefined) {
        cb(new uploadFileError('El campo workspace es requerido', 400));
      }else{
        if (userId === undefined) {
            cb(new uploadFileError('El campo userId es requerido', 400));
        } else{
          const perm = await getWSPermission(userId, workspaceId)
          if (perm === WSPermission.Read || perm === undefined) {
            cb(new uploadFileError('No tienes permiso para subir archivos a este workspace.', 400));
          } else {
            if (file.originalname.includes('../')) {
              cb(new uploadFileError('El nombre del archivo no puede contener "../"', 400));
            } else {
                cb(null, true); 
            }
        }
      } 
    }
  }
});


