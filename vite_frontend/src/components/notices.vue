<script>
import { ref, onMounted, onUnmounted, nextTick, onBeforeMount, watchEffect, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

export default {
  setup() {

    const router = useRouter();
    const route = useRoute();
    const path = ref("");
    const currentUser = ref(null);
    const showMainSidebar = ref(false);
    const workspace = ref(null);
    const isNewItemModalOpened = ref(false);
    const errorMessage = ref([]);
    const newItem = ref({});

    const fetchNotices = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/workspace/notices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
          body: JSON.stringify({ wsId: workspace.value })
        });

        if (response.ok) {
          const data = await response.json();
          workspace.value = data;
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
    };

    const fetchUser = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/user', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          currentUser.value = data.user;
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        }
      } catch (error) {
        console.log(error);
      }
    };

    const selectItem = async (item) => {
      if ((item == 'wsDetails' || item == 'notices' || item == 'favorites')) {
        router.push('/workspace/' + item);
        return;
      }

      if (item.itemType === 'Folder') {
        router.push('/workspace' + (item.path ? '/' + item.path : '') + '/' + item.name);
        return;
      }
    };

    const openNewItemModal = (itemType) => {
      isNewItemModalOpened.value = true;
      newItem.value.name = '';

      if (itemType === 'Notice') {
        newItem.value.itemType = itemType;
        newItem.value.text = '';
        newItem.value.important = false;
      }
    };

    const closeNewItemModal = () => {
      isNewItemModalOpened.value = false;
      newItem.value = {};
      errorMessage.value = [];
    };

    const handleNewItemForm = async () => {
      try { 
        const itemType = newItem.value.itemType;

        if (itemType == 'Notice') {
          newItem.value.text = newItem.value.text;
          newItem.value.important = newItem.value.important;
        } 
        
        const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/item', {
          body: JSON.stringify({ workspace: workspace.value._id, path: path.value, item: newItem.value }),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });

        if (response.ok) {
          closeNewItemModal();
          await fetchNotices();
          errorMessage.value = [];
        } else if (response.status === 401) {
          router.push({ name: 'login' });
        } else if (response.status === 400 || response.status === 404) {
          errorMessage.value = [];
          response.json().then((data) => {
            if (data.error) {
              errorMessage.value.push(data.error);
            } else {
              data.errors.forEach((error) => {
                errorMessage.value.push(error.msg);
              });
            }
          throw new Error("Error al crear item");
          })
        }

      } catch (error) {
        console.log(error);
      }
    }
    
    const translateItemType = (item) => {
      switch (item) {
        case 'Notice':
          return 'Anuncio';
        case 'Folder':
          return 'Carpeta';
        default:
          return 'Ninguno';
      }
    }

    const formatDate = (date) => {
      const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
      return new Date(date).toLocaleDateString('es-ES', options);
    }

    onBeforeMount(() => {
      workspace.value = localStorage.getItem('workspace');
      fetchNotices();
    });

    return {
      workspace,
      currentUser,
      showMainSidebar,
      path,
      isNewItemModalOpened,
      errorMessage,
      newItem,
      fetchNotices,
      fetchUser,
      selectItem,
      openNewItemModal,
      closeNewItemModal,
      handleNewItemForm,
      translateItemType,
      formatDate,
    };
  }
}

</script>

<template>
  <div class="main-sidebar-overlay" v-if="showMainSidebar"></div>
  <div class="main-sidebar" :class="{ 'show': showMainSidebar }">

    <div :class="{ 'main-sidebar-toggle': true, 'main-sidebar-toggle-opened': showMainSidebar }">
      <span v-if="!showMainSidebar" @click="showMainSidebar = true" class="material-symbols-outlined"
        style="z-index: 1002">chevron_right</span>
      <span v-else @click="showMainSidebar = false" class="material-symbols-outlined"
        style="z-index: 1002">chevron_left</span>
    </div>

    <ul style="height: 85%; min-height: 85%;">
      <div style="display:flex; width: 50px; height: 50px;">
        <div style="margin-left: 35%"><img class="logo-img"
            src="https://i.pinimg.com/564x/27/bb/89/27bb898786b2fe976f67c318b91a5d2d.jpg"></img></div>
        <div
          style="margin-left: 65%; display:flex; align-items: center; justify-content: space-between; width: calc(100% - 40px);">
          <div style="text-align: center;">
            <p style="margin: 0; font-weight: bold;">APE</p>
            <p style="margin: 0;">{{ currentUser?.username }}</p>
          </div>
        </div>
      </div>

      <li
        style="font-weight: bolder; text-align: left; margin-left: 5%; margin-right: 5%; margin-bottom: 1%; margin-top: 3%; word-wrap: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
        {{ workspace?.name }}</li>
      <button class="change-workspace-button">Cambiar</button>

      <li class="main-sidebar-title">Inicio</li>
      <li class="li-clickable">Gestionar perfil</li>
      <li class="li-clickable">Gestionar workspaces</li>

      <li class="main-sidebar-subtitle">Workspace actual <span @click="openNewItemModal('Folder')"
          style="margin-left: 35%; text-align: right; cursor: pointer; vertical-align: middle"
          class="material-symbols-outlined">add</span></li>

      <li @click="selectItem('wsDetails')" :class="{ 'li-clickable': true }">Detalles del workspace</li>
      <li @click="selectItem('notices')" :class="{ 'li-clickable': true }">Anuncios</li>
      <li @click="selectItem('favorites')" :class="{ 'li-clickable': true, 'selected-folder': true }">Favoritos</li>

      <div class="scrollable" style="max-height: 35%; overflow-y: auto;">
        <div v-for="folder in workspace?.folders" :key="folder._id" style="word-wrap: break-word;">
          <li @click="selectItem(folder)" :class="{ 'li-clickable': true }"> {{ folder.name }}</li>
        </div>
      </div>

    </ul>
    <ul style="height: 5%;">
      <li style="text-align: right;"> <button style="margin-right: 5%;" @click="logout"><span
            class="material-symbols-outlined">logout</span></button> </li>
    </ul>
  </div>

  <div class="main-content" style="display: flex; justify-content: center; align-items: center; word-wrap: break-word;">
    <h1 @click="$router.push('/workspace/')"
      style="cursor: pointer; display: flex; align-items: center; margin-right: 10px">
      <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
      {{ workspace?.name }}
    </h1>
  </div>

  <div class="main-content" style="display:flex; flex-direction: column; align-items: center;">

    <div style="display: flex; justify-content: space-around; width: 87%; align-items: center;">
      <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; width: 85%">
        <button v-if="path !== ''" style=" max-height: 50px;" @click="$router.push('/workspace')"><span
            class="material-symbols-outlined">arrow_back</span></button>
        <h2
          style="text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-left: 1%;">
          Ruta actual: {{ path }}</h2>
      </div>

      <div style="display: flex; justify-content: flex-end; width: 15%;">
        <button @click="openNewItemModal('Notice')" style="max-height: 50px;">
          <span class="material-symbols-outlined">add</span>
        </button>
      </div>
    </div>
    
    <div class="main-content container">
      <div v-if="workspace?.notices?.length === 0">
        <p style="font-size: xx-large; font-weight: bolder;">Aún no hay anuncios...</p>
      </div>
      <div class="items-container">
        <div class="item-container" v-for="item in workspace?.notices" :key="item.id">

          <div style="display: flex; align-items: center;">
            <h2 class="item-name"> {{ item?.name }}
              <span v-if="item?.important" style="color: #c8373b; vertical-align: middle;" class="material-symbols-outlined">campaign</span>
            </h2>
            <h4 class="item-name" style="color: #525252">{{ formatDate(item?.uploadDate) }}</h4>
          </div>

          <p class="text-container">{{ item?.text }}</p>
        </div>
      </div>
    </div>
  </div>

  <Modal class="modal" :isOpen="isNewItemModalOpened" @modal-close="closeNewItemModal" name="item-modal">
      <template #header><strong>Crear {{ translateItemType(newItem.itemType) }}</strong></template>                
      <template #footer>
        <div style="margin-top:20px">

          <div class="error" v-if="errorMessage.length !== 0">
            <p style="margin-top: 5px; margin-bottom: 5px;" v-for="error in errorMessage">{{ error }}</p>
          </div>
            <input type="text" v-model="newItem.name" placeholder="Nombre de item..." style="border-radius: 5px; margin-right:5px;  margin-bottom: 5px; height: 30px; width: 300px; background-color: #f2f2f2; color: black;"/>
            <textarea v-if="newItem.itemType == 'Notice'" v-model="newItem.text" placeholder="Contenido..." maxlength="1000" style="border-radius: 5px; height: 100px; width: 300px; background-color: #f2f2f2; color: black; resize: none"></textarea>
            <div v-if="newItem.itemType == 'Notice'" style="display:flex; justify-content: center; align-items: center">
              Prioritario: <input type="checkbox" v-model="newItem.important" style="border-radius: 5px; margin: 12px; margin-top: 15px ; transform: scale(1.5);"></input>
            </div>
          </div>
          <button @click="handleNewItemForm()" style="margin-top:15px">Crear</button>
      </template>
    </Modal>
</template>

<style scoped>
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
  align-items: center;
  flex-direction: column;
}

.item-container {
  width: 95%;
  height: auto;
  margin: 10px;
  padding: 15px;
  color: black;
  background-color: #F2F2F2;
  border-radius: 10px;
  position: relative;
}

.item-name {
  margin: 0; 
  margin-left: 10px;
  margin-right: 10px;
  text-align: left;
  word-wrap: break-word;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  width: 100%;
}

.text-container {
  text-align: left;
  margin: 0; 
  margin-left: 10px;
  word-wrap: break-word;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  width: 99%;
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
}

.main-sidebar-overlay {
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: none;
}

.main-sidebar.show+.main-sidebar-overlay {
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
  width: 90%;
  height: auto;
  background-color: rgb(151, 47, 47);
  border-radius: 10px;
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

.scrollable {
  scrollbar-color: #C8B1E4 transparent;
  scroll-behavior: smooth;
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
  color:black;
  text-align: left;
  cursor: pointer;
  word-wrap: break-word; 
  display: -webkit-box; 
  -webkit-line-clamp: 1; 
  -webkit-box-orient: vertical; 
  overflow: hidden;
}

</style>