import { Response, Request, type Body } from "../deps.ts";
import {client} from "../server.ts";
interface User {
  id: string;
  name: string;
}

export const getUsers = async ({ response }: { response: Response }) => {
const users = await client.collection("users").find().toArray()
  return response.body = {
    message: "Sucessful Query",
    users
  };
};

export const getUser = async ({ response }: { response: Response }) => {
  const users = await client.collection("users").find().toArray()
    return response.body = {
      message: "Sucessful Query",
      users
    };
  };

export const createUser = async ({ response }: { response: Response }) => {
  const users = await client.collection("users").find().toArray()
    return response.body = {
      message: "Sucessful Query",
      users
    };
  };

export const updateUser = async ({ response }: { response: Response }) => {
  const users = await client.collection("users").find().toArray()
    return response.body = {
      message: "Sucessful Query",
      users
    };
  };

export const deleteUser = async ({ response }: { response: Response }) => {
  const users = await client.collection("users").find().toArray()
    return response.body = {
      message: "Sucessful Query",
      users
    };
  }
