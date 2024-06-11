<script setup>
import { ref, onMounted, onBeforeMount, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';
import WorkspaceDetailsUtils from "../utils/WorkspaceDetailsFunctions.js";
import Utils from '../utils/UtilsFunctions.js';

const props = defineProps({
  ws: {
    ws: Object,
    required: true
  },
});

const ws = ref(null);
const currentUser = ref(null);
const userWsPerms = ref(null);
const router = useRouter();
const route = useRoute();

const path = ref('');
const selectedFolder = ref('');
const currentPath = ref('');
const items = ref([]);
const selectedItem = ref(null);
const existFolder = ref(false);
const showSidebar = ref(false);
const selectedItemPerms = ref(null);
const author = ref(null);
const profileWsPerms = ref({});
const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);

const workspaceId = ref(null);
const workspace = ref({});
const newWorkspace = ref({});
const inviteProfile = ref('none');
const userToInvite = ref('');
const permToInvite = ref('Read');
const isModalOpened = ref(false);
const searchModalProfileTerm = ref('');
const searchGroupProfileTerm = ref('');
const modalProfile = ref({});
const selectedProfile = ref(null);
const linkDuration = ref('day');
const invitations = ref([]);

const folders = ref([]);
const showMainSidebar = ref(false);
const searchProfileTerm = ref('');
const searchTypeProfile = ref('All');
const errorMessage = ref([]);
const isNewItemModalOpened = ref(false);
const newItem = ref({});
const editing = ref(false);
const loading = ref(true);


const fetchInvitations = async () => {
  await WorkspaceDetailsUtils.fetchInvitations(workspace, invitations, errorMessage, router);
};

const createInvitationLink = async (profile) => {
  await WorkspaceDetailsUtils.createInvitationLink(workspace, inviteProfile, linkDuration, invitations, errorMessage, router);
};

const isUserInModalProfile = (user) => {
  return WorkspaceDetailsUtils.isUserInModalProfile(user, modalProfile);
};

const handleSelectProfile = (profile) => {
  selectedProfile.value = profile;
  openModal();
};

const openModal = () => {
  WorkspaceDetailsUtils.openModal(selectedProfile, modalProfile, isModalOpened);
};

const closeModal = () => {
  WorkspaceDetailsUtils.closeModal(selectedProfile, modalProfile, isModalOpened);
};

const setModalProfileUsers = (user) => {
  WorkspaceDetailsUtils.setModalProfileUsers(user, modalProfile);
};

const toggleEdit = () => {
  WorkspaceDetailsUtils.toggleEdit(editing, newWorkspace, workspace);
};

const saveProfile = async () => {
  await WorkspaceDetailsUtils.saveProfile(modalProfile, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
  WorkspaceDetailsUtils.populateVariables(workspace, author, profileWsPerms);
};

const fetchUser = async () => {
  await Utils.fetchUser(currentUser, router);
};

const fetchWorkspace = async () => {
  await WorkspaceUtils.fetchWorkspace(workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
  ws.value.send(JSON.stringify({ type: 'workspaceIdentification', workspaceId: workspace.value._id }));
  WorkspaceDetailsUtils.populateVariables(workspace, author, profileWsPerms);
};

const selectItem = async (item, direct) => {
  profileWsPerms.value = {};
  author.value = null;
  await WorkspaceUtils.selectItem(item, direct, selectedFolder, router, selectedItem, showSidebar, selectedItemPerms, workspace, currentUser, author, profileWsPerms, errorMessage);
};

const formatDate = (date) => {
  return Utils.formatDate(date);
};

const translateItemType = (item) => {
  return Utils.translateItemType(item);
};

const translatePerm = (perm) => {
  return Utils.translatePerm(perm);
};

const openNewItemModal = (itemType) => {
  WorkspaceUtils.openNewItemModal(itemType, isNewItemModalOpened, newItem, hours, minutes, seconds, errorMessage);
};

const closeNewItemModal = () => {
  WorkspaceUtils.closeNewItemModal(isNewItemModalOpened, newItem, errorMessage, hours, minutes, seconds);
};

const handleNewItemForm = async () => {
  await WorkspaceUtils.handleNewItemForm(newItem, hours, minutes, seconds, path, workspace, errorMessage, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, isNewItemModalOpened, router);
};

const navigateToPreviousFolder = () => {
  WorkspaceUtils.navigateToPreviousFolder(path, router);
};

const toggleActiveInvitation = async (invitation) => {
  await WorkspaceDetailsUtils.toggleActiveInvitation(workspace, invitation, invitations, errorMessage, router);
};

const deleteInvitation = async (invitation) => {
  await WorkspaceDetailsUtils.deleteInvitation(workspace, invitation, invitations, errorMessage, router);
};

const inviteUser = async () => {
  await WorkspaceDetailsUtils.inviteUser(workspace, userToInvite, permToInvite, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, errorMessage, router);
};

const copyInvitation = async (invitation) => {
  await navigator.clipboard.writeText(import.meta.env.VITE_BACKEND_URL + '/invite/' + invitation.code);
  var message = document.getElementById("message");
  message.style.visibility = "visible";
  setTimeout(function() {
          message.style.visibility = "hidden";
        }, 3000);
};

const getFilteredProfiles = computed(() => {

  let orderedProfiles = [];
  let profiles = [];

  if (userWsPerms.value === 'Owner') {
    const ownerProfile = workspace.value.profiles.find(profile => profile.wsPerm === 'Owner');
    profiles = workspace.value.profiles.filter(profile => {
      const name = profile.profileType === 'Individual' ? profile.users[0].username : profile.name;
      const matchesSearchTerm = searchProfileTerm.value.trim() === '' || name.toLowerCase().includes(searchProfileTerm.value.toLowerCase().trim());
      const isNotOwner = profile !== ownerProfile;
      return searchTypeProfile.value === 'All' ? (matchesSearchTerm && isNotOwner) : (matchesSearchTerm && isNotOwner && profile.profileType === searchTypeProfile.value);
    });
  
  } else if (userWsPerms.value === 'Admin') {
    const forbiddenProfiles = workspace.value.profiles.filter(profile => profile.wsPerm === 'Owner' || profile.wsPerm === 'Admin');

    profiles = workspace.value.profiles.filter(profile => {
      const isForbidden = forbiddenProfiles.includes(profile);
      const name = profile.profileType === 'Individual' ? profile.users[0].username : profile.name;
      const matchesSearchTerm = searchProfileTerm.value.trim() === '' || name.toLowerCase().includes(searchProfileTerm.value.toLowerCase().trim());
      return searchTypeProfile.value === 'All' ? (matchesSearchTerm && !isForbidden) : (matchesSearchTerm && !isForbidden && profile.profileType === searchTypeProfile.value);
    });
  }

  const withoutPerms = profiles.filter(profile => profile.wsPerm === 'Read');
  const withPerms = profiles.filter(profile => profile.wsPerm !== 'Read');
  orderedProfiles.push(...withPerms);
  orderedProfiles.push(...withoutPerms); 
  return orderedProfiles;
});

const getGroupProfiles = computed(() => {
  const profiles = workspace.value.profiles.filter(profile => {
    const profileType = profile.profileType === 'Group';
    const matchesSearchTerm = searchGroupProfileTerm.value.trim() === '' || profile.name.toLowerCase().includes(searchGroupProfileTerm.value.toLowerCase().trim());
    return (profileType && matchesSearchTerm);
  });

  return profiles.sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    else return 0;
  });
});

const getIndividualProfiles = computed(() => {
  const profiles = workspace.value.profiles.filter(profile => {
    const name = profile.users[0]?.username;
    const profileType = profile.profileType === 'Individual';
    const matchesSearchTerm = searchModalProfileTerm.value.trim() === '' || name.toLowerCase().includes(searchModalProfileTerm.value.toLowerCase().trim());
    return (profileType && matchesSearchTerm);
  });

  const orderedUsers = [];
  const users = profiles.map(profile => profile.users[0])
  const withoutPerms = users.filter(user => !isUserInModalProfile(user));
  const withPerms = users.filter(user => isUserInModalProfile(user));

  withPerms.length != 0 ? orderedUsers.push(...withPerms) : null;
  orderedUsers.push(...withoutPerms);
  return orderedUsers;
});

const clearErrorMessage = () => {
  Utils.clearErrorMessage(errorMessage);
};

const changeWsPerms = async (perm, profileId) => {
  await WorkspaceDetailsUtils.changeWsPerms(perm, profileId, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
  WorkspaceDetailsUtils.populateVariables(workspace, author, profileWsPerms);
};

const deleteProfile = async (profileId) => {
  await WorkspaceDetailsUtils.deleteProfile(profileId, workspace, path, currentPath, currentUser, items, folders, selectedFolder, existFolder, userWsPerms, router, errorMessage);
  WorkspaceDetailsUtils.populateVariables(workspace, author, profileWsPerms);
};

const deleteWorkspace = async () => {
  await WorkspaceDetailsUtils.deleteWorkspace(workspace, router, errorMessage);
};

const logout = async () => {
  await Utils.logout(router);
};

const websocketEventAdd = () => { // TODO
  props.ws.addEventListener('open', async (event) => {
    websocketEventAdd();
  });
  props.ws.addEventListener('message', async (event) => {
        const jsonEvent = JSON.parse(event.data);
        if (jsonEvent.type === 'workspaceUpdated') {
          await fetchWorkspace();
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
  await fetchWorkspace();
  await fetchInvitations();
  loading.value = false;
});

onMounted(() => {
  workspaceId.value = localStorage.getItem('workspace');
  websocketEventAdd();
});

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

    <div class="main-content" style="display: flex; justify-content: center; align-items: center; word-wrap: break-word;">
      <h1 @click="$router.push('/workspace/')" style="cursor: pointer; display: flex; align-items: center; margin-right: 10px">
          <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
          Detalles del workspace
      </h1>
    </div>

    <div class="main-content" style="display:flex; flex-direction: column; align-items: center;">

      <div style="display: flex; justify-content: space-around; width: 90%; align-items: center; justify-content: center;">
          <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; width: 85%">
              <button style="max-height: 50px;" @click="navigateToPreviousFolder()"><span class="material-symbols-outlined">arrow_back</span></button>
              <div style="display:flex; width: 100%; justify-content: start; text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-left: 1%;">
                <h2 style="margin-right: 1%">Ruta actual: /{{ route.name }}</h2>
              </div>
          </div>

          <div style="display: flex; justify-content: flex-end; width: 20%;">
            <button v-if="userWsPerms === 'Owner' && !workspace.default" class="remove-perm-button" style="margin-right: 19.5%; max-height: 50px; display:flex; justify-content: center; align-items: center;" @click="deleteWorkspace()">Eliminar workspace</button>
          </div>
      </div>
      
      <div class="main-content" style="width: 90%;">
        <div class="error" v-if="errorMessage.length !== 0 && !isNewItemModalOpened" style="display: flex; justify-content: space-between; padding-left: 2%;">
          <div>
            <p v-for="error in errorMessage" :key="error" style="margin-top: 5px; margin-bottom: 5px; text-align: center; position: relative;"> {{ error }} </p>
          </div>
          <button @click="clearErrorMessage()" style="display: flex; align-items: top; padding: 0; padding-left: 5px; padding-top: 10px; background: none; border: none; cursor: pointer; color: #f2f2f2; outline: none;">
            <span style="font-size: 20px; "class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style="display: flex; width: 100%">
          <div style="text-align: left; flex: 1; max-width: 50%;"> 
            <h2 style="margin-left: 0; margin-right: 0; margin-bottom: 0;">Detalles del workspace</h2>
            <hr style="width: 90%; display: flex; margin-left: 0%;">

            <h4 style="margin: 0;">Fecha de creación: {{ formatDate(workspace?.creationDate) }}</h4>
            <h4 style="margin-left: 0; margin-right: 0; margin-top: 0;">Creado por: {{ author?.username }} ({{ author?.email }})</h4>
            <h2 style="margin: 0;">Invitación al workspace</h2>
            <hr style="width: 90%; display: flex; margin-left: 0%;">

            <h3 style="margin: 0; margin-top: 5px; margin-bottom: 5px;">Mediante nombre de usuario</h3>
            <div style="display: flex; justify-content: space-between; align-items: baseline">
              <input type="text" class="text-input" style=" " v-model="userToInvite" placeholder="Username del nuevo miembro..."></input>
              <select v-model="permToInvite" class="text-input" style="width: 32%; margin-left:3px">
                  <option :value="'Read'">Lectura</option>
                  <option :value="'Write'">Escritura</option>
                  <option :value="'Admin'">Admin</option>
              </select> 
              <button style="margin-top: 0.5%;" class="invite-button" @click="inviteUser">Invitar</button>
            </div>

            <h3 style="margin-left: 0; margin-right: 0; margin-top: 5px; margin-bottom: 5px;">Mediante link de invitación</h3>
            
            <p style="margin: 0%; margin-bottom: 5px;">Seleccione un perfil para generar el link:</p>
            <div style="display: flex; justify-content: space-between; width: 100%;">
              <select v-model="inviteProfile" class="text-input" style="width: 60%;">
                  <option :value="'none'"> Ninguno - Lectura </option>
                  <option v-if="getGroupProfiles.length > 0" v-for="profile in getGroupProfiles" :key="profile._id" :value="profile.name">{{ profile.name }} </option>
              </select>
              <select v-model="linkDuration" class="text-input" style="width: 20%; margin-left:3px">
                  <option :value="'day'"> 1 día </option>
                  <option :value="'week'">1 semana</option>
                  <option :value="'month'">1 mes</option>
                  <option :value="'none'">Para siempre</option>
              </select>
              <button class="invite-button" @click="createInvitationLink" >Generar</button>
            </div>
            <div id="message">Enlace copiado al portapapeles</div>
            <table v-if="invitations.length !== 0" style="width: 90.5%; margin-top:2%">
              <tr>
                <th style="width:30%">Perfil</th>
                <th style="width:26%">Duración</th>
                <th style="width:6%">Activo</th>
                <th style="width:8%; margin-left:5%; text-align: end;">Eliminar</th>
              </tr>
              <tr v-for="invitation in invitations" :key="invitation._id">  
                <td >{{ invitation.profile?(invitation.profile.name, "-", invitation.profile.wsPerm):"Ninguno - Lectura" }} <span @click="copyInvitation(invitation)" class="material-symbols-outlined" style="cursor:pointer;vertical-align:middle">content_copy</span></td>
                <td>{{ invitation.expirationDate?Utils.formatDate(invitation.expirationDate):"Indefinida" }}</td>
                <td class="td-center"><span @click="toggleActiveInvitation(invitation)" class="material-symbols-outlined" style="cursor:pointer">{{ invitation.active ? 'check' : 'close' }}</span></td>
                <td class="td-center" style="margin-left:5%; text-align: end"><span @click="deleteInvitation(invitation)" class="material-symbols-outlined" style="cursor:pointer">delete</span></td>
              </tr>
            </table>
            <p v-else>Aún no hay links de invitación al workspace</p>
          </div>

          <div style="text-align: left; flex: 1; padding-left: 5px; max-width: 50%;">
            <div style="display:flex; justify-content:space-between; align-items:center"> 
              <h2 style="text-align: left; margin-bottom: 5px;">Nombre del workspace</h2>

              <div v-if="!editing" style="display: flex; justify-content: flex-end; width: 15%; margin-right: 8%">
                <button v-if="!editing" class="workspace-name-button" style="margin-right: 0px;" @click="toggleEdit()">Editar</button>
              </div>
              <div v-else style="display: flex; justify-content: flex-end; width: 15%; margin-right: 8%">
                <button @click="toggleEdit()" class="workspace-name-button remove-perm-button">Cancelar</button>
                <button @click="saveWorkspace()" class="workspace-name-button">Guardar</button>
              </div>
            </div>

            <input v-if="editing" type="text" class="workspace-input" v-model="newWorkspace.name" :placeholder=workspace.name></input>
            <div v-else style="margin: 0;">
              <hr style="width: 92%; display: flex; margin-left: 0%; margin-top: 0.5%">
              <h4 style="margin-left: 0; margin-right: 0; margin-top: 0;"> {{ workspace.name }}</h4>
            </div>

            <div style="display: inline-flex; justify-content: space-between; align-items: center; margin-top: 10px; width: 92%">
              <h2 style="margin: 0; text-align: left; margin-bottom: 5px;">Perfiles</h2> 
              <div style="margin: 0; padding: 0">
                <span @click="openModal()" style="text-align: right; cursor: pointer; vertical-align: bottom" class="material-symbols-outlined">add</span> 
              </div>
            </div>

            <div style="height: 80%; overflow-y: auto;">
              <div style="display: inline-flex; width: 91.5%; align-items: center; justify-content: space-between; margin-bottom: 15px">
                <input v-model="searchProfileTerm" placeholder="Buscar perfil por nombre..." class="text-input" style="width: 70%;"/>
                <select v-model="searchTypeProfile" class="text-input" style="width: 25%;">
                    <option value="Individual">Individual</option>
                    <option value="Group">Grupo</option>
                    <option value="All">Todos</option>
                </select>
              </div>
              
              <div v-if="getFilteredProfiles.length !== 0" v-for="profile in getFilteredProfiles" :key="profile._id" style="width: 100%;">
                <div style="display: inline-flex; width: 91.5%; height: 40px; align-items: center; justify-content: space-between;">

                  <div style="display: inline-flex; align-items: center; justify-content: left; width: 75%;">
                    <p class="profile-name">{{ profile.profileType == 'Individual' ? profile.users[0].username : profile.name }}</p>
                    <span v-if="profile.profileType !== 'Individual'" @click="handleSelectProfile(profile)" style="vertical-align: middle; cursor: pointer; margin-right: 2px;" class="material-symbols-outlined">edit</span>
                    <span v-if="profile.profileType === 'Group'" @click="deleteProfile(profile._id)" style="vertical-align: middle; cursor: pointer; margin: 0;" class="material-symbols-outlined">delete</span>
                    <span v-if="profile.profileType === 'Individual'"  @click="deleteProfile(profile._id)" style="vertical-align: middle; cursor: pointer; margin: 0;" class="material-symbols-outlined">person_remove</span>
                  </div>

                  <select v-model="profileWsPerms[profile._id]" @change="changeWsPerms(profileWsPerms[profile._id], profile._id)" class="text-input" style="width: 25%; margin: 0%; padding: 0;">
                    <option value="Read">Lectura</option>
                    <option value="Write">Escritura</option>
                    <option v-if="userWsPerms === 'Owner'" value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <p v-else style="margin-top: 0;">Aún no hay perfiles en el workspace</p>
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

      <button class="change-workspace-button">Cambiar</button>
      <li class="main-sidebar-title">Inicio</li>
      <li class="li-clickable">Gestionar perfil</li>

      <li class="main-sidebar-subtitle">Workspace actual
        <span v-if="['Owner', 'Admin'].includes(userWsPerms)" @click="selectItem('wsDetails', true)" style="position: absolute; right: 12%; text-align: right; cursor: pointer; vertical-align: middle;" class="material-symbols-outlined">tune</span>
        <span v-if="['Owner', 'Admin', 'Write'].includes(userWsPerms)" @click="openNewItemModal('Folder')" style="position: absolute; right: 21%; text-align: right; cursor: pointer; vertical-align: middle" class="material-symbols-outlined">add</span>
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
  
  <!-- Modal de nuevo item --> 
  <Modal class="modal" :isOpen="isNewItemModalOpened" @modal-close="closeNewItemModal" name="item-modal">
    <template #header><strong>Crear {{ translateItemType(newItem.itemType) }}</strong></template>
    <template #content>
      <div class="error" v-if="errorMessage.length !== 0" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
          <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="margin-top: 20px">              
          <input type="text" v-model="newItem.name" placeholder="Nombre de item..." class="text-input" style="margin-bottom: 5px;"/>
      </div>
      <button @click="handleNewItemForm()" style="margin-top:15px">Crear</button>
    </template>
  </Modal>

  <!-- Modal de perfil --> 
  <Modal class="modal" :isOpen="isModalOpened" @modal-close="closeModal" name="profile-modal">
    <template #header v-if="selectedProfile"><strong>Editar perfil</strong></template>
    <template #header v-else><strong>Crear nuevo perfil grupal</strong></template>
    <template #content>
      <div class="error" v-if="errorMessage.length !== 0" style="padding-left: 5%; padding-right: 5%; margin-top: 10px;">
        <p style="margin-top: 5px; margin-bottom: 5px; text-align: center" v-for="error in errorMessage">{{ error }}</p>
      </div>

      <div style="margin-top: 20px; justify-content: center;"> 
        <div style="display: flex; justify-content: space-between; align-items: center; margin-left: 5px; margin-right: 5px;">
          <input type="text" v-model="modalProfile.name" maxlength="60" placeholder="Nombre de perfil..." class="text-input" style="width: 70%;"/>

          <select v-model="modalProfile.wsPerm" class="text-input" style="width: 25%;">
            <option value="Read">Lectura</option>
            <option value="Write">Escritura</option>
            <option v-if="userWsPerms === 'Owner'" value="Admin">Admin</option>
          </select>
        </div>

        <div style="display: inline-flex; width: 100%; align-items: center; justify-content: space-between; margin-top: 10px; margin-bottom: 5px; margin-left: 5px;">
          <input v-model="searchModalProfileTerm" placeholder="Buscar por nombre de usuario..." class="text-input" style="width: 96.5%;"/>
        </div>

        <div v-for="user in getIndividualProfiles" style="height: 80%; overflow-y: auto; width: 100%;">
          <div style="display: inline-flex; width: 95%; height: 40px; align-items: center; justify-content: space-between;">
            <p style="margin-right: 10px;">{{ user.username }}</p>
            <button v-if="isUserInModalProfile(user)" @click="setModalProfileUsers(user)" class="change-perm-button remove-perm-button">Quitar</button>
            <button v-else @click="setModalProfileUsers(user)" class="change-perm-button">Añadir</button>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <button style="margin-top:15px" @click="saveProfile().then(() => closeModal())">Guardar</button>
    </template>
  </Modal>

</template>

<style scoped>

#message {
      visibility: hidden;
      background-color: #C8B1E4;
      color: #000000;
      text-align: center;
      border-radius: 5px;
      padding: 10px;
      position: fixed;
      z-index: 1;
      font-size: 1em;
      font-weight: 500;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      margin-left: -50px;
    } 

table {
    width: 100%;
    border-collapse: collapse;
  }
  .td-center {
    text-align: center;
    padding: 8px;
    padding-right: 4%;
  }

.container {
  display: flex;
  align-items: center;
  position: relative;
}

.items-container {
  width: 80vw;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: left;
  flex-direction: column;
}

.text-input {
  border-radius: 5px;
  margin-bottom: 5px;
  height: 30px;
  width: 90%;
  background-color: #f2f2f2;
  color: black;
}

.workspace-input {
  border-radius: 5px;
  margin-bottom: 5px;
  height: 30px;
  width: 90%;
  background-color: #f2f2f2;
  color: black;
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

.main-content {
  z-index: 1;
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

.invite-button {
  margin: 0;
  flex-shrink: 0;
  margin-right: 9%;
  margin-left: 15px;
  height: 30px;
  width: 80px;
  border-radius: 8px;
  padding: 0;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #C8B1E4;
  color: black;
  cursor: pointer;
}

.workspace-name-button {
  width: 90px; 
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
  margin-right: 10px;
}

.change-perm-button {
  width: 25%; 
  height: 30px;
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

.remove-perm-button {
  background-color: #c55e5e;
}

.profile-name {
  max-width: 81%;
  margin-right: 5px;
  word-wrap: break-word; 
  display: -webkit-box; 
  -webkit-line-clamp: 1; 
  -webkit-box-orient: vertical; 
  overflow: hidden;
}

.scrollable {
  scrollbar-color: #C8B1E4 transparent;
  scroll-behavior: smooth;
}

</style>