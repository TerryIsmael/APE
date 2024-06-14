import { sendMessageToUsers } from "../config/websocket";
import { ChatType, type IMessage } from "../models/chat";
import type { IUser } from "../models/user";
import type { IWorkspace } from "../models/workspace";
import Chat from "../schemas/chatSchema";
import { parseValidationError } from "../utils/errorParser";

export const getChats = async (req: any, res: any) => {
    try {
        const chats = await Chat.find({ users: req.user._id }).populate("users").populate("messages.user").populate("workspace");
        const parsedChats: any = [];
        chats.forEach(chat => {
           parsedChats.push({
            _id: chat._id,
            name: chat.name,
            type: chat.type,
            workspace: chat.workspace ? {_id: chat.workspace?._id, name: (chat.workspace as unknown as IWorkspace)?.name } : null,
            updatedAt: chat.updatedAt,
            messages: chat.messages.map(message => ({ _id: message._id, user: {_id: message.user._id, username:(message.user as unknown as IUser).username}, date: message.date, text: message.text })),    
            users: (chat.users as IUser[]).map(user => ({ _id: user?._id, username: user?.username, email: user?.email }))
          })
        });

        res.status(200).json({ chats: parsedChats });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error });
    }
};

export const getChat = async (req: any, res: any) => {
    const chatId = req.body.chatId;
    try {
        const chat = await Chat.findOne({ _id: chatId, users: req.user._id }).populate("users").populate("messages.user").populate("workspace");
        if (!chat) {
            return res.status(404).json({ error: "Chat no encontrado" });
        }

        const parsedChat = {
            _id: chat._id,
            name: chat.name,
            type: chat.type,
            workspace: chat.workspace ? {_id: chat.workspace?._id, name: (chat.workspace as unknown as IWorkspace)?.name } : null,
            updatedAt: chat.updatedAt,
            messages: chat.messages.map(message => ({ _id: message._id, user: {_id: message.user._id, username:(message.user as unknown as IUser).username}, date: message.date, text: message.text })),
            users: (chat.users as IUser[]).map(user => ({ _id: user?._id, username: user?.username, email: user?.email }))
        };

        res.status(200).json({ chat: parsedChat });
    } catch (error) {
        res.status(500).json({ error: error });
    }
};

export const getChatMessages = async (req: any, res: any) => {
    const chatId = req.params.id;
    try {
        const chat = await Chat.findOne({ _id: chatId, users: req.user._id });
        if (!chat) {
            return res.status(404).json({ error: "Chat no encontrado" });
        }

        res.status(200).json({ messages: chat.messages });
    } catch (error) {
        res.status(500).json({ error: error });
    }
};

export const addMessage = async (req: any, res: any) => {
    const chatId = req.body.chatId;
    const message = req.body.message;

    if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: "El mensaje no puede estar vacío" });
    }

    try {
        const chat = await Chat.findOne({ _id: chatId, users: req.user._id });
        if (!chat) {
            return res.status(404).json({ error: "Chat no encontrado" });
        }

        chat.messages.push({ user: req.user._id, date: new Date(), text: message } as IMessage);
        chat.updatedAt = new Date();
        await chat.save();
        sendMessageToUsers(chat.users.map( x => x ? x.toString() : ""), { type: "messageAddedToChat", chatId: chatId })
        res.status(201).json({ message: "Mensaje añadido" });
    } catch (error) {
        console.log(error);
        res.status(500).send({ error: error });
    }
};

export const createChat = async (req: any, res: any) => {
    const name = req.body.name;
    const users = req.body.users;

    if (!users || users.length < 2) {
        return res.status(400).json({ error: "Debe haber al menos dos usuarios" });
    }

    const chat = new Chat({ name: name, type: ChatType.PRIVATE, users: users, messages: [] });

    try {
        chat.validateSync();
    } catch (error) {
        return res.status(400).json({ errors: parseValidationError(error) });
    }

    try {
        await chat.save();
        res.status(201).json({ chat: chat });
    } catch (error) {
        res.status(500).json({ error: error });
    }
};

export const leaveChat = async (req: any, res: any) => {
    const chatId = req.body.chatId;

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ error: "Chat no encontrado" });
        }

        if (!chat.users.includes(req.user._id)) {
            return res.status(403).json({ error: "No puedes abandonar un chat en el que no estás" });
        }

        if (chat.users.length === 1) {
            await Chat.deleteOne( { _id: chatId } );
        } else {
            chat.users = chat.users.filter((user: any) => user.toString() !== req.user._id.toString());
            await chat.save();
        }

        res.status(200).json({ message: "Chat abandonado" });
    } catch (error) {
        res.status(500).json({ error: error });
    }
};