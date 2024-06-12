import { sendMessageToUsers } from "../config/websocket";
import { ChatType, type IMessage } from "../models/chat";
import Chat from "../schemas/chatSchema";
import { parseValidationError } from "../utils/errorParser";

export const getChats = async (req: any, res: any) => {
    try {
        const chats = await Chat.find({ users: req.user._id });
        res.status(200).send(chats);
    } catch (error) {
        res.status(500).send(error);
    }
}

export const getChat = async (req: any, res: any) => {
    const chatId = req.params.id;

    try {
        const chat = await Chat.findOne({ _id: chatId, users: req.user._id });
        if (!chat) {
            return res.status(404).send("Chat no encontrado");
        }

        res.status(200).send(chat);
    } catch (error) {
        res.status(500).send(error);
    }
}

export const getChatMessages = async (req: any, res: any) => {
    const chatId = req.params.id;

    try {
        const chat = await Chat.findOne({ _id: chatId, users: req.user._id });
        if (!chat) {
            return res.status(404).send("Chat no encontrado");
        }

        res.status(200).send(chat.messages);
    } catch (error) {
        res.status(500).send(error);
    }
}

export const addMessage = async (req: any, res: any) => {
    const chatId = req.params.id;
    const message = req.body.message;

    if (!message || message.trim().length === 0) {
        return res.status(400).send("El mensaje no puede estar vacío");
    }

    try {
        const chat = await Chat.findOne({ _id: chatId, users: req.user._id });
        if (!chat) {
            return res.status(404).send("Chat no encontrado");
        }

        chat.messages.push({ user: req.user._id, date: new Date(), text: message } as IMessage);
        await chat.save();
        sendMessageToUsers(chat.users.map( x => x.toString() ), { type: "messageAddedToChat", chatId: chatId })
        res.status(201).send(chat);
    } catch (error) {
        res.status(500).send(error);
    }
}


export const createChat = async (req: any, res: any) => {
    const name = req.body.name;
    const users = req.body.users;

    if (!users || users.length < 2) {
        return res.status(400).send("Se requieren al menos dos usuarios para crear un chat");
    }

    const duplicatedChat = await Chat.findOne({ users: { $all: users, $size: users.length } });
    if (duplicatedChat) {
        return res.status(400).send("Ya existe un chat entre estos usuarios");
    }

    const chat = new Chat({ name: name, type: ChatType.PRIVATE, users: users, messages: [] });

    try{
        chat.validateSync();
    } catch (error) {
        return res.status(400).send(parseValidationError(error));
    }

    try {
        await chat.save();
        res.status(201).send(chat);
    } catch (error) {
        res.status(500).send(error);
    }
}

export const leaveChat = async (req: any, res: any) => {
    const chatId = req.params.id;

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).send("Chat no encontrado");
        }

        if (!chat.users.includes(req.user._id)) {
            return res.status(403).send("No estás en este chat");
        }

        if (chat.users.length === 1) {
            await Chat.deleteOne( { _id: chatId } );
        } else {
            chat.users = chat.users.filter((user: any) => user.toString() !== req.user._id.toString());
            await chat.save();
        }

        res.status(200).send(chat);
    } catch (error) {
        res.status(500).send(error);
    }
}