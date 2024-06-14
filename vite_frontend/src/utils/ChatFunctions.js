import Utils from './UtilsFunctions.js';

class ChatUtils {

    static fetchChats = async (chats, errorMessage, router) => {
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/chats', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
            });
            if (response.ok) {
                const data = await response.json();
                chats.value = data.chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            } else if (response.status === 401) {
                router.push({ name: 'login' });
            } else {
                errorMessage.value = [];
                response.json().then((data) => {
                    if (data.error || data.errors) {
                        Utils.parseErrorMessage(data, errorMessage);
                    } else {
                        throw new Error("Error al cargar chats");
                    }
                })
            }
        } catch (error) {
            console.log(error);
        }
    };

    static fetchChat = async (chatId, chats, selectedChat, errorMessage, router) => {
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/chat/messages', {
                body: JSON.stringify({ chatId: chatId }),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
            });
            if (response.ok) { 
                const data = await response.json();
                chats.value = chats.value?.filter(chat => chat._id.toString() !== chatId)
                chats.value.unshift(data.chat);
                if (selectedChat.value._id === chatId) {
                    selectedChat.value = data.chat;
                }
            } else {
                errorMessage.value = [];
                response.json().then((data) => {
                    if (data.error || data.errors) {
                        Utils.parseErrorMessage(data, errorMessage);
                    } else {
                        throw new Error("Error al cargar chat");
                    }
                })
            }
        } catch (error) {
            console.log(error);
        }
    };

    static selectItem = async (item, direct, selectedFolder, router, errorMessage) => {    
        if ((item == 'wsDetails' || item == 'notices' || item == 'favorites') || item == 'userDetails' || item == 'chats') {
          selectedFolder.value = item;
          router.push('/' + item);
          return;
        }
        if (item.itemType == 'Folder') {
            errorMessage.value = [];
            router.push('/workspace' + (item.path? '/' + item.path : '') + '/' +  item.name);
            return;
        } 
        return;
    };

    static getUserByUsernameOrEmail = async (userToSearch, newChat, errorMessage) => {
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/user/find', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
                body: JSON.stringify({ findTerm: userToSearch.value })
            });
            if (response.ok) {
                newChat.value.users.push(await response.json());
                userToSearch.value = '';
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al cargar usuario");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    static openNewChat = async (newChat, chats, currentUser, errorMessage, router) => {
        if (!newChat.value.name || newChat.value.name.trim == "") {
            errorMessage.value = ['Debes introducir un nombre para el chat'];
            return;
        }

        if (newChat.value.users.length < 1) {
            errorMessage.value = ['Debes seleccionar al menos un usuario'];
            return;
        }

        const formattedUsers = newChat.value.users.map(user => user._id).push(currentUser.value._id);
        const formattedNewChat = {...newChat.value};
        formattedNewChat.users = formattedUsers;
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
                body: JSON.stringify(newChat.value)
            });
            if (response.ok) {
                errorMessage.value = [];
                const data = await response.json();
                await this.fetchChats(chats, errorMessage, router);
                selectedChat.value = data;
            } else {
                errorMessage.value = [];
                const data = await response.json()
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al crear chat");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    static sendMessage = async (message, selectedChat, chats, errorMessage, router) => {
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
                body: JSON.stringify({ chatId: selectedChat.value._id, message: message.value })
            });
            if (response.ok){
                await this.fetchChat(selectedChat.value._id, chats, selectedChat, errorMessage, router);
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al enviar mensaje");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    static formatDate = (date) => {
        const formattedDate = new Date(date);
        return formattedDate.toLocaleString();
    };

    static leaveChat = async (selectedChat, errorMessage, chats, inDetails) => {
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/chat', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
                body: JSON.stringify({ chatId: selectedChat.value._id })
            });
            if (response.ok) {
                chats.value = chats.value.filter(chat => chat._id !== selectedChat.value._id);
                selectedChat.value = null;
                inDetails.value = false;
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al abandonar chat");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };
    
    static handleEditChat = async (selectedChat, editingName, editing, errorMessage) => {
        try {
            const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/chat', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
                body: JSON.stringify({ chatId: selectedChat.value._id, name: editingName.value })
            });
            if (response.ok) {
                editing.value = false;
                errorMessage.value = [];
            } else {
                errorMessage.value = [];
                const data = await response.json();
                if (data.error || data.errors) {
                    Utils.parseErrorMessage(data, errorMessage);
                } else {
                    throw new Error("Error al editar chat");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };
}

export default ChatUtils;