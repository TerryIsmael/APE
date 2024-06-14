import type mongoose from "mongoose";
import type { IUser } from "./user";

export enum ChatType {
    PRIVATE = "Private",
    WORKSPACE = "Workspace"
}

export interface IMessage extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    date: Date;
    text: string;
}

export interface IChat extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    type: ChatType;
    workspace: mongoose.Types.ObjectId;
    users: Array<mongoose.PopulatedDoc<IUser>> |  Array<mongoose.Types.ObjectId>;
    updatedAt: Date;
    messages: IMessage[];
}