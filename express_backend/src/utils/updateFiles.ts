import type mongoose from "mongoose";
import { type IItem } from "../models/item";
import Workspace from "../schemas/workspaceSchema";
import Item from "../schemas/itemSchema";

export const updateFilesPath = async (folder: IItem, oldName: string, wsId: string) => {
    try {
        const workspace = await Workspace.findById(wsId).populate('items'); 
        if (!workspace) {
            throw new Error('Workspace no encontrado');
        }

        const oldPath = folder.path.trim() === '' ? oldName : folder.path + '/' + oldName;
        const itemsToUpdate = (workspace.items as mongoose.PopulatedDoc<IItem>[]).filter(item => (item as IItem).path.startsWith(oldPath));
        const oldPathArray = oldPath.split('/');

        for (const item of itemsToUpdate) {
            const itemPathParts = (item as IItem).path.split('/'); 
            itemPathParts[oldPathArray.length-1] = folder.name;
            const newPath = itemPathParts.join('/');
            await Item.updateOne({ _id: (item as IItem)._id }, { path: newPath });
        }
    } catch (error: any) {
        console.error('Error al actualizar archivos:', error);
    }
};