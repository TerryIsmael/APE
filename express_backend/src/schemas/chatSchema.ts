import mongoose from '../config/mongoose.ts';
import { ChatType, type IChat, type IMessage } from '../models/chat.ts';
import type { IUser } from '../models/user.ts';
import type { IWorkspace } from '../models/workspace.ts';
import User from './userSchema.ts';

const messageSchema = new mongoose.Schema<IMessage>({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "El usuario es obligatorio"],
        validate: {
            validator: async function(value: mongoose.Types.ObjectId) {
                const existingUser = await mongoose.model<IUser>('User').findById(value);
                return existingUser;
            },
            message: "Este usuario no existe"
        }
    },
    date: {
        type: Date,
        default: Date.now
    },
    text: {
        type: String,
        required: [true, "El mensaje es obligatorio"],
        validate: {
            validator: (value: string) => value.trim().length > 0,
            message: "El mensaje no puede estar vacío"
        }
    },
});

const chatSchema = new mongoose.Schema<IChat>({
    name: {
        type: String,
        required: [true, "El nombre del chat es obligatorio"],
        maxlength: [60, 'El nombre no puede tener más de 60 caracteres'], 
        validate: {
            validator: (value: string) => value.trim().length > 0,
            message: "El nombre del chat no puede estar vacío"
        }
    },
    type: {
        type: String,
        required: [true, "El tipo de chat es obligatorio"],
        enum: {
            values: Object.values(ChatType),
            message: 'El chat no tiene un tipo válido'
        },
    },
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        validate: {
            validator: async function(value: mongoose.Types.ObjectId) {
                const existingWorkspace = await mongoose.model<IWorkspace>('Workspace').findById(value);
                return !value || existingWorkspace;
            },
            message: "Este workspace no existe"
        }
    },
    users: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: [],
        validate: {
            validator: async function(value: mongoose.Types.ObjectId[] | mongoose.PopulatedDoc<IUser>[]) {
                for (const user of value) {
                    const existingUser = await User.findById(user);
                    if (!existingUser) {
                        return false;
                    }
                }
                return true;
            },
            message: "Al menos uno de los usuarios especificados no existe"
        }
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    messages: {
        type: [messageSchema],
        default: []
    },
});

const Chat = mongoose.model('Chat',  chatSchema);

export default Chat;