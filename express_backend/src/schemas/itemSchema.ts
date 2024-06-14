import mongoose from '../config/mongoose.ts';
import { ItemType } from '../models/item.ts';
import type { IProfile } from '../models/profile.ts';
import type { IProfilePerms } from '../models/profilePerms.ts';
import { Permission } from '../models/profilePerms.ts';
import type { INote, INotice, ITimer, IFolder, ICalendar, IEvent, IFile } from '../models/typeItem.ts';
import { noteSchema, noticeSchema, timerSchema, folderSchema, calendarSchema, eventSchema, fileSchema } from './typeItemSchema.ts';

const profilePermSchema = new mongoose.Schema<IProfilePerms>({
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: [true, "El perfil es obligatorio"],
        validate: {
            validator: async function(value: mongoose.Types.ObjectId) {
                const existingProfile = await mongoose.model<IProfile>('Profile').findById(value);
                return existingProfile;
            },
            message: "Este perfil no existe"
        }
    },
    permission: {
        type: String,
        required: [true, 'El permiso es obligatorio'],
        enum: {
            values: Object.values(Permission),
            message: 'El perfil seleccionado no es un permiso válido'
        },
        default: Permission.Read,
    }
});

const itemSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, "El nombre del item es obligatorio"], 
        validate: {  
            validator: (value: string) => value.trim().length > 0,
            message: `El nombre del item no puede estar vacío`
        }
    },
    path: {
        type: String
    },
    itemType: {      
        type: String,
        required: [true, 'El tipo de item es obligatorio'],
        enum: {
            values: Object.values(ItemType),
            message: '{VALUE} no es un tipo de item válido'
        },
    },
    uploadDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date, default: Date.now },
    profilePerms: [profilePermSchema],
});

const Item = mongoose.model('Item', itemSchema);

const NoteItem = Item.discriminator<INote>('NoteItem', noteSchema);
const NoticeItem = Item.discriminator<INotice>('NoticeItem', noticeSchema);
const TimerItem = Item.discriminator<ITimer>('TimerItem', timerSchema);
const FolderItem = Item.discriminator<IFolder>('FolderItem', folderSchema);
const EventItem = Item.discriminator<IEvent>('EventItem', eventSchema);
const CalendarItem = Item.discriminator<ICalendar>('CalendarItem', calendarSchema);
const FileItem = Item.discriminator<IFile>('FileItem', fileSchema);

export default Item;
export { itemSchema, NoteItem, NoticeItem, TimerItem, FolderItem, EventItem, CalendarItem, FileItem};