import mongoose from '../config/mongoose.ts';  
import type { IUser } from '../models/user.ts';

export enum ProfileType {
    admin = 'Individual',
    group = 'Group',
}

export enum WSPermission {
    Read = 'Read',
    Write = 'Write',
    Admin = 'Admin',
    Owner = 'Owner',
}

export interface IProfile extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    profileType: ProfileType;
    name: string;
    users: Array<IUser>;
    wsPerm: WSPermission;
}