import mongoose from '../config/mongoose.ts';  

export enum ProfileType {
    Individual = 'Individual',
    Group = 'Group',
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
    users: mongoose.Types.ObjectId[];
    wsPerm: WSPermission;
}