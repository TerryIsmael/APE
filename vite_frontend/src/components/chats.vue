<script setup>
import { ref, onBeforeMount, onUnmounted, watch, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router';
import Utils from '../utils/UtilsFunctions.js';
import UserDetailsUtils from '../utils/UserDetailsFunctions.js';
import ChatUtils from '../utils/ChatFunctions.js';

const props = defineProps({
  ws: {
    ws: Object,
    required: true
  },
});

const loading = ref(true);
const currentUser = ref(null);
const ws = ref(null);
const router = useRouter();
const route = useRoute();
const path = ref('');
const showMainSidebar = ref(false);
const folders = ref([]);
const selectedFolder = ref('chats');
const userWsPerms = ref('');
const workspace = ref(null);
const isModalOpened = ref(false)
const isWsModalOpened = ref(false);
const workspaces = ref([]);
const isLeaving = ref(false);
const newWorkspace = ref({ name: '' });
const isNewWsModalOpened = ref(false);
const errorMessage = ref([]);
const messagesContainer = ref(null);
const newChat = ref({ name: '', users: [] });
const userToAdd = ref('');

const messages = ref([]);
const message = ref('');
const chats = ref([]);
const selectedChat = ref(null);
const inDetails = ref(false);

const fetchUser = async () => {
  await Utils.fetchUser(currentUser, router);
};

const selectChat = async (chat) => {
  selectedChat.value = chat;
};

const logout = async () => {
  await Utils.logout(router);
};

const openNewWsModal = () => {
  Utils.openNewWsModal(isWsModalOpened, newWorkspace, isNewWsModalOpened, errorMessage);
};

const formatDate = (date) => {
  return ChatUtils.formatDate(date);
};

const closeNewWsModal = () => {
  Utils.closeNewWsModal(isNewWsModalOpened, newWorkspace, errorMessage);
};

const openWsModal = async () => {
  await Utils.openWsModal(isWsModalOpened, workspaces, isLeaving, router, errorMessage);
};

const closeWsModal = () => {
  Utils.closeWsModal(isWsModalOpened, workspaces, errorMessage);
};

const leaveWorkspace = async (workspaceId) => {
  await Utils.leaveWorkspace (workspaceId, workspaces, router, errorMessage, isWsModalOpened);
};

const redirectToWorkspace = async(workspaceId) => {
  await Utils.redirectToWorkspace(workspaceId, router, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, errorMessage, isWsModalOpened, workspaces, showMainSidebar);
};

const closeModal = () => {
  isModalOpened.value = false;
  newChat.value = { name: '', users: [] };
  userToAdd.value = '';
};

const getUserByUsernameOrEmail = async () => {
  if (newChat.value.users.find(user => user.username === userToAdd.value || user.email === userToAdd.value)) {
    errorMessage.value = ['El usuario ya está añadido al chat'];
    return;
  }
  await ChatUtils.getUserByUsernameOrEmail(userToAdd, newChat, errorMessage);
};

const fetchWorkspace = async () => {
  await UserDetailsUtils.fetchFolders(workspace, errorMessage, router);
  folders.value = workspace.value.folders;
  userWsPerms.value = workspace.value.permission;
};
  
const fetchChats = async () => {
  await ChatUtils.fetchChats(chats, errorMessage, router);
  selectedChat.value = chats.value.find(chat => chat._id === route.params.chatId);
};

const fetchChat = async (chatId) => {
  await ChatUtils.fetchChat(chatId, chats, selectedChat, errorMessage, router);
};

const initSelectedChat = () => {
  const chatId = route.params.chatId;
  const chat = chats.value.find(chat => chat._id === chatId);
  if (chat) {
  selectedChat.value = chat;
  }
};

const openNewChat = async () => {    
  await ChatUtils.openNewChat(newChat, chats, currentUser, errorMessage, router);
  await fetchChats();
  isModalOpened.value = false;
};

const selectItem = async (item, direct) => {
  await ChatUtils.selectItem(item, direct, selectedFolder, router, errorMessage);
};

const sendMessage = async () => {
  await ChatUtils.sendMessage(message, selectedChat, chats, errorMessage, router);
  message.value = '';
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const closeDetails = async () => {
  inDetails.value = false;
  await nextTick();
  scrollToBottom();
};

const leaveChat = async () => {
  await ChatUtils.leaveChat(selectedChat, errorMessage, chats, inDetails);
};

const websocketEventAdd = () => {
  props.ws.addEventListener('open', async (event) => {
    console.log('Connected to server');
    ws.value.send(JSON.stringify({ type: 'workspaceIdentification', userId: currentUser.value?._id, workspaceId: workspace.value?._id }));
  });
  props.ws.addEventListener('message', async (event) => {
    const jsonEvent = JSON.parse(event.data);
    if (jsonEvent.type === 'messageAddedToChat') {
      const chatId = jsonEvent.chatId;
      await fetchChat(chatId);
    }
  });
};

onBeforeMount(async () => {
  ws.value = props.ws;
  await fetch(import.meta.env.VITE_BACKEND_URL + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: "include",
      body: JSON.stringify({
      username: import.meta.env.VITE_USERNAME,
      password: "12345678910aA@",
      })
  });
  await fetchUser();
  newChat.value.users.push(currentUser.value);
  await fetchWorkspace();
  await fetchChats();
  selectedChat.value = chats.value.find(chat => chat._id === route.params.chatId);
  ws.value.send(JSON.stringify({ type: 'workspaceIdentification', userId: currentUser.value?._id, workspaceId: workspace.value._id }));
  websocketEventAdd();
  loading.value = false;
  await nextTick();
  scrollToBottom();
});

onUnmounted(() => {
  ws.value.removeEventListener('open', websocketEventAdd);
});

watch(() => selectedChat.value?.messages, async (newMessages, oldMessages) => {
  await nextTick();
  scrollToBottom();
}, { deep: true });

</script>

<template>
  <div v-if="loading">
    <img :src="'/loading.gif'" alt="item.name" width="100" height="100"/>
  </div>
  <div v-else>
    <div :class="{ 'main-sidebar-toggle': true, 'main-sidebar-toggle-opened': showMainSidebar }">
      <span v-if="!showMainSidebar" @click="showMainSidebar = true" class="material-symbols-outlined" style="z-index: 1002">chevron_right</span>
      <span v-else @click="showMainSidebar = false" class="material-symbols-outlined" style="z-index: 1002">chevron_left</span>
    </div>
      
    <div class="main-content">
        <div class="left-side">
          <div class="chats-container">
            <div class="chat-banner-container">
              <div style="font-size: larger; font-weight: bolder;">Chats</div>
            </div>
            <div class="chat-container" v-for="chat in chats" :key="chat._id" @click="selectChat(chat)">
              <div style="display:flex; flex-direction: column;">
                <div class="title-chat-container">
                  <p class="title-chat">{{ chat.name }}</p>
                </div>
                <div>
                  <p class="members-chat-container">{{ chat.users?.length }} miembros</p>
                </div>
              </div>
            </div>
          </div>
            <button style="width: 90%; margin-left: auto; margin-right: auto;" @click="isModalOpened=true">Nuevo chat</button>
        </div>

        <div v-if="!inDetails" class="message-chat-container">
          <div v-if="selectedChat" style="height: 100%;">
            <div class="header-chat">
              <div class="header-texts">
                  <p style="margin-top: 10px; margin-bottom: 0; font-weight: bolder;">{{ selectedChat?.name }}</p>
                  <p style="margin-top: 0; margin-bottom: 0; font-weight: lighter;"> {{ selectedChat?.users?.map(user=>user.username).join(", ") }} </p>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; justify-content: end; width: 20%">
                <span @click="inDetails = true" style="cursor: pointer;" class="material-symbols-outlined">info </span>
              </div>
            </div>
            <div class="messages-container" ref="messagesContainer">
              <div style="width: 100%" v-for="message in selectedChat?.messages" :key="message._id"> 
                <div class="my-message-container" v-if="message.user == currentUser._id">
                  <div class="my-message">
                    <div style="width: 96%; padding-left:10px; padding-right:10px; display:flex; flex-direction: column;">
                      <div class="message-header">
                        <span style="font-weight: bold; flex-grow:0">Tú</span><div style="flex-grow:1"></div><span style="font-weight: bold; flex-grow:0">{{ formatDate(message.date) }}</span>
                      </div>
                      <p class="message-text">{{ message.text }}</p>
                    </div>
                  </div>
                </div>
                <div class="other-message-container" v-else>
                  <div class="other-message">
                    <div style="width: 96%; padding-left:10px; padding-right:10px; display:flex; flex-direction: column;">
                      <div class="message-header">
                        <span style="font-weight: bold;">{{ message.user.username ? message.user.username:"Usuario eliminado" }}&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</span> <span style="font-weight: bold;"> {{ formatDate(message.date) }} </span>
                      </div>
                      <p class="message-text">{{ message.text }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="message-input-container">
              <input v-model="message" @keyup.enter="sendMessage()" placeholder="Escribe un mensaje..." class="text-input" style="width: 80%; height: 31%"/>
              <button @click="sendMessage()" style="width: 5%; height: 45%; display: flex; justify-content:center; align-items: center; margin-left:5px;"><span class="material-symbols-outlined">send</span></button>
            </div>
          </div>
        </div>
        <div v-else class="info-container">
          <div style="display:flex; justify-content: space-between; padding: 5%;">
            <button @click="closeDetails()"><span class="material-symbols-outlined">arrow_back</span></button>
            <button @click="leaveChat()" class="red-button">Abandonar chat </button>
          </div>
          <div style="display:flex; justify-content: center; font-size: 3vh; font-weight: bolder; padding-top:2%">
            {{ selectedChat?.name }}
          </div>
          <div style="display:flex; justify-content: center; padding-bottom: 3%; font-size: 2vh; font-weight: bold;">
            <p v-if="selectedChat?.type=='Workspace'"> Chat del workspace <p @click="$router.push('/workspace/'+selectedChat.workspace._id)"></p></p>
            <p v-else> Privado </p>
          </div>
          <div style="display:flex; flex-direction: column; align-items: flex-start; padding-left: 7%">
            <p style="font-size: 2vh; font-weight: bold;"> Miembros: </p>
            <div style="max-height: 45vh; overflow-y: auto; width: 100%; display:flex; flex-direction: column; align-items: flex-start">
              <div v-for="user in selectedChat?.users" style="padding: 1%; ">
                <p style="margin:3px">{{ user.username }} ({{ user.email }})</p>
              </div>
            </div>
          </div>
        </div>
    </div>
  </div>

  <!-- Main sidebar -->
  <div class="main-sidebar" :class="{ 'show': showMainSidebar }">

      <div :class="{ 'main-sidebar-toggle': true, 'main-sidebar-toggle-opened': showMainSidebar }">
      <span v-if="!showMainSidebar" @click="showMainSidebar = true" class="material-symbols-outlined" style="z-index: 1002">chevron_right</span>
      <span v-else @click="showMainSidebar = false" class="material-symbols-outlined" style="z-index: 1002">chevron_left</span>
      </div>

      <ul style="height: 85%; min-height: 85%;">
      <div style="display:flex; width: 50px; height: 50px;">
          <div style="margin-left: 35%"><img class="logo-img" src="https://i.pinimg.com/564x/27/bb/89/27bb898786b2fe976f67c318b91a5d2d.jpg"></img></div>
          <div style="margin-left: 65%; display:flex; align-items: center; justify-content: space-between; width: calc(100% - 40px);">
          <div style="text-align: center;">
              <p style="margin: 0; font-weight: bold;">APE</p>
              <p style="margin: 0;">{{ currentUser?.username }}</p>
          </div>
          </div>
      </div>

      <li @click="$router.push('/workspace/')" style="font-weight: bolder; text-align: left; margin-left: 5%; margin-right: 5%; margin-bottom: 1%; margin-top: 3%; word-wrap: break-word; display: flex; align-items: center; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer;">
        <span style="vertical-align: middle; margin-right: 8px;" class="material-symbols-outlined">home</span>
        <p style=" margin: 0%; padding: 0%; word-wrap: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"> {{ workspace?.name }} </p>
      </li>

      <button class="change-workspace-button" @click="openWsModal()">Cambiar</button>
      <li class="main-sidebar-title">Inicio</li>
      <li class="li-clickable">Tu perfil</li>
      <li @click="selectItem('chats', true)" class="li-clickable selected-folder">Chats</li>

      <li class="main-sidebar-subtitle">Workspace actual
          <span v-if="['Owner', 'Admin'].includes(userWsPerms)" @click="selectItem('wsDetails', true)" style="position: absolute; right: 12%; text-align: right; cursor: pointer; vertical-align: middle;" class="material-symbols-outlined">tune</span>
      </li>

      <li @click="selectItem('notices', true)" :class="{ 'li-clickable': true, 'selected-folder': selectedFolder == 'notices' }">Anuncios</li>
      <li @click="selectItem('favorites', true)" :class="{ 'li-clickable': true, 'selected-folder': selectedFolder == 'favorites' }">Favoritos</li>

      <div class="scrollable" style="max-height: 35%; overflow-y: auto;">
          <div v-for="folder in folders" :key="folder._id" style="word-wrap: break-word;">
          <li @click="selectItem(folder, true)" :class="{ 'li-clickable': true, 'selected-folder': selectedFolder === folder.name }"> {{ folder.name}} </li>
          </div>
      </div>

      </ul>
      <ul style="height: 5%;">
        <li style="text-align: right;"> <button style="margin-right: 5%;" @click="logout">
            <span class="material-symbols-outlined">logout</span></button> 
        </li>
      </ul>
  </div>

  <!-- Modal de gestion de worskpaces -->
  <Modal class="modal" :isOpen="isWsModalOpened" @modal-close="closeWsModal" name="workspace-modal">
    <template #header><strong>Tus workspaces</strong></template>
    <template #content>  
      <div class="error" v-if="errorMessage.length !== 0 && isWsModalOpened" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
        <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; margin-top: 10px">
        <button :class="{'toggle-leave':true, 'red-button':!isLeaving }" @click="isLeaving = !isLeaving">
          <span v-if="isLeaving">Volver</span>
          <span v-else>Abandonar</span>
        </button>
        <div>
          <span @click="openNewWsModal()" style="cursor: pointer; margin-right: 10px" class="material-symbols-outlined">add</span>
        </div>
      </div>

      <div style="max-height: 45vh; overflow-y: auto; margin-top: 20px;">
        <div v-for="myWorkspace in workspaces" style="padding-right: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <p class="ws-name">{{ myWorkspace.name }}</p>
            <div style="display: flex; gap: 10px; justify-content: right; align-items: center; width: 20%">
              <button v-if="myWorkspace.perm !== 'Owner' && isLeaving" class="ws-modal-button" style="background-color: #c55e5e" @click="leaveWorkspace(myWorkspace._id)">
                <span style="vertical-align: middle;" class="material-symbols-outlined">person_cancel</span>
              </button>
              <button :disabled="workspace._id.toString() == myWorkspace._id" class="ws-modal-button" @click="redirectToWorkspace(myWorkspace._id)">
                <span style="vertical-align: middle;" class="material-symbols-outlined">sync_alt</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>

  <!-- Modal de nuevo workspace -->
  <Modal class="modal" :isOpen="isNewWsModalOpened" @modal-close="closeNewWsModal" name="new-workspace-modal">
    <template #header><strong>Crear workspace</strong></template>
    <template #content>
      <div class="error" v-if="errorMessage.length !== 0 && isNewWsModalOpened" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
        <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="margin-top: 20px">
        <input type="text" v-model="newWorkspace" placeholder="Nombre de workspace..." maxlength="55" class="text-input" style="margin-bottom: 5px;"/>
      </div>
      <button @click="createWorkspace().then(() => closeNewWsModal())" style="margin-top:15px">Crear</button>
    </template>
  </Modal>

  <!-- Modal de nuevo chat -->
  <Modal class="modal" :isOpen="isModalOpened" @modal-close="closeModal" name="first-modal">
    <template #header><strong>Iniciar chat</strong></template>
    <template #content>
      <div class="error" v-if="errorMessage.length !== 0" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
        <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="margin-top: 20px">
        
        <p style="margin-bottom:5px;">Nombre</p>
        <input v-model="newChat.name" placeholder="Escoge un nombre para el chat..." class="text-input" style="width: 88%;"/>
        <p style="margin-bottom:5px;">Usuarios</p>
        <div style="display: inline-flex; width: 90%; align-items: center; justify-content: space-between; margin-bottom: 10px">
            <input v-model="userToAdd" placeholder="Buscar por nombre de usuario..." class="text-input" style="width: 75%;"/>
            <button @click="getUserByUsernameOrEmail()" style="width: 20%; height: 30px; margin-left: 5px; display: flex; justify-content: center; align-items: center;">Añadir</button>
        </div>
        <div style="max-height: 35vh; overflow-y: auto;">
          <div v-for="user in newChat.users" :key="user._id">
            <div style="display: inline-flex; width: 90%; height: 40px; align-items: center; justify-content: space-between;">
              <p class="profile-name">{{ user.username }}</p>
              <p>({{ user.email }})</p>
              <button v-if="user._id !== currentUser._id" @click="newChat.users = newChat.users.filter(u => u._id !== user._id)" style="width: 20px; height: 20px; padding:2px; display: flex; justify-content: center; align-items: center; background-color: #c55e5e; border-radius: 50%; cursor: pointer;">
                <span class="material-symbols-outlined">close</span>
              </button>
              <div v-else style="width: 20px; height: 20px; padding:2px; display: flex; justify-content: center; align-items: center;"></div>
            </div>
          </div>
        </div>
        <button @click="openNewChat()" style="margin-top:15px">Crear</button>
      </div>
    </template>
  </Modal>

</template>

<style scoped>
.main-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 90vh;
  width: 80vw;
  position: absolute;
  top: 50%;
  left: 50%;
  border: 0.5px solid #4e6c8a;
  transform: translate(-50%, -50%);
}

.left-side {
  display: flex;
  flex-direction: column;
  width: 29.8%;
  height: 100%;
  background-color: #10161d;
  border-right: 0.5px solid #4e6c8a;
  color: black;
}

.chats-container {
  width: 100%;
  height: 93%;
  max-height: 93%;
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: center;
  color: white;
  overflow-y: auto;
}

.chat-container, .chat-banner-container {
  align-items: flex-start;
  width: 100%;
  height: 10%;
  background-color: #1E2B37;
  border-bottom: 0.5px solid #4e6c8a;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  cursor: pointer;
}

.chat-banner-container {
  background-color: #1E2B37;
}

.chat-container div {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.title-chat-container {
  width: 90%;
  height: 100%;
  margin: 0 0;
  font-size: larger;
  font-weight: bolder;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center; 
  overflow: hidden;
}

.title-chat {
  width: 90%;
  height: 70%;
  margin:10px 0 0 0;
  font-size: large;
  font-weight: bolde;
  text-align: center;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis; 
  white-space: nowrap; 
}

.members-chat-container {
  margin:0; 
  font-size: small;
  height: 30%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.message-chat-container {
  width: 70%;
  height: 100%;
  background-color: #10161d;
}

.info-container{
  width: 70%;
  height: 100%;
  background-color: #1E2B37;
  display: flex;
  flex-direction: column;
}

.header-chat {
  width: 100%;
  height: 9.5%;
  background-color: #1E2B37;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  width: 90%;
  padding:0 5%;
}

.header-texts {
  width: 100%;
  height: 9.5%;
  background-color: #1E2B37;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  color: white;
}

.header-chat p {
  margin: 0.5%;
}

.messages-container {
  width: 100%;
  height: 80%;
  background-color: #10161D;
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: center;
  color: white;
  overflow-y: auto;
}

.message-input-container {
  width: 100%;
  height: 10%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 5px;
}

.my-message-container, .other-message-container {
  width: 99%;
  display: flex;
  justify-content: flex-end;
  margin: 5px 10px;
}

.other-message-container {
  justify-content: flex-start;
}

.my-message, .other-message {
  max-width: 90%;
  min-width: 25%;
  white-space: nowrap;
  height: auto;
  background-color: #2f4457;
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: end;
  color: white;
  margin: 5px;
  padding: 10px;
  border-radius: 10px;
}


.other-message {
  margin-right: 0px;
  background-color: #6a1fcc;
  align-items: start;
}

.message-header {
  display: flex; 
  justify-content: space-between; 
  width: 100%; 
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-message {
  min-width: 25%;
  align-items: flex-start;
}

.my-message .message-header {
  /* padding-left: 20px; */
  margin-right: 10px;
}



.message-text {
  white-space: normal;
  word-wrap: break-word;
  width: 100%;
  margin-bottom: 0;
}

.my-message div .message-text {
  text-align: right;
}

.other-message .message-text {
  text-align: left;
}

.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}

.main-sidebar {
  position: fixed;
  top: 0;
  left: -300px;
  width: 300px;
  height: 100%;
  background-color: #2F184B;
  transition: left 0.3s ease;
  z-index: 1001;
}

.main-sidebar.show {
  left: 0;
  display: block;
}

.main-sidebar-toggle {
  position: fixed;
  top: 15px;
  left: 15px;
  height: 50%;
  cursor: pointer;
}

.main-sidebar-toggle-opened {
  top: 15px;
  left: 275px;
  z-index: 1000;
}

.main-sidebar-title {
  text-align: left;
  margin-left: 5%;
  margin-top: 3%;
  font-weight: bolder;
  word-wrap: break-word;
}

.main-sidebar-subtitle {
  text-align: left;
  margin-left: 5%;
  margin-top: 3%;
  font-weight: bolder;
}

.li-clickable {
  text-align: left;
  margin-left: 10%;
  cursor: pointer;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.main-sidebar ul {
  list-style-type: none;
  padding: 0;
}

.main-sidebar ul li {
  padding: 5px;
}

.error {
  grid-column: 1 / -1;
  text-align: center;
  justify-content: center;
  width: fit-content; 
  max-width: 80%; 
  height: auto;
  background-color: rgb(151, 47, 47);
  border-radius: 10px;
  padding-left: 1%; 
  padding-right: 1%;
  padding: 1px 10px;
  margin-bottom: 10px;
  margin-left: auto;
  margin-right: auto;
  overflow-wrap: break-word;
}

.logo-img {
  width: 50px;
  height: 50px;
}

input {
    margin-top: 5px;
    margin-bottom: 5px;
    padding: 5px;
    border-radius: 5px;
    border: 1px solid #ccc;
    background-color: #f0f0f0;
    color: black;
}

.red-button {
  background-color: #c55e5e;
}

</style>