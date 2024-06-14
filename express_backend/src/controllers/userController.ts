import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import User from '../schemas/userSchema.ts';
import Workspace from '../schemas/workspaceSchema.ts';
import Item from '../schemas/itemSchema.ts';
import { ProfileType, WSPermission } from '../models/profile.ts';
import { parseValidationError } from '../utils/errorParser.ts';
import Profile from '../schemas/profileSchema.ts';
import fs from 'fs';
import type { IUser } from '../models/user.ts';
import { deleteUserFromWs } from '../utils/deleteUserFromWs.ts';
import { getWSPermission } from '../utils/permsFunctions.ts';
import Invitation from '../schemas/invitationSchema.ts';

export const registerUser = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { username, password, firstName, surnames, email } = req.body;
        const codedPassword = bcrypt.hashSync(password, 10);
        let user = new User({ username: username, password: password, firstName: firstName, surnames: surnames, email: email });
        try {
            await user.validate();
        } catch (validationError) {
            return res.status(400).json({ error: parseValidationError(validationError) });
        }
        user.password = codedPassword;
        await user.save();
        
        const profile = new Profile({ name: user._id, profileType: ProfileType.Individual, wsPerm: WSPermission.Owner, users: [user] });
        await profile.save();
        const workspace = new Workspace({ name: `Workspace de ${user.username}`, items: [], profiles: [profile], default: true });
        await workspace.save();
        fs.mkdirSync(`./uploads/${workspace._id}`);

        return res.status(201).json({ message: 'Usuario registrado exitosamente' });

    } catch (error) {
        return res.status(500).json({ error: 'Error en el servidor:' + error });
    }
};

export const updateUser = async (req: Request, res: Response): Promise<Response> => {
    try {
        const newUserData = req.body.user;
        if (req.user && (newUserData._id.toString() !== (req.user as IUser)._id.toString())) {
            return res.status(401).json({ error: 'No tienes permisos para modificar este usuario' });
        }
        const user = await User.findOne({_id: newUserData._id});
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const existingUsername = await User.findOne({ username: newUserData.username }).where('_id').ne(newUserData._id);
        if (existingUsername) {
            return res.status(400).json({ error: 'Este nombre de usuario ya está en uso' });
        }
        const existingEmail = await User.findOne({ email: newUserData.email }).where('_id').ne(newUserData._id);
        if (existingEmail) {
            return res.status(400).json({ error: 'Este correo electrónico ya está en uso' });
        }

        if (newUserData.username) user.username = newUserData.username; 
        if (newUserData.firstName) user.firstName = newUserData.firstName;
        if (newUserData.surnames) user.surnames = newUserData.surnames;
        if (newUserData.email) user.email = newUserData.email;

        if (newUserData.password && newUserData.password.trim() !== '') {
            if (newUserData.password.length < 12) {
                return res.status(400).json({ error: 'La contraseña debe tener al menos 12 caracteres no vacíos' });
            } 
            if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/.test(newUserData.password)) {
                return res.status(400).json({ error: 'La contraseña debe tener al menos una letra minúscula, una letra mayúscula, un número y un caracter especial' });
            }
            if (/\s/.test(newUserData.password)) {
                res.status(400).json({ error: 'La contraseña no puede contener espacios' });
            }
            newUserData.password = bcrypt.hashSync(newUserData.password, 10);
        }

        await User.updateOne({ _id: user._id }, user);
        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ error: 'Error en el servidor:' + error });
    }
}

export const fetchUserData = async (req: any, res: Response): Promise<Response> => {
    try {
        const userId = req.body.userId;
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        return res.status(200).json({"username": user.username, "email": user.email});
    } catch (error) {
        return res.status(500).json({ error: 'Error en el servidor:' + error });
    }
};

export const deleteUser = async (req: any, res: Response): Promise<Response> => {
    try {
        const userId = req.user._id;
        const user = await User.findOne({ _id: userId });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const userProfiles = await Profile.find({ users: user, profileType: ProfileType.Individual });
        const userWorkspaces = await Workspace.find({ profiles: { $in: userProfiles } }).populate('profiles').populate('items');
        
        for (const workspace of userWorkspaces) {
            if (await getWSPermission(userId, workspace._id.toString()) === WSPermission.Owner) {
                await Profile.deleteMany({ _id: { $in: workspace.profiles } });
                await Invitation.deleteMany({ workspace: workspace._id });

                for (const item of workspace.items) {
                    await Item.deleteOne({ _id: item });
                }

                await Item.deleteMany({ workspace: workspace._id });
                fs.rmdirSync(`./uploads/${workspace._id}`, { recursive: true });
                
                await Workspace.deleteOne({ _id: workspace._id });
            } else {
                await deleteUserFromWs(userId, workspace);
            }
        }

        await User.deleteOne({ _id: userId });
        return res.status(200).json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        return res.status(500).json({ error: 'Error en el servidor:' + error });
    }
};

export const getUserByUsernameOrEmail = async (req: any, res: Response): Promise<Response> => {
    try {
        const findTerm = req.body.findTerm;
        const user = await User.findOne({ $or: [{ username: findTerm }, { email: findTerm }] });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        return res.status(200).json({"_id": user._id,"username": user.username, "email": user.email});
    } catch (error) {
        return res.status(500).json({ error: 'Error en el servidor:' + error });
    }
}