<script setup>
  import { ref, watch, onMounted, computed } from 'vue';
  import FullCalendar from '@fullcalendar/vue3';
  import dayGridPlugin from '@fullcalendar/daygrid';
  import timeGridPlugin from '@fullcalendar/timegrid';
  import interactionPlugin from '@fullcalendar/interaction';

  const props = defineProps({
    employee: { type: Object, required: true },
    branchId: { type: [String, Number], required: true },
    // schedules map from store: key `${employee_id}_${YYYY-MM-DD}` -> schedule obj
    schedules: { type: Object, required: true },
    isOpen: { type: Boolean, default: false },
    inline: { type: Boolean, default: false },
  });

  const emit = defineEmits(['close']);

  const calendarRef = ref(null);
  const currentRange = ref({ startStr: '', endStr: '' });
  const currentViewType = ref('dayGridMonth');

  const headerText = computed(
    () => `${props.employee.first_name} ${props.employee.last_name} • Schedule`
  );

  // Consistent colors with EmployeeSchedule table
  const shiftColorHex = (name) => {
    const map = {
      'Morning Shift': { bg: '#bfdbfe', text: '#1e40af', solid: '#3b82f6' },
      'Afternoon Shift': { bg: '#bbf7d0', text: '#065f46', solid: '#10b981' },
      'Night Shift': { bg: '#e9d5ff', text: '#6b21a8', solid: '#8b5cf6' },
    };
    return map[name] || { bg: '#e5e7eb', text: '#374151', solid: '#6b7280' };
  };

  const calendarOptions = ref({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'title',
      center: '',
      right: 'prev,next today dayGridMonth,timeGridWeek',
    },
    height: 'auto',
    selectable: false,
    editable: false,
    weekends: true,
    events: [],
    displayEventEnd: true,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: true },
    eventDisplay: 'block',
    dayMaxEvents: 3,
    buttonText: { today: 'today', month: 'month', week: 'week' },
    eventContent(arg) {
      const root = document.createElement('div');
      root.className = 'cs-event-pill';
      const label =
        arg.event.extendedProps?.label || arg.timeText || arg.event.title || '';
      const span = document.createElement('span');
      span.className = 'cs-event-title';
      span.textContent = label;
      root.appendChild(span);
      return { domNodes: [root] };
    },
    eventDidMount(info) {
      info.el.classList.add(
        'rounded-lg',
        'border',
        'text-[11px]',
        'font-medium'
      );
      const start = info.event.start;
      const end = info.event.end;
      if (start && end) {
        const fmt = (d) =>
          d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        info.el.title = `${fmt(start)} - ${fmt(end)}\n${info.event.title}`;
      }
    },
    datesSet(info) {
      currentRange.value = { startStr: info.startStr, endStr: info.endStr };
      // Track current view to customize overnight rendering in month vs week
      currentViewType.value = info.view?.type || currentViewType.value;
      refreshEvents();
    },
  });

  function formatDateKey(date) {
    return new Date(date).toISOString().split('T')[0];
  }

  function toEventsFromSchedules() {
    const events = [];
    const empId = props.employee.id;

    const formatClock = (d) =>
      new Date(d).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    const shortTitle = (s) =>
      (s.shift?.name || s.shift_name || '').replace(' Shift', '');

    Object.keys(props.schedules).forEach((key) => {
      const sched = props.schedules[key];
      if (sched.employee_id !== empId) return;

      const dayKey = formatDateKey(sched.schedule_date);
      const startClock = sched.shift?.startTime || sched.start_time || '00:00';
      const startIso = `${dayKey}T${startClock}`;
      const endTime = sched.shift?.endTime || sched.end_time || '00:00';

      // Handle cross-midnight shifts: if end <= start, add one day
      const startDate = new Date(startIso);
      const [endH, endM] = endTime.split(':').map((v) => parseInt(v, 10));
      const endDate = new Date(startDate);
      endDate.setHours(endH, endM, 0, 0);
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }

      const colors = shiftColorHex(sched.shift?.name || sched.shift_name);

      // Detect if event crosses midnight
      const crossesMidnight =
        startDate.toDateString() !== endDate.toDateString();

      if (crossesMidnight) {
        if (currentViewType.value === 'dayGridMonth') {
          // Month view: show only on the start day cell with full time range in label
          const endOfStart = new Date(startDate);
          endOfStart.setHours(23, 59, 59, 999);
          events.push({
            id: String(sched.id),
            title: sched.shift?.name || sched.shift_name,
            start: startDate.toISOString(),
            end: endOfStart.toISOString(),
            allDay: false,
            backgroundColor: colors.bg,
            borderColor: colors.solid,
            textColor: colors.text,
            classNames: ['cs-event'],
            extendedProps: {
              notes: sched.notes || '',
              label: `${formatClock(startDate)} - ${formatClock(endDate)} ${shortTitle(sched)}`,
            },
          });
        } else {
          // Week/time views: show as one continuous event across days
          events.push({
            id: String(sched.id),
            title: sched.shift?.name || sched.shift_name,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            allDay: false,
            backgroundColor: colors.bg,
            borderColor: colors.solid,
            textColor: colors.text,
            classNames: ['cs-event'],
            extendedProps: {
              notes: sched.notes || '',
              label: `${formatClock(startDate)} - ${formatClock(endDate)} ${shortTitle(sched)}`,
            },
          });
        }
      } else {
        events.push({
          id: String(sched.id),
          title: sched.shift?.name || sched.shift_name,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          allDay: false,
          backgroundColor: colors.bg,
          borderColor: colors.solid,
          textColor: colors.text,
          classNames: ['cs-event'],
          extendedProps: {
            notes: sched.notes || '',
            label: `${formatClock(startDate)} - ${formatClock(endDate)} ${shortTitle(sched)}`,
          },
        });
      }
    });
    return events;
  }

  function refreshEvents() {
    const calendarApi = calendarRef.value?.getApi?.();
    if (!calendarApi) return;
    calendarApi.removeAllEventSources();
    calendarApi.addEventSource(toEventsFromSchedules());
  }

  watch(
    () => props.schedules,
    () => refreshEvents(),
    { deep: true }
  );

  onMounted(() => {
    // Ensure the initial events are loaded when modal opens
    setTimeout(refreshEvents, 0);
  });

  function closeModal() {
    emit('close');
  }
</script>

<template>
  <template v-if="inline">
    <div class="card bg-white shadow-lg">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg">{{ headerText }}</h3>
        </div>
        <FullCalendar ref="calendarRef" :options="calendarOptions" />
      </div>
    </div>
  </template>
  <template v-else>
    <div v-if="isOpen" class="modal modal-open">
      <div class="modal-box w-full max-w-5xl">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg">{{ headerText }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeModal">
            Close
          </button>
        </div>
        <FullCalendar ref="calendarRef" :options="calendarOptions" />
      </div>
    </div>
    <div v-else />
  </template>
</template>

<style scoped>
  :deep(.fc) {
    --fc-border-color: #e5e7eb;
    --fc-button-bg-color: #14532d;
    --fc-button-border-color: #14532d;
    --fc-button-hover-bg-color: #166534;
    --fc-button-hover-border-color: #166534;
    --fc-button-text-color: #ffffff;
    --fc-button-border-radius: 10px;
    --fc-today-bg-color: rgba(20, 83, 45, 0.06);
  }

  :deep(.fc .cs-event) {
    border-radius: 10px;
    background-color: var(--cs-event-bg, #eef2ff) !important;
    border: 1px solid var(--cs-event-border, #c7d2fe) !important;
    color: var(--cs-event-text, #1e293b) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }

  .cs-event-pill {
    display: flex;
    gap: 6px;
    align-items: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cs-event-time {
    opacity: 0.9;
    font-weight: 600;
  }
  .cs-event-title {
    opacity: 0.95;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :deep(.fc-daygrid-event) {
    padding: 2px 6px !important;
  }
  :deep(.fc .cs-event) {
    width: 100%;
    box-sizing: border-box;
  }
</style>
