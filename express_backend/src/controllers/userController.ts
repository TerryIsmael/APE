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
import Chat from '../schemas/chatSchema.ts';
import { ChatType } from '../models/chat.ts';

export const registerUser = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { username, password, firstName, surnames, email } = req.body;
        const codedPassword = bcrypt.hashSync(password, 10);
        let user = new User({ username: username, password: password, firstName: firstName, surnames: surnames, email: email });
        try {
            await user.validate();
        } catch (validationError) {
            return res.status(400).json({ errors: parseValidationError(validationError) });
        }
        user.password = codedPassword;
        await user.save();
        
        const profile = new Profile({ name: user._id, profileType: ProfileType.Individual, wsPerm: WSPermission.Owner, users: [user] });
        await profile.save();
        const workspace = new Workspace({ name: `Workspace de ${user.username}`, items: [], profiles: [profile], default: true });
        await workspace.save();

        const chat = new Chat({ name: workspace.name, type: ChatType.WORKSPACE, workspace: workspace._id, users: [user._id], messages: [] });
        await chat.save();

        if (!fs.existsSync(`uploads/${workspace._id}`)) {
            fs.mkdirSync(`uploads/${workspace._id}/temp`, { recursive: true });
        }

        return res.status(201).json({ message: 'Usuario registrado exitosamente' });

    } catch (error) {
        return res.status(500).json({ error: 'Error en el servidor:' + error });
    }
};

export const updateUser = async (req: Request, res: Response): Promise<Response> => {
    try {
        const newUserData = req.body.user;
        const user = req.user as IUser;

        user.username = newUserData.username; 
        user.firstName = newUserData.firstName;
        user.surnames = newUserData.surnames;
        user.email = newUserData.email;

        if (newUserData.password) {
            newUserData.password = bcrypt.hashSync(newUserData.password, 10);
        }
        try {
            await user.validate();
        } catch (validationError) {
            return res.status(400).json({ errors: parseValidationError(validationError) });
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

        const chats = await Chat.find({ users: userId });
        for (const chat of chats) {
            chat.users = chat.users.filter((chatUser) => chatUser?.toString() !== userId.toString());
            if (chat.users.length === 0) {
                await chat.deleteOne();
            } else {
                await chat.save();
            }
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

                await Chat.deleteOne({ workspace: workspace._id });
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
};