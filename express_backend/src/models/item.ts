import mongoose from '../config/mongoose.ts';
import type { IPermGroup } from './permGroup.ts';

export enum itemType {
    calendar = 'Calendar',
    note = 'Note',
    timer = 'Timer',
    studySession = 'Study Session',
}

export interface IItem extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    itemType: itemType;
    length: number;
    uploadDate: Date;
    modifiedDate: Date;
    subscribers: Array<IPermGroup>;
}