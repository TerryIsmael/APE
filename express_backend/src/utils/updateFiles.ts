import type mongoose from "mongoose";
import { type IItem } from "../models/item";
import Workspace from "../schemas/workspaceSchema";
import Item from "../schemas/itemSchema";
import { getUserPermission } from "./permsFunctions";

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

export const deleteFolderItems = async (userId: mongoose.Types.ObjectId, folder: IItem, wsId: string, check: Boolean) => {
    try {
        const workspace = await Workspace.findById(wsId).populate('items').populate('profiles').populate('profiles.users').populate('items.profilePerms.profile'); 
        if (!workspace) {
            throw new Error('Workspace no encontrado');
        }

        const path = folder.path.trim() === '' ? folder.name : folder.path + '/' + folder.name; 
        const itemsToDelete = (workspace.items as mongoose.PopulatedDoc<IItem>[]).filter(item => (item as IItem).path.startsWith(path));
        
        if (check) {
            let itemsOfAnotherUser = false;
            for (const item of itemsToDelete) {
                const isInPath = (item as IItem).path.startsWith(path);
                const canSee = await getUserPermission(userId, wsId, (item as IItem)?._id.toString());
                if (isInPath && !canSee) {
                    itemsOfAnotherUser = true;
                    break;
                }
            }
            return itemsOfAnotherUser;
        } else {
            try {
                for (const item of itemsToDelete) {
                    await Item.deleteOne({ _id: (item as IItem)._id });
                }
                return true;
            } catch (error: any) {
                console.error('Error al eliminar archivos:', error);
                return false;
            }
        }
        
    } catch (error: any) {
        console.error('Error al eliminar carpeta:', error);
    }
};
