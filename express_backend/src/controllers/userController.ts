import bcrypt from 'bcrypt';
import User from '../schemas/userSchema.ts';
import type { Request, Response } from 'express';

export const registerUser = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { username, email, password } = req.body;
        const codedPassword = bcrypt.hashSync(password, 10);
        const user = new User({ username, email, password });

        try {
            await user.validate();
        } catch (validationError) {
            const errorsMessages: string[] = [];
            const errors = (validationError as any).errors;

            for (const fieldErrors in errors) {
                errorsMessages.push(errors[fieldErrors].message);
            }
            return res.status(400).json({ message: errorsMessages });
        }
            user.password = codedPassword;
            await user.save();
            return res.status(201).json({ message: 'Usuario registrado exitosamente' });

    } catch (error) {
        return res.status(500).json({ message: 'Error en el servidor:' + error });
    }
};