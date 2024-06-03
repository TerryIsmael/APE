import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import passport from './config/passport.ts';
import { registerUser, fetchUserData } from './controllers/userController.ts';
import { getWorkspace, addUserToWorkspace, getWorkspaceNotices } from './controllers/workspaceController.ts';
import {addItemToWorkspace, changePerms, downloadFile, deleteItemFromWorkspace, toggleFavorite} from './controllers/itemController.ts';
import { isLogged } from './middlewares/userMiddleware.ts';
import { validatePerm } from './middlewares/itemMiddleware.ts';
import { uploadFileError } from './utils/uploadFileError.ts';
import type { IUser } from './models/user.ts';
import { uploader } from './config/multer.ts'; 

dotenv.config();  
const router = Router();

router.post('/register', registerUser);

router.post('/login', (req: Request , res: Response, next: NextFunction) => {
    passport.authenticate('local', (err : Error, user : IUser, info: { message: any; }) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(404).json({  success: false, error:  info.message || 'Hubo un error al intentar iniciar sesión'}); 
        }
        if (req.isAuthenticated()) {
            return res.status(401).json({ success: false, error:  'Ya existe una sesión activa'});
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
        return res.status(401).json({  success: false, error: 'No existe ninguna sesión activa' });
    }
    req.logout((err) => {
        if (err) {
            return res.status(500).json({  success: false, error:  'Error durante el proceso de cierre de sesión' });
        }
        return res.status(200).json({ message: 'Deslogueo exitoso' });
    });
});

router.get('/workspace/:wsId', isLogged, getWorkspace);
router.get('/workspace/', isLogged, getWorkspace);

router.post('/workspace/notices', isLogged, async (req: Request, res: Response) => {
    try {
        getWorkspaceNotices(req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener los anuncios. ' + error });
    }
});

router.post('/file/download', isLogged, async (req: Request, res: Response) => {
    try{
        downloadFile(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al descargar el archivo. ' + error });
   }
});

router.post('/file', isLogged, (req: Request, res: Response) => {
    try {
        uploader.single('file')(req, res, (err: any) => {
            if (err instanceof uploadFileError) {
                return res.status(400).json({ success: false, error:  'Error al subir el archivo' + err.message });
            } else if (err) {
                return res.status(500).json({ success: false, error:  'Error interno del servidor al subir el archivo. '+err });
            } else {
                return res.json({ success: true, message: 'Archivo subido con éxito', fileId: req.file?.filename });
            }
        }
        );
    } catch (error) {
        res.status(500).json({  success: false, error: 'Error interno del servidor al manejar la solicitud' });
    }
});

router.post('/item', isLogged, (req: Request, res: Response) => {
    try {
        addItemToWorkspace(req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error interno del servidor al manejar la solicitud. ' + error});
    }
});

router.delete('/item', isLogged, (req: Request, res: Response) => {
    try {
        deleteItemFromWorkspace(req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error interno del servidor al manejar la solicitud. ' + error});
    }
});

router.put('/file/perms', isLogged, validatePerm, async (req: Request, res: Response) => {
    try {
        await changePerms(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al guardar el archivo. ' + error });
    }
});

router.put('/invite', isLogged, async (req: Request, res: Response) => {
    try{
        await addUserToWorkspace(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al invitar al usuario. ' + error });
    }
});

router.put('/item/like', isLogged, async (req: Request, res: Response) => {
    try {
        await toggleFavorite(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al actualizar el archivo. ' + error });
    };
});

router.get('/user', isLogged, async (req: Request, res: Response) => {
    try{
        res.json({ success: true, user: req.user });
    }catch(error){
        res.status(500).json({ success: false, error: 'Error al obtener el usuario. ' + error });
    }
});

router.post('/user/data', isLogged, async (req: Request, res: Response) => {
    try{
        fetchUserData(req, res);
    }catch(error){
        res.status(500).json({ success: false, error: 'Error al obtener el usuario. ' + error });
    }
});

export default router;