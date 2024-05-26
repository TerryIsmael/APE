import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import passport from './config/passport.ts';
import { registerUser } from './controllers/userController.js';
import { getMyFiles, deleteFile, changePerms, toggleFavorite } from './controllers/fileController.js';
import { isLogged, validateUser } from './middlewares/userMiddleware.js';
import { validatePerm } from './middlewares/fileMiddleware.js';
import type { IUser } from './models/user.ts';
// import type { ParamsDictionary } from 'express-serve-static-core';
// import type { ParsedQs } from 'qs';

dotenv.config();  
const router = Router();

router.post('/register',  validateUser, registerUser);

router.post('/login', (req: Request , res: Response, next: NextFunction) => {
    passport.authenticate('local', (err : Error, user : IUser, info: { message: any; }) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(404).json({ message: info.message || 'Hubo un error al intentar iniciar sesión'}); 
        }
        if (req.isAuthenticated()) {
            return res.status(401).json({ message: 'Ya existe una sesión activa'});
        }
        req.login(user, (err: { message: any; }) => {
            if (err) {
                return next(err); 
            }
            return res.status(200).json({ message: 'Inicio de sesión exitoso' });
        });
    })(req, res, next);
});

router.post('/logout', (req: Request, res: Response) => {
    
    if(!req.isAuthenticated()){
        return res.status(401).json({ message: 'No existe ninguna sesión activa' });
    }
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error durante el proceso de cierre de sesión' });
        }
        return res.status(200).json({ message: 'Deslogueo exitoso' });
    });
});

router.get('/file', isLogged, async (req: Request, res: Response) => {
    try {
        const files = await getMyFiles(req.user as IUser);
        res.json({ success: true, files: files, currentUser: req.user });
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al obtener los archivos. ' + error});
    };
});

// const storage = multer.memoryStorage();
// const upload = multer({ storage });
//
// router.post('/file',  isLogged, (req, res, next) => {
//     next(); 
// }, upload.single('file'), async (req, res) => {
//     if (!req.file) {
//         return res.status(400).json({ success: false, error: 'No se ha enviado ningún archivo' });
//     }
//     const file = {
//       originalname: req.file.originalname,
//       buffer: req.file.buffer
//     };

//     try {
//         const fileId = await uploadFile(file, req.user)
//         res.json({ success: true, fileId: fileId });
//     } catch(error) {
//         res.status(500).json({ success: false, error: 'Error al guardar el archivo. ' + error });
//       };
//   });

router.delete('/file', isLogged, async (req: Request<any, any, { id: string }, Record<string, any>>, res: Response<any>) => {
    const { id } = req.body;
    try {
        await deleteFile(id, req.user as IUser);
        res.json({ success: true });
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al borrar el archivo. ' + error });
      };
});

router.put('/file', isLogged, validatePerm, async (req: Request, res: Response) => {
    const { fileId, username, perm } = req.body;

    try {
        await changePerms(fileId, username, perm, req.user as IUser)
        perm !== "none"?res.json({ success: true, message: 'Permisos del archivo '+ fileId + ' para el usuario '+ username + ' cambiados a '+ perm}):res.json({ success: true, message: 'Eliminados permisos del archivo '+ fileId + ' para el usuario '+ username});
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al guardar el archivo. ' + error });
      };
  });

router.put('/file/like', isLogged, async (req: Request<any, any, { fileId: string }, Record<string, any>>, res: Response<any>) => {
    const { fileId } = req.body;
    try {
        let liked = await toggleFavorite(fileId, req.user as IUser)
        liked?res.json({ success: true, message: 'Archivo '+ fileId + ' marcado como favorito'}):res.json({ success: true, message: 'Archivo '+ fileId + ' desmarcado como favorito'});
    } catch(error) {
        console.log(error);
        res.status(500).json({ success: false, error: 'Error al actualizar el archivo. ' + error });
      };
});

// router.post('/file/download', isLogged, async (req: Request<any, any, { id: string }, Record<string, any>>, res: Response<any>) => {
//     const { id } = req.body;
//     try {
//         const downloadStream: any = await downloadFile(id, req.user);
//         res.setHeader('Content-disposition', 'attachment; filename=archivo_descargado');
//         res.setHeader('Content-type', 'application/octet-stream');
//         downloadStream.pipe(res);
//     } catch(error) {
//         res.status(500).json({ success: false, error: 'Error al obtener el archivo. ' + error });
//       };
// });

export default router;