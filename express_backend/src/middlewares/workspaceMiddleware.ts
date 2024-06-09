import { body } from 'express-validator';
import { WSPermission } from '../models/profile';

export const validateWsPerms = [
    body('perm').trim().notEmpty().withMessage('El permiso del archivo es obligatorio')
    .isIn([...Object.values(WSPermission), "None"].filter( (x: String) => x != "Owner" )).withMessage('El permiso del workspace debe ser Read, Write, o Admin'),
]
