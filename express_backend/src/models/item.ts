import mongoose from '../config/mongoose.ts';
import type { IProfilePerms } from './profilePerms.ts';

export enum ItemType {
    Calendar = 'Calendar',
    Note = 'Note',
    Timer = 'Timer',
    Folder = 'Folder',
    File = 'File',
    Notice = 'Notice',
    Event = 'Event',
}

export interface IItem extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    path: string;
    itemType: ItemType;
    uploadDate: Date;
    modifiedDate: Date;
    profilePerms: Array<IProfilePerms>;
}