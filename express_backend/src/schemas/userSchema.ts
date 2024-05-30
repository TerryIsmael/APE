import mongoose from '../config/mongoose.ts';
import type { IUser } from '../models/user.ts';

const userSchema = new mongoose.Schema<IUser>({
    username: {
        type: String,
        required: [true, "El nombre de usuario es obligatorio"],
        validate: [
            {
                validator: (value: string) => /^[a-zA-Z0-9_]{4,16}$/.test(value),
                message: "El nombre de usuario debe tener entre 4 y 16 caracteres y sólo puede contener letras, números y guiones bajos"
            },
            {
                async validator(this: IUser, value: string) {
                    const existingUser: IUser = await User.findOne({ username: value }).exec() as IUser;
                    return !existingUser;
                },
                message: "El nombre de usuario ya está en uso"
            }
        ]
    },
    firstName: {
        type: String,
        required: [true, "El nombre es obligatorio"],
        minlength: [1, "Los apellidos deben tener al menos 1 caracter"],
        maxlength: [100, "Los apellidos no pueden tener más de 100 caracteres"],
        validate: {
            validator: (value: string) => {
                return value.trim().length > 0 && /^[a-zA-ZáéíóúÁÉÍÓÚ\s]+$/.test(value);
            },
            message: "El nombre no puede estar vacío y sólo puede contener letras y espacios"
        }
    },
    surnames: {
        type: String,
        required: [true, "Los apellidos son obligatorios"],
        minlength: [1, "Los apellidos deben tener al menos 1 caracter"],
        maxlength: [100, "Los apellidos no pueden tener más de 100 caracteres"],
        validate: {
            validator: (value: string) => {
                return value.trim().length > 0 && /^[a-zA-ZáéíóúÁÉÍÓÚ\s]+$/.test(value)
            },
            message: "Los apellidos no pueden estar vacíos y sólo pueden contener letras y espacios"
        }
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
                    const existingUser: IUser = await User.findOne({ email: value }).exec() as IUser;
                    return !existingUser;
                },
                message: "El correo ya está en uso"
            }
        ]
    },
    favorites: {
        type: [mongoose.Schema.Types.ObjectId], 
        ref: 'Item',
        default: [] 
    },
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
export { userSchema };
