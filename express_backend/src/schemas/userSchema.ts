import mongoose from '../config/mongoose.js';
import type { IUser } from '../models/user.ts';

const userSchema = new mongoose.Schema<IUser>({
    username: {
        type: String,
        required: [true, "El nombre de usuario es obligatorio"],
        validate: [
            {
                validator: (value: string) => /^[a-zA-Z0-9_]{4,16}$/.test(value),
                message: "El nombre de usuario debe tener entre 4 y 16 caracteres y solo puede contener letras, números y guiones bajos"
            },
            {
                async validator(this: IUser, value: string) {
                    const existingUser = await (this.constructor as mongoose.Model<IUser>).findOne({ username: value });
                    return !existingUser;
                },
                message: "El nombre de usuario ya está en uso"
            }
        ]
    },
    password: {
        type: String,
        required: [true, "La contraseña es obligatoria"],
        minlength: [12, "La contraseña debe tener al menos 12 caracteres"],
        validate: [
            {
                validator: (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/.test(value),
                message: "La contraseña debe tener al menos una letra minúscula, una letra mayúscula, un número y un caracter especial"
            },
            {
                validator: (value: string) => !/\s/.test(value),
                message: "La contraseña no puede contener espacios"
            },
            {
                validator: (value: string) => value.trim().length > 0,
                message: "La contraseña no puede estar vacía"
            }
        ]
    },
    email: {
        type: String,
        unique: true,
        required: [true, "El email es obligatorio"],
        validate: [
            {
                validator: (value: string) => /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(value),
                message: (props: any) => `${props.value} no es un correo electrónico válido.`
            },
            {
                async validator(this: IUser, value: string) {
                    const existingUser = await (this.constructor as mongoose.Model<IUser>).findOne({ email: value });
                    return !existingUser;
                },
                message: "El correo ya está en uso"
            }
        ]
    },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File', default: [] }],
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;