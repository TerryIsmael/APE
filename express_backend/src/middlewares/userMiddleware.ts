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
    body('user.username').trim().isLength({ min: 4, max: 16 }).withMessage('El nombre de usuario debe tener entre 4 y 16 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('El nombre de usuario sólo puede contener letras, números y guiones bajos'),

    body('user.firstName').matches(/^[a-zA-ZáéíóúÁÉÍÓÚ\s]+$/).withMessage('El nombre sólo puede contener letras y espacios'),
    body('user.firstName').trim().isLength({ min: 1, max: 100 }).withMessage('El nombre debe tener entre 1 y 100 caracteres'),

    body('user.surnames').matches(/^[a-zA-ZáéíóúÁÉÍÓÚ\s]+$/).withMessage('Los apellidos sólo pueden contener letras y espacios'),
    body('user.surnames').trim().isLength({ min: 1, max: 100 }).withMessage('Los apellidos deben tener entre 1 y 100 caracteres'),

    body('user.email').isLength({ max: 163 }).withMessage('El email no puede tener más de 163 caracteres'),
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
    body('username').trim().isLength({ min: 4, max: 16 }).withMessage('El nombre de usuario debe tener entre 4 y 16 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('El nombre de usuario sólo puede contener letras, números y guiones bajos')
    .custom(async (value) => {
        const existingUser = await User.findOne({ username: value });
            if (existingUser) {
                throw new Error('Este nombre de usuario ya está en uso');
            }
        return true;
    }),

    body('firstName').matches(/^[a-zA-ZáéíóúÁÉÍÓÚ\s]+$/).withMessage('El nombre sólo puede contener letras y espacios'),
    body('firstName').trim().isLength({ min: 1, max: 100 }).withMessage('El nombre debe tener entre 1 y 100 caracteres'),

    body('surnames').matches(/^[a-zA-ZáéíóúÁÉÍÓÚ\s]+$/).withMessage('Los apellidos sólo pueden contener letras y espacios'),
    body('surnames').trim().isLength({ min: 1, max: 100 }).withMessage('Los apellidos deben tener entre 1 y 100 caracteres'),

    body('email').isLength({ max: 163 }).withMessage('El email no puede tener más de 163 caracteres'),
    body('email').trim().notEmpty().withMessage('El correo electrónico es obligatorio')
    .isEmail().withMessage('El correo electrónico no es válido')
    .custom(async (value) => {
        const existingEmail = await User.findOne({ email: value });
        if (existingEmail) {
            throw new Error('Este correo electrónico ya está en uso');
        }
        return true;
    }),

    body('password').trim().isLength({ min: 12 }).withMessage('La contraseña debe tener al menos 12 caracteres no vacíos')
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