<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Utils from '../utils/UtilsFunctions.js'

const props = defineProps({
    currentUser: { Object, required: true },
    workspace: { Object, required: true },
    folders: { Array, required: true },
    selectedFolder: { String, required: true },
    userWsPerms: { String, required: true },
    isWsModalOpened: { Boolean, required: true },
    errorMessage: { Array, required: true },
    isLeaving: { Boolean, required: true },
    workspaces: { Array, required: true },
    isNewWsModalOpened: { Boolean, required: true }
})

const emit = defineEmits(['selectItem', 'openNewItemModal', 'openWsModal', 'closeWsModal', 'toggleLeave', 'openNewWsModal', 'leaveWorkspace', 'redirectToWorkspace', 'closeNewWsModal', 'createWorkspace']);
const router = useRouter();
const route = useRoute();
const showMainSidebar = ref(false);
const newWorkspace = ref('');
const showNewFolderButton = ref(false);

const logout = async () => {
  await Utils.logout(router);
};

const selectItem = (item, direct) => {
    emit('selectItem', item, direct)
};

const openNewItemModal = (item) => {
    emit('openNewItemModal', item)
};

const openWsModal = () => {
    emit('openWsModal')
};

const closeWsModal = () => {
    emit('closeWsModal')
};

const toggleLeave = () => {
    emit('toggleLeave')
};

const openNewWsModal = () => {
    newWorkspace.value = '';
    emit('openNewWsModal')
};

const leaveWorkspace = (wsId) => {
    emit('leaveWorkspace', wsId)
};

const redirectToWorkspace = (wsId) => {
    emit('redirectToWorkspace', wsId)
};

const closeNewWsModal = () => {
    emit('closeNewWsModal')
    newWorkspace.value = '';
};

const createWorkspace = () => {
    emit('createWorkspace', newWorkspace)
};

onMounted(() => {
    if (route.name === "workspace" && ['Owner', 'Admin', 'Write'].includes(props.userWsPerms)) {
        showNewFolderButton.value = true;
    }
});

watch(() => props.userWsPerms, (newVal) => {
  if (route.name === "workspace" && ['Owner', 'Admin', 'Write'].includes(newVal)) {
      showNewFolderButton.value = true;
  } else {
      showNewFolderButton.value = false;
  }
});

</script>

<template>
    <div class="main-sidebar" :class="{ 'show': showMainSidebar }">
        <div :class="{ 'main-sidebar-toggle': true, 'main-sidebar-toggle-opened': showMainSidebar }">
            <span v-if="!showMainSidebar" @click="showMainSidebar = true" class="material-symbols-outlined" style="z-index: 1002">chevron_right</span>
            <span v-else @click="showMainSidebar = false" class="material-symbols-outlined" style="z-index: 1002">chevron_left</span>
        </div>

        <ul style="height: 85%; min-height: 85%;">
        <div style="display: flex; width: 50px; height: 50px;">
            <div style="margin-left: 35%"><img class="logo-img" src="https://i.pinimg.com/564x/27/bb/89/27bb898786b2fe976f67c318b91a5d2d.jpg"></img></div>
            <div style="margin-left: 65%; display:flex; align-items: center; justify-content: space-between; width: calc(100% - 40px);">
                <div style="text-align: center;">
                    <p style="margin: 0; font-weight: bold;">APE</p>
                    <p style="margin: 0;">{{ props.currentUser?.username }}</p>
                </div>
            </div>
        </div>

        <li @click="$router.push('/workspace/')" style="font-weight: bolder; text-align: left; margin-left: 5%; margin-right: 5%; margin-bottom: 1%; margin-top: 3%; word-wrap: break-word; display: flex; align-items: center; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer;">
            <span style="vertical-align: middle; margin-right: 8px;" class="material-symbols-outlined">home</span>
            <p style=" margin: 0%; padding: 0%; word-wrap: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"> {{ props.workspace?.name }} </p>
        </li>

        <button class="change-workspace-button" @click="openWsModal()">Cambiar</button>
        <li class="main-sidebar-title">Inicio</li>
        <li @click="selectItem('userDetails', true)" :class="{ 'li-clickable': true, 'selected-folder': props.selectedFolder == 'userDetails' }">Tu perfil</li>
        <li @click="selectItem('chats', true)" :class="{ 'li-clickable': true, 'selected-folder': props.selectedFolder == 'chats' }">Chats</li>

        <li class="main-sidebar-subtitle">Workspace actual
            <span v-if="['Owner', 'Admin'].includes(props.userWsPerms)" @click="selectItem('wsDetails', true)" style="position: absolute; right: 12%; text-align: right; cursor: pointer; vertical-align: middle;" class="material-symbols-outlined">tune</span>
            <span v-if="showNewFolderButton" @click="openNewItemModal('Folder')" style="position: absolute; right: 21%; text-align: right; cursor: pointer; vertical-align: middle" class="material-symbols-outlined">add</span>
        </li>

        <li @click="selectItem('notices', true)" :class="{ 'li-clickable': true, 'selected-folder': props.selectedFolder == 'notices' }">Anuncios</li>
        <li @click="selectItem('favorites', true)" :class="{ 'li-clickable': true, 'selected-folder': props.selectedFolder == 'favorites' }">Favoritos</li>

        <div class="scrollable" style="max-height: 35%; overflow-y: auto;">
            <div v-for="folder in props.folders" :key="folder._id" style="word-wrap: break-word; margin-left: 2px; width: 95%">
                <li @click="selectItem(folder, true)" :class="{ 'li-clickable': true, 'selected-folder': props.selectedFolder === folder.name }"> {{ folder.name }} </li>
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
        <button :class="{'toggle-leave': true, 'red-button': !isLeaving }" @click="toggleLeave()">
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
      <button @click="createWorkspace()" style="margin-top: 15px">Crear</button>
    </template>
  </Modal>
</template>

<style scoped>
.main-sidebar.show {
  left: 0;
  display: block;
  z-index: 1000;
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
  z-index: 9999;
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

.logo-img {
  width: 50px;
  height: 50px;
}

.change-workspace-button {
  height: auto;
  border-radius: 8px;
  margin-top: 1%;
  padding: 0.4em 0.7em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #C8B1E4;
  color: black;
  cursor: pointer;
}

.selected-folder {
  margin-left: 10%;
  border-radius: 8px;
  width: 80%;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #C8B1E4;
  color: black;
  text-align: left;
  cursor: pointer;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
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

.toggle-leave {
  display:flex;
  justify-content: center;
  align-items: center;
  height: 30px;
  text-align: center;
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.2em 0.5em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #C8B1E4;
  color:black;
  cursor: pointer;
  outline: none;
}

.red-button {
  background-color: #c55e5e; 
}

.ws-modal-button {
  width: 45px; 
  height: 40px;
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.2em 0.5em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #C8B1E4;
  color:black;
  cursor: pointer;
}

.ws-modal-button:disabled {
  background-color: #736685; 
  cursor: not-allowed;
}

.ws-name {
  text-align: left;
  width: 75%;
  margin-right: 5px;
  word-wrap: break-word; 
  overflow: hidden;
  white-space: nowrap; 
  text-overflow: ellipsis;
  display: block;
}

.text-input {
  border-radius: 5px;
  margin-bottom: 5px;
  height: 30px;
  width: 90%;
  background-color: #f2f2f2;
  color: black;
}


</style>