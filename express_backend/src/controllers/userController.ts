import bcrypt from 'bcrypt';
import User from '../schemas/userSchema.ts';
import type { Request, Response } from 'express';
import Workspace from '../schemas/workspaceSchema.ts';
import { ProfileType, WSPermission} from '../models/profile.ts';
import { parseValidationError } from '../utils/errorParser.ts';
import Profile from '../schemas/profileSchema.ts';
import fs from 'fs';

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