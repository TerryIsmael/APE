import multer from 'multer';
import fs from 'fs';
import { uploadFileError } from '../utils/uploadFileError';
import type { IUser } from '../models/user.ts';
import type { IMember } from '../models/member.ts';
import Workspace from "../schemas/workspaceSchema.ts"

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
  
  //TODO: Validar que el usuario que sube el archivo tenga permisos en el workspace
  export const uploader = multer({
    storage,
    fileFilter: async (req, file, cb) => {
      const workspaceId: string = req.body.workspace;
      const user: IUser = req.user as IUser;
      const userId: string = user?.id;
      if (workspaceId === undefined) {
        cb(new uploadFileError('El campo userId es requerido', 400));
      }else{
        if (userId === undefined) {
            cb(new uploadFileError('El campo userId es requerido', 400));
        } else{
          const workspace = await Workspace.findById(workspaceId);
          if (true) {
            cb(new uploadFileError('', 400));
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

function getUserProfiles(userId: any, workspace: any){
  workspace?.members.find((member: IMember) => member.userId === userId);
}

