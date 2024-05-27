import mongoose from '../config/mongoose.ts';
import type { IMember } from '../models/member.ts';
import type { IUser } from '../models/user.ts';
import type { IWorkspace } from '../models/workspace';
import type { IPermGroup } from '../models/permGroup.ts';
import { Permission } from '../models/permission.ts';
import item from './itemSchema.ts';

const memberSchema = new mongoose.Schema<IMember>({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        unique: true,
        required: [true, "El id de usuario es obligatorio"],
        validate: {
            validator: async function(value: mongoose.Types.ObjectId) {
                const existingUser = await mongoose.model<IUser>('User').findById(value);
                return !existingUser;
            },
            message: "Este usuario no existe"
        }
    },
    profile: {
        type: [String],
        required: [true, 'El perfil es obligatorio'],
    },
});

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

const workspaceSchema = new mongoose.Schema<IWorkspace>({
    name: {
        type: String,
        required: [true, "El nombre del espacio de trabajo es obligatorio"],
        validate: {
            validator: (value: string) => {
                return value.trim().length > 0;
            },
            message: "El nombre del espacio de trabajo no puede estar vacío"
        }
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "El propietario del espacio de trabajo es obligatorio"],
        validate: {
            validator: async function(value: mongoose.Types.ObjectId) {
                const existingUser = await mongoose.model<IUser>('User').findById(value);
                return !existingUser;
            },
            message: "Este usuario no existe"
        }
    },
    creationDate: {
        type: Date,
        default: Date.now,
        required: [true, "La fecha de creación del espacio de trabajo es obligatoria"],
    },
    items: [item],
    members: [memberSchema],
    permGroups: [permGroupSchema],
});

const workspace = mongoose.model('Workspace', workspaceSchema);

export default workspace;