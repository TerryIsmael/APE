import type mongoose from "mongoose";

export interface IInvitation extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    code: string;
    workspace: mongoose.Types.ObjectId;
    profile: mongoose.Types.ObjectId;
    expirationDate: Date;
    active: boolean;
}