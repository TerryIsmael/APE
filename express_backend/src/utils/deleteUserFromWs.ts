import type { IWorkspace } from '../models/workspace';
import type { IProfile } from '../models/profile';
import { ProfileType } from '../models/profile';
import Profile from '../schemas/profileSchema';
import { sendMessageToWorkspace } from '../config/websocket.ts';
import mongoose from 'mongoose';
import type { IItem } from '../models/item.ts';
import { Permission } from '../models/profilePerms.ts';
import Item from '../schemas/itemSchema.ts';

export const deleteUserFromWs = async (userId: string, workspace: IWorkspace) => {
    const profile = await Profile.findOne({ name: userId, _id: { $in: workspace.profiles } });
    try {
        if (profile) {
            const profiles = (workspace.profiles as mongoose.PopulatedDoc<IProfile, mongoose.Types.ObjectId>[]).filter(
                (prof): prof is IProfile => 
                (prof as IProfile).profileType === ProfileType.Group && ((prof as IProfile).users as mongoose.Types.ObjectId[]).includes(profile.users[0] as mongoose.Types.ObjectId)
            );

            for (const prof of profiles) {
                prof.users = (prof.users as mongoose.Types.ObjectId[]).filter((userId) => userId.toString() !== profile.users[0]?.toString());
                await prof.save();
            }
            
            workspace.profiles = (workspace.profiles as mongoose.Types.ObjectId[]).filter((profId) => profId._id.toString() !== profile._id.toString());
            await Profile.deleteOne({ _id: profile._id });
            await workspace.populate('items');
            const userItems = (workspace.items as mongoose.PopulatedDoc<IItem, mongoose.Types.ObjectId>[]).filter((item) =>
                !!(item as IItem).profilePerms.find(y => y.profile?.toString() === profile._id.toString()));
            const itemsToDelete: mongoose.PopulatedDoc<IItem>[] = [];
            
            for (const item of userItems) {
                const itemPP = (item as IItem).profilePerms.find((pp) => pp.profile?.toString() === profile._id.toString());
                if (itemPP?.permission === Permission.Owner) {
                    await Item.deleteOne({ _id: item._id });
                    itemsToDelete.push(item);
                } else {
                    ((item as mongoose.PopulatedDoc<IItem>) as IItem).profilePerms = (item as IItem).profilePerms.filter((pp) => pp.profile?.toString() !== profile._id.toString());
                    await Item.updateOne( { _id: item._id }, { profilePerms: ((item as mongoose.PopulatedDoc<IItem>) as IItem).profilePerms });
                }            
            }

            workspace.items = workspace.items.filter((item: mongoose.PopulatedDoc<IItem, mongoose.Types.ObjectId> | undefined) => item && !(itemsToDelete as mongoose.PopulatedDoc<IItem, mongoose.Types.ObjectId>[]).includes(item));
            await workspace.save();
            sendMessageToWorkspace(workspace.id, { type: 'workspaceUpdated' });
        }
    } catch (error: any) {
        console.error('Error al eliminar usuario de workspace:', error);
    }
};


