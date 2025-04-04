<script setup>
import { ref, computed, watch, onBeforeMount } from 'vue'
import { useRouter } from 'vue-router';
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es';
import WorkspaceUtils from '../utils/WorkspaceFunctions.js';

const props = defineProps({
  ws: {
    type: Object,
    required: true
  },
  workspace: {
    type: Object,
    required: true
  },
  item: {
    type: Object,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  currentUser: {
    type: Object,
    required: true
  }
});

const router = useRouter();
const item = ref(props.item);
const eventGuid = ref(0);
const showModal = ref(false);
const selectedEvent = ref(null);
const modalTop = ref(0);
const modalLeft = ref(0);
const editing = ref(false);
const editingEvent = ref({});
const calendar = ref(null);
const isNewEvent = ref(false);
const itemPermission = ref(props.routedItemPerm);
const navigateToPreviousFolder = () => {
  WorkspaceUtils.navigateToPreviousFolder(ref(props.path), router);
};

const createEventId = () => {
  return String(eventGuid.value++)
};

const parseDate = (date) => {
  const parsedDate = new Date(date);
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseSpanishStartDate = (date) => {
  return parseDate(date).split('-').reverse().join('/');
};

const parseSpanishEndDate = (date) => {
  return parseFormEndDate(date, true).split('-').reverse().join('/');
};
 
const parseFormEndDate = (date, init) => {
  const parsedDate = date
  if (init) {
    parsedDate.setDate(parsedDate.getDate() - 1);
  } else {
    parsedDate.setDate(parsedDate.getDate() + 1);
  }
  return parseDate(parsedDate);
};
 
let events = ref([]);

const handleDateSelect = (selectInfo) => {
  selectedEvent.value = selectInfo;
  showModal.value = true;
  placeModal(selectInfo);
  editing.value = true;
  isNewEvent.value = true;
  handleStartEdit(selectInfo);
};

const placeModal = (clickInfo) => {
  const modalWidth = 300
  const modalHeight = 200 
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const clickX = clickInfo.jsEvent.clientX - (modalWidth / 2);
  const clickY = clickInfo.jsEvent.clientY - (modalHeight / 2);
  modalTop.value = clickY > screenHeight / 2 ? clickY - modalHeight + 100 : clickY + 100;
  modalLeft.value = clickX > screenWidth / 2 ? clickX - modalWidth - 150  : clickX + 150;
};

const handleEventClick = (clickInfo) => {
  selectedEvent.value = clickInfo.event;
  showModal.value = true;
  placeModal(clickInfo);
};
  
const closeModal = () => {
  showModal.value = false
  selectedEvent.value = null
  editing.value = false
  isNewEvent.value = false
};

const handleEvents = async (events) => {
  const eventsAux = events.map(event => {
    return {
      title: event.title,
      start: event.start,
      end: event.end==null?event.start:event.end,
    }
  })

  const itemEventsAux = item.value.events.map(event => {
    return {
      title: event.title,
      start: new Date(event.start),
      end: event.end==null ? new Date(event.start):new Date(event.end),
    }
  })

  if (JSON.stringify(eventsAux) === JSON.stringify(itemEventsAux)){
    return;
  } else {
    item.value.events = eventsAux;
  }
  try {
    const response = await fetch(import.meta.env.VITE_BACKEND_URL + "/item", {
      method: 'PUT',
      credentials: "include",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workspace: props.workspace._id,
        item: item.value
      })
    });

    if (!response.ok){
      console.error('Error al actualizar el evento')
    }
  } catch (error) {
    console.log(error)
  }
};

const calendarOptions = computed(() => ({
  plugins: [
      dayGridPlugin,
      timeGridPlugin,
      interactionPlugin 
  ],
  headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: 'today'
  },
  locales: [ esLocale ],
  timeZone: 'UTC',
  height: 650,
  initialView: 'dayGridMonth',
  eventSources: [
    events.value,
  ],
  editable: true,
  selectable: true,
  selectMirror: true,
  dayMaxEvents: true,
  weekends: true,
  select: handleDateSelect,
  eventClick: handleEventClick,
  eventsSet: handleEvents,
  editable: itemPermission.value && itemPermission.value !== "Read",
  selectable: itemPermission.value && itemPermission.value !== "Read",
  eventStartEditable: itemPermission.value && itemPermission.value !== "Read",
  eventDurationEditable: itemPermission.value && itemPermission.value !== "Read",
  droppable: itemPermission.value && itemPermission.value !== "Read",
}));

const handleStartEdit = (selectedEvent) => {
  editingEvent.value = {
    id: selectedEvent.id,
    title: selectedEvent.title,
    start: parseDate(selectedEvent.start),
    end: selectedEvent.end?parseFormEndDate(selectedEvent.end, true):parseDate(selectedEvent.start)
  };
  editing.value = true;
};

const handleDeleteEvent = (selectedEvent) => {
  if (selectedEvent.id){
    const event = calendar.value.getApi().getEventById(selectedEvent.id);
    event.remove();
    handleEvents(item.value.events);
    closeModal();
  }
};

const handleFinishEdit = () => {
  if (!editingEvent.value.title || editingEvent.value.title.trim()=="" || !editingEvent.value.start || editingEvent.value.start.trim() == ""){
    alert('Por favor, rellene al menos los campos de título y fecha de inicio.')
    return;
  }
  if (editingEvent.value.end && editingEvent.value.end.trim() !== "" && new Date(editingEvent.value.start) > new Date(editingEvent.value.end)){
    alert('La fecha de inicio no puede ser mayor a la fecha de fin.')
    return;
  }

  if (editingEvent.value.id) {
    const event = calendar.value.getApi().getEventById(editingEvent.value.id); 
    if (event.title !== editingEvent.value.title){
      event.setProp('title', editingEvent.value.title);
    }
    editing.value = false;
    event.setDates(parseDate(new Date(editingEvent.value.start)), editingEvent.value.end?parseFormEndDate(new Date(editingEvent.value.end), false):parseDate(new Date(editingEvent.value.start)), {allDay: true});
    selectedEvent.value = event;
    closeModal();
  } else {
    const newEvent = {
      title: editingEvent.value.title,
      start: parseDate(new Date(editingEvent.value.start)),
      end: parseFormEndDate(new Date(editingEvent.value.end), false),
      allDay: true
    }

    newEvent.id = createEventId();
    calendar.value.getApi().addEvent(newEvent);
    editing.value = false;
    closeModal();
  }
};

const verifyPermissions = () => {
  if (!item.value || item.value == 'Not found'){
    itemPermission.value = "None";
    return;
  }
  itemPermission.value = WorkspaceUtils.verifyPerms(item.value, ref(props.workspace), ref(props.currentUser));
};

onBeforeMount(async () => {
  events.value = [];
  item.value.events.forEach(event => {
    events.value.push({
      id: event._id,
      title: event.title,
      start: parseDate(event.start),
      end: parseDate(event.end),
      allDay: true
    })
  })
  verifyPermissions();
})

const refreshKey = ref(0);

watch(() => props.workspace, (newWorkspace) => {
  item.value = newWorkspace.items.find(it => it._id === item.value._id);
  verifyPermissions();
}, { immediate: true }); 

watch(item, (newVal, _ ) =>  {
  if (!newVal){
    return;
  }
  events.value = [];
  item.value.events.forEach(event => {
    events.value.push({
      id: event._id,
      title: event.title,
      start: parseDate(event.start),
      end: parseDate(event.end),
      allDay: true
    })
  })
  calendar.value?.getApi().refetchEvents();
}, { immediate: true });

watch(() => events.value, (_) => {
  calendar.value?.getApi().refetchEvents();
  calendar.value?.getApi().render();
}, { immediate: true });
</script>

<template>
  <div v-if="item">
    <div style="display:flex; flex-direction: column; align-items: center;" >
    <div class="main-content" style="display: flex; justify-content: center; align-items: center; word-wrap: break-word; justify-content: space-between; width: 91.5%;">
        <div style="display:flex; justify-content: start;  width: 10vw;">
          <button style=" " @click="navigateToPreviousFolder()"><span class="material-symbols-outlined">arrow_back</span></button>
        </div>
        <div style="display: flex; justify-content: center; align-items: center; word-wrap: break-word; line-break: anywhere; justify-self: start;">
          <h1 @click="$router.push('/workspace/')" style="cursor: pointer; display: flex; align-items: center; margin-right: 10px;">
            <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
            <span class="item-name-title" style="padding-bottom:10px">{{ item.name }}</span>
          </h1>
        </div>
        <div style="width: 10vw;" >
          
        </div>
      </div>
    <div style="padding: 40px; background-color: #1E2B37;border-radius: 35px; width: 90%;">
      <FullCalendar :key="refreshKey" ref="calendar" style="color: white;" :options='calendarOptions'>
        <template v-slot:eventContent='arg'>
          <b>{{ arg.timeText }}</b>
          <i>{{ arg.event.title }}</i>
        </template>
      </FullCalendar>
      <div v-if="showModal" class="modal-overlay" @click="closeModal">
        <div class="modal" :style="{ top: modalTop + 'px', left: modalLeft + 'px' }" @click.stop>
          <div v-if="!editing">
            <h2>{{ selectedEvent.title }}</h2>
            <p>Inicio: {{ parseSpanishStartDate(selectedEvent.start) }}</p>
            <p> {{ selectedEvent.end?"Fin: " + parseSpanishEndDate(selectedEvent.end):"" }}</p>
            <button v-if="itemPermission !== 'Read'" @click="handleStartEdit(selectedEvent)" style="margin-right:5px">Editar</button>
            <button v-if="itemPermission !== 'Read'" class="red-button" @click="handleDeleteEvent(selectedEvent)" style="width: 100px; margin-left:5px">Eliminar</button>
          </div>
          <div class="modal-form" v-else style="display: flex; flex-direction: column; align-items: center;">
            <h2>{{ editingEvent.id?"Editar evento":"Crear nuevo evento" }}</h2>
            <input class="modal-input" type="text" v-model="editingEvent.title" style="width: 100%; background-color: white; color: black; margin-bottom:10px">
            <input class="modal-input" type="date" v-model="editingEvent.start" style="width: 200px;background-color: white; color: black; margin-bottom:10px">
            <input type="date" v-model="editingEvent.end" style="width: 200px;background-color: white; color: black; margin-bottom:10px">
            <button @click="handleFinishEdit" style="width: 100px;">Guardar</button>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
  <div v-else>
      <div class="main-content" style="display: flex; justify-content: center; align-items: center; word-wrap: break-word;">
        <h1 @click="$router.push('/workspace/')" style="cursor: pointer; display: flex; align-items: center; margin-right: 10px">
          <span style="color: #C8B1E4; font-size: 60px;" class="material-symbols-outlined">home</span>
          {{ workspace?.name }}
        </h1>
      </div>
      <h2>No se encuentra el item. Puede que haya sido movido o eliminado, o que se te hayan revocado los permisos.</h2>
    </div>
</template>

<style>
.modal-form{
  display: flex;
  flex-direction: column;
  align-items: center;
}

.modal-form input{
  width: 200px;
  background-color: white;
  color: black; 
  margin-bottom: 10px;
}

.modal-form button{
  width: 50px; 
}

b { 
  color: black;
  margin-right: 3px;
}

.fc {
  max-width: 1100px;
  margin: 0 auto;
}

.fc .fc-day-today {
  background-color: #61556e9c !important; 
}

.fc .fc-daygrid-day-number {
  color: white; /*Días del mes */
}

.fc .fc-col-header-cell-cushion { 
   color: white; /*Días de la semana */
}

.fc .fc-event {
  background-color: #c8b1e4da;
  border-color: #c8b1e4da; 
  color: black;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fc .fc-event-main {
  color: black;
  border-color: #1E2B37;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
}

.modal {
  background-color: #61556e;
  border: 3px solid #1E2B37;
  padding: 20px;
  border-radius: 5px;
  position: absolute;
  width: 550px;
  
}
.modal h2 {
  color: white;
  margin-bottom: 10px;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.i{
  word-wrap: break-word;  
  overflow: hidden;
  text-overflow: ellipsis;
}

.fc-daygrid-more-link {
  color: white;
} 

.fc-daygrid-more-link:hover {
  color: white;
}

.red-button {
  background-color: #c55e5e; 
}

</style>