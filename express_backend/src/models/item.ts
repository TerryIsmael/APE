import mongoose from '../config/mongoose.ts';
import type { IProfilePerms } from './profilePerms.ts';

export enum itemType {
    calendar = 'Calendar',
    note = 'Note',
    timer = 'Timer',
    studySession = 'Study Session',
    folder = 'Folder',
    file = 'File',
}

export interface IItem extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    path: string;
    itemType: itemType;
    length: number;
    uploadDate: Date;
    modifiedDate: Date;
    profilePerms: Array<IProfilePerms>;
}