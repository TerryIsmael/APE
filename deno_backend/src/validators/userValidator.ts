import { isNumber, required, validate } from "https://deno.land/x/validasaur/mod.ts";
import User from "../models/user.ts";

export default async (user: User) => {
    const [passes, errors] = await validate(user, {
        name: required,
        age: [required, isNumber],
    }, {
        messages: {
            "name": "Kafka",
            "age.required": "Silver Wolf",
            "age.isNumber": "Genshin Impact Player",
        },
    });
};
