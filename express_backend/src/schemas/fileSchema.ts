import mongoose from '../config/mongoose.js';

const fileSchema = new mongoose.Schema({
    filename: { 
        type: String, 
        required: [true, "El nombre del archivo es obligatorio"], 
        validate: {  
            validator: (value: string) => value.trim().length > 0,
            message: `El nombre del archivo no puede estar vacío`
        }
    },
    contentType: { type: String },
    length: { type: Number, required: true },
    chunkSize: { type: Number, required: true },
    uploadDate: { type: Date, default: Date.now },
    owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: [true, "Es obligatorio que el archivo tenga un dueño asociado"]
    },
    sharedWith: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
        perm: { 
            type: String, 
            default: 'view', 
            validate: {
                validator: (value: string) => ['view', 'read', 'write'].includes(value),
                message: `El permiso del archivo debe ser view, read o write`
            }
        },
      }
    ],
});

const file = mongoose.model('File', fileSchema, 'files');

export default file;