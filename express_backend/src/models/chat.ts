import type mongoose from "mongoose";

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
    users: mongoose.Types.ObjectId[];
    messages: IMessage[];
}