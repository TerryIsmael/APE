import mongoose from '../config/mongoose.js';

export interface IFile extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    filename: string;
    contentType: string;
    length: number;
    chunkSize: number;
    uploadDate: Date;
    owner: string;
    sharedWith: Array<{ user: string, perm: string }>;
}