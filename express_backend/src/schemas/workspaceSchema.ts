import mongoose from '../config/mongoose.ts';
import type { IWorkspace } from '../models/workspace';


const workspaceSchema = new mongoose.Schema<IWorkspace>({
    name: {
        type: String,
        required: [true, "El nombre del espacio de trabajo es obligatorio"],
        validate: {
                validator: (value: string) => { return value.trim().length > 0 && value.trim().length <= 55;},
        message: "El nombre del workspace debe tener entre 1 y 55 caracteres"
        },
    },
    creationDate: {
        type: Date,
        default: Date.now,
        required: [true, "La fecha de creación del espacio de trabajo es obligatoria"],
    },
    default: {
        type: Boolean,
        default: false,
    },
    profiles: {
        type: [mongoose.Types.ObjectId],
        ref: 'Profile',
    },
    items: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Item',
        default: [],
    },
});

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;