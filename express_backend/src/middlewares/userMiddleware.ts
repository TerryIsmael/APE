import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../schemas/userSchema';

export function isLogged(req: Request & { isAuthenticated: () => boolean }, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.status(401).json({ error: 'No estás autenticado' });
    }
}

export const validateUser = [
    body('user.username').trim().notEmpty().withMessage('El nombre de usuario es obligatorio')
    .isLength({ min: 4, max: 16 }).withMessage('El nombre de usuario debe tener entre 4 y 16 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('El nombre de usuario sólo puede contener letras, números y guiones bajos'),

    body('user.firstName').trim().notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ min: 1, max: 100 }).withMessage('El nombre debe tener entre 1 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚ\s]+$/).withMessage('El nombre sólo puede contener letras y espacios'),

    body('user.surnames').trim().notEmpty().withMessage('Los apellidos son obligatorios')
    .isLength({ min: 1, max: 100 }).withMessage('Los apellidos deben tener entre 1 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚ\s]+$/).withMessage('Los apellidos sólo pueden contener letras y espacios'),

    body('user.email').trim().notEmpty().withMessage('El correo electrónico es obligatorio')
    .isEmail().withMessage('El correo electrónico no es válido'),

    (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array().map(x => x.msg) });
        } else {
            next();
        }
    }
];

export const validateNewUser = [
    body('user.username').trim().notEmpty().withMessage('El nombre de usuario es obligatorio')
    .isLength({ min: 4, max: 16 }).withMessage('El nombre del workspace debe tener entre 4 y 16 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('El nombre de usuario sólo puede contener letras, números y guiones bajos')
    .custom(async (value) => {
        const existingUser = await User.findOne({ username: value });
            if (existingUser) {
                throw new Error('Este nombre de usuario ya está en uso');
            }
        return true;
    }),

    body('user.firstName').trim().notEmpty().withMessage('El nombre del usuario es obligatorio')
    .isLength({ min: 1, max: 100 }).withMessage('El nombre del usuario debe tener entre 1 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚ\s]+$/).withMessage('El nombre del usuario sólo puede contener letras y espacios'),

    body('user.surnames').trim().notEmpty().withMessage('Los apellidos del usuario son obligatorios')
    .isLength({ min: 1, max: 100 }).withMessage('Los apellidos del usuario deben tener entre 1 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚ\s]+$/).withMessage('Los apellidos del usuario sólo pueden contener letras y espacios'),

    body('user.email').trim().notEmpty().withMessage('El correo electrónico es obligatorio')
    .isEmail().withMessage('El correo electrónico no es válido')
    .custom(async (value) => {
        const existingEmail = await User.findOne({ email: value });
        if (existingEmail) {
            throw new Error('Este correo electrónico ya está en uso');
        }
        return true;
    }),

    body('user.password').trim().notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 12 }).withMessage('La contraseña debe tener al menos 12 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/).withMessage('La contraseña debe tener al menos una letra minúscula, una letra mayúscula, un número y un caracter especial')
    .custom((value) => !/\s/.test(value)).withMessage('La contraseña no puede contener espacios'),

    (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array().map(x => x.msg) });
        } else {
            next();
        }
    }
];