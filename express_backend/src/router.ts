import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import passport from './config/passport.ts';
import { registerUser } from './controllers/userController.ts';
import { getWorkspace, addFileToWorkspace, addItemToWorkspace, changePerms, addUserToWorkspace } from './controllers/workspaceController.ts';
import { isLogged } from './middlewares/userMiddleware.ts';
import { validatePerm } from './middlewares/itemMiddleware.ts';
import { uploadFileError } from './utils/uploadFileError.ts';
import type { IUser } from './models/user.ts';
import { uploader } from './config/multer.ts'; 
import fs from 'fs';
import path from 'path';

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

// router.get('/file', isLogged, async (req: Request, res: Response) => {
//     try {
//         const files = await getMyFiles(req.user as IUser);
//         res.json({ success: true, files: files, currentUser: req.user });
//     } catch(error) {
//         res.status(500).json({ success: false, error: 'Error al obtener los archivos. ' + error});
//     };
// });

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

router.get('/workspace/:wsId', isLogged, getWorkspace);
router.get('/workspace/', isLogged, getWorkspace);

//TODO: Implementar las rutas de los archivos
router.get('/file', async (req: Request, res: Response) => {
    res.json({ message: 'Ruta GET /file' });
});

router.post('/file', isLogged, (req: Request, res: Response) => {
    try {
        uploader.single('file')(req, res, (err: any) => {
            if (err instanceof uploadFileError) {
                return res.status(400).json({ success: false, error:  'Error al subir el archivo' + err.message });
            } else if (err) {
                return res.status(500).json({ success: false, error:  'Error interno del servidor al subir el archivo. '+err });
            } else {
                addFileToWorkspace(req, res).catch((error) => {
                    return res.status(500).json({  success: false, error:  'Error interno del servidor al manejar la solicitud. '+error });
                });
            }
        }
        );
    } catch (error) {
        res.status(500).json({  success: false, error: 'Error interno del servidor al manejar la solicitud' });
    }
});

// router.delete('/file', isLogged, async (req: Request<any, any, { id: string }, Record<string, any>>, res: Response<any>) => {
//     const { id } = req.body;
//     try {
//         await deleteFile(id, req.user as IUser);
//         res.json({ success: true });
//     } catch(error) {
//         res.status(500).json({ success: false, error: 'Error al borrar el archivo. ' + error });
//       };
// });

// router.put('/file', isLogged, validatePerm, async (req: Request, res: Response) => {
//     const { fileId, username, perm } = req.body;

//     try {
//         await changePerms(fileId, username, perm, req.user as IUser)
//         perm !== "none"?res.json({ success: true, message: 'Permisos del archivo '+ fileId + ' para el usuario '+ username + ' cambiados a '+ perm}):res.json({ success: true, message: 'Eliminados permisos del archivo '+ fileId + ' para el usuario '+ username});
//     } catch(error) {
//         res.status(500).json({ success: false, error: 'Error al guardar el archivo. ' + error });
//       };
//   });

// router.put('/file/like', isLogged, async (req: Request<any, any, { fileId: string }, Record<string, any>>, res: Response<any>) => {
//     const { fileId } = req.body;
//     try {
//         let liked = await toggleFavorite(fileId, req.user as IUser)
//         liked?res.json({ success: true, message: 'Archivo '+ fileId + ' marcado como favorito'}):res.json({ success: true, message: 'Archivo '+ fileId + ' desmarcado como favorito'});
//     } catch(error) {
//         res.status(500).json({ success: false, error: 'Error al actualizar el archivo. ' + error });
//       };
// });



//TODO: Implementar las rutas de los directorios
router.get('/download/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (fs.existsSync(filePath)) {
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/octet-stream');

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } else {
        res.status(404).json({ success: false, error: 'El archivo no existe'} );
    }
});

router.post('/item', isLogged, (req: Request, res: Response) => {
    try {
        addItemToWorkspace(req, res);
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

export default router;