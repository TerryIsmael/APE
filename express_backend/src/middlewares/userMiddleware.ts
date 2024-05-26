import { body, validationResult } from 'express-validator';
import  User  from '../schemas/userSchema.ts';
import type { Request, Response, NextFunction } from 'express';

export const validateUser = [
    body('username').trim().notEmpty().withMessage('El nombre de usuario es obligatorio').custom(async (value) => {
        
        if (!/^[a-zA-Z0-9_]{4,16}$/.test(value)) {
            return Promise.reject(`El nombre de usuario debe tener entre 4 y 16 caracteres y sólo puede contener letras, números y guiones bajos`);
        }
        const existingUser = await User.findOne({ username: value });
        if (existingUser) {
            return Promise.reject('El nombre de usuario ya está en uso');
        }
    }),
    body('email').trim().notEmpty().isEmail().withMessage('El correo electrónico no es válido').custom(async (value) => {
        if (!/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(value)){
            return Promise.reject(`El correo proporcionado no es un correo electrónico válido`);
        }
        const existingMail = await User.findOne({ email: value });
        if (existingMail) {
            return Promise.reject('El correo electrónico ya está en uso');
        }
    }),
    body('password').trim().notEmpty().withMessage('La contraseña no puede estar vacía ni estar formada por espacios').isLength({ min: 12 }).withMessage('La contraseña debe tener al menos 12 caracteres').custom(async (value) => {
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/.test(value)) {
            return Promise.reject(`La contraseña debe tener al menos una letra minúscula, una letra mayúscula, un número y un caracter especial`);
        }
        if (/\s/.test(value)) {
            return Promise.reject(`La contraseña no puede contener espacios en blanco`);
        }
    }),
    (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
        } else {
            next();
        }
    }
];
export function isLogged(req: Request & { isAuthenticated: () => boolean }, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.status(401).json({ message: 'No estás autenticado' });
    }
}