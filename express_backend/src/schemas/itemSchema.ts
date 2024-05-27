import mongoose from '../config/mongoose.ts';
import type { IPermGroup } from '../models/permGroup.ts';
import { groupType } from '../models/permGroup.ts';
import { Permission } from '../models/permission.ts';
import { itemType } from '../models/item.ts';

const permGroupSchema = new mongoose.Schema<IPermGroup>({
    permGroupType: {
        type: String,
        enum: {
            values: Object.values(groupType),
            message: '{VALUE} no es un tipo de grupo válido'
        },
        required: [true, 'El tipo de grupo es obligatorio']
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'El id del grupo es obligatorio']
    },
    permission: {
        type: String,
        enum: {
            values: Object.values(Permission),
            message: '{VALUE} no es un permiso válido'
        },
        default: Permission.Read,
        required: [true, 'El permiso es obligatorio']
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
    itemType: {      
        type: String,
        enum: {
            values: Object.values(itemType),
            message: '{VALUE} no es un tipo de item válido'
        },
        required: [true, 'El tipo de item es obligatorio']
    },
    length: { type: Number, required: true },
    uploadDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date, default: Date.now },
    subscribers: [permGroupSchema],
});

const item = mongoose.model('Item', itemSchema, 'items');

export default item;