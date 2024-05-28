import mongoose from '../config/mongoose.ts';
import { itemType } from '../models/item.ts';
import type { IProfile } from '../models/profile.ts';
import type { IProfilePerms } from '../models/profilePerms.ts';
import { Permission } from '../models/profilePerms.ts';

const profilePermSchema = new mongoose.Schema<IProfilePerms>({
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: [true, "El perfil es obligatorio"],
        validate: {
            validator: async function(value: mongoose.Types.ObjectId) {
                const existingProfile = await mongoose.model<IProfile>('Profile').findById(value);
                return !existingProfile;
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
    filename: { 
        type: String, 
        required: [true, "El nombre del archivo es obligatorio"], 
        validate: {  
            validator: (value: string) => value.trim().length > 0,
            message: `El nombre del archivo no puede estar vacío`
        }
    },
    path: {
        type: String,
        required: [true, 'La ruta del archivo es obligatoria'],
        validate: {  
            validator: (value: string) => value.trim().length > 0,
            message: `El nombre del archivo no puede estar vacío`
        }
    },
    itemType: {      
        type: String,
        required: [true, 'El tipo de item es obligatorio'],
        enum: {
            values: Object.values(itemType),
            message: '{VALUE} no es un tipo de item válido'
        },
    },
    length: { type: Number, required: true },
    uploadDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date, default: Date.now },
    profilePerms: [profilePermSchema],
});

const item = mongoose.model('Item', itemSchema, 'items');

export { item, itemSchema };
