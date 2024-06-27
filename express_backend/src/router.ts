import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import passport from './config/passport.ts';
import { registerUser, fetchUserData, updateUser, deleteUser, getUserByUsernameOrEmail } from './controllers/userController.ts';
import { getWorkspace, addUserToWorkspace, getWorkspaceNotices, changeWSPerms, getWorkspaceFavs, deleteWorkspace, saveProfile, deleteProfile, createInvitation, getInvitations, toggleActiveInvitation, deleteInvitation, useInvitation, getUserWorkspaces, leaveWorkspace, createWorkspace, getWorkspaceFolders, editWorkspace, getInvitation } from './controllers/workspaceController.ts';
import { addItemToWorkspace, downloadFile, deleteItemFromWorkspace, toggleFavorite, createFile, changeItemPerms, editItem, editFile, saveFile } from './controllers/itemController.ts';
import { modifyTimer } from './controllers/timerController.ts';
import { isLogged, validatePassword,validateEditPassword } from './middlewares/userMiddleware.ts';
import { validateFile, validateItem, validatePerm } from './middlewares/itemMiddleware.ts';
import { validatePrivateChat } from './middlewares/chatMiddleware.ts';
import type { IUser } from './models/user.ts';
import { uploader } from './config/multer.ts'; 
import { addMessage, createChat, editChatName, getChat, getChatMessages, getChats, leaveChat } from './controllers/chatController.ts';

dotenv.config();  
const router = Router();

router.post('/register', validatePassword, registerUser);

router.post('/login', (req: Request , res: Response, next: NextFunction) => {
    passport.authenticate('local', (err : Error, user : IUser, info: { message: any; }) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(404).json({  success: false, error: info.message || 'Hubo un error al intentar iniciar sesión'}); 
        }
        if (req.isAuthenticated()) {
            return res.status(401).json({ success: false, error: 'Ya existe una sesión activa'});
        }
        req.login(user, (err: { message: any; }) => {
            if (err) {
                return next(err); 
            }
            return res.status(200).json({ message: 'Inicio de sesión exitoso' });
        });
    })(req, res, next);
});

router.post('/user/edit', isLogged, validateEditPassword, (req: Request , res: Response) => {
    try {
        updateUser(req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al editar el usuario. ' + error });
    }
});

router.delete('/user', isLogged, (req: Request , res: Response) => {
    try {
        deleteUser(req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al eliminar el usuario. ' + error });
    }
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
router.get('/workspaces/', isLogged, getUserWorkspaces);

router.post('/workspace', isLogged, async (req: Request, res: Response) => {
    try {
        createWorkspace(req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al crear el workspace. ' + error });
    }
});

router.post('/workspace/edit', isLogged, async (req: Request, res: Response) => {
    try {
        editWorkspace(req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al crear el workspace. ' + error });
    }
});

router.delete('/workspace', isLogged, async (req: Request, res: Response) => {
    try {
        deleteWorkspace(req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al dejar el workspace. ' + error });
    }
});

router.post('/workspace/notices', isLogged, async (req: Request, res: Response) => {
    try {
        getWorkspaceNotices(req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener los anuncios. ' + error });
    }
});

router.post('/workspace/favorites', isLogged, async (req: Request, res: Response) => {
    try {
        getWorkspaceFavs(req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener los favoritos. ' + error });
    }
});

router.post('/workspace/folders', isLogged, async (req: Request, res: Response) => {
    try {
        getWorkspaceFolders(req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener las carpetas del workspace. ' + error });
    }
});

router.post('/file/download', isLogged, async (req: Request, res: Response) => {
    try{
        downloadFile(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al descargar el archivo. ' + error });
   }
});

router.post('/file', isLogged, createFile, uploader.single('file'), validateFile, saveFile);

router.put('/file', isLogged, editFile);

router.post('/item', isLogged, validateItem, (req: Request, res: Response) => {
    try {
        addItemToWorkspace(req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error interno del servidor al manejar la solicitud. ' + error});
    }
});


router.put('/item', isLogged, (req: Request, res: Response) => {
    try {
        editItem(req, res);
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

router.post('/profile', isLogged, async (req: Request, res: Response) => { 
    try {
        await saveProfile(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al guardar los datos. ' + error });
    }
});

router.delete('/profile', isLogged, async (req: Request, res: Response) => { 
    try {
        await deleteProfile(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al borrar el perfil. ' + error });
    }
});

router.delete('/leave', isLogged, async (req: Request, res: Response) => { 
    try {
        await leaveWorkspace(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al dejar el workspace. ' + error });
    }
});

router.put('/perms', isLogged, async (req: Request, res: Response) => {
    try {
        await changeWSPerms(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al guardar los permisos. ' + error });
    }
});

router.put('/item/perms', isLogged, validatePerm, async (req: Request, res: Response) => {
    try {
        await changeItemPerms(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al guardar el archivo. ' + error });
    }
});

router.put('/invite', isLogged, async (req: Request, res: Response) => {
    try {
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
        res.status(200).json({ success: true, user: req.user });
    }catch(error){
        res.status(500).json({ success: false, error: 'Error al obtener el usuario. ' + error });
    }
});

router.post('/user/find', isLogged, async (req: Request, res: Response) => {
    try{
        getUserByUsernameOrEmail(req, res);
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

router.post('/item/timer', isLogged, async (req: Request, res: Response) => {
    try{
       modifyTimer(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al obtener el timer. ' + error });
    }   
});

router.get('/invitation/:workspace', isLogged, async (req: Request, res: Response) => {
    try{
        getInvitations(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al obtener las invitaciones. ' + error });
    }
});

router.post('/invitation', isLogged, async (req: Request, res: Response) => {
    try{
        createInvitation(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al obtener las invitaciones. ' + error });
    }
});

router.put('/invitation', isLogged, async (req: Request, res: Response) => {
    try{
        toggleActiveInvitation(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al obtener las invitaciones. ' + error });
    }
});

router.delete('/invitation', isLogged, async (req: Request, res: Response) => {
    try{
        deleteInvitation(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al obtener las invitaciones. ' + error });
    }
});

router.get('/invite/:code', isLogged, async (req: Request, res: Response) => {
    try{
        getInvitation(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al obtener la invitación. ' + error });
    }
});

router.post('/invite/:code', isLogged, async (req: Request, res: Response) => {
    try{
        useInvitation(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al obtener la invitación. ' + error });
    }
});

router.get('/chats', isLogged, async (req: Request, res: Response) => {
    try{
        getChats(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al obtener los chats. ' + error });
    }
});

router.post('/chat', isLogged, validatePrivateChat, async (req: Request, res: Response) => {
    try {
        createChat(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al obtener el chat. ' + error });
    }
});

router.post('/chat/messages', isLogged, async (req: Request, res: Response) => {
    try {
        getChat(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al crear el chat. ' + error });
    }
});

router.get('/chat/message', isLogged, async (req: Request, res: Response) => {
    try {
        getChatMessages(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al obtener los mensajes. ' + error });
    }
});

router.post('/chat/message', isLogged, async (req: Request, res: Response) => {
    try {
        addMessage(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al enviar el mensaje. ' + error });
    }
});

router.put('/chat', isLogged, async (req: Request, res: Response) => {
    try {
        editChatName(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al salir del chat. ' + error });
    }
});

router.delete('/chat', isLogged, async (req: Request, res: Response) => {
    try {
        leaveChat(req, res);
    } catch(error) {
        res.status(500).json({ success: false, error: 'Error al salir del chat. ' + error });
    }
});

export default router;