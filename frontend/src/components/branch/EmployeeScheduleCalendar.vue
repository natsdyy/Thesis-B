<script setup>
  import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
  import FullCalendar from '@fullcalendar/vue3';
  import dayGridPlugin from '@fullcalendar/daygrid';
  import timeGridPlugin from '@fullcalendar/timegrid';
  import interactionPlugin from '@fullcalendar/interaction';
  import { useLeaveStore } from '../../stores/leaveStore';

  const props = defineProps({
    employee: { type: Object, required: true },
    branchId: { type: [String, Number], required: false }, // Made optional for department employees
    // schedules map from store: key `${employee_id}_${YYYY-MM-DD}` -> schedule obj
    schedules: { type: Object, required: true },
    isOpen: { type: Boolean, default: false },
    inline: { type: Boolean, default: false },
    // When false, render only the time range (hide shift name like "Regular")
    showShiftLabel: { type: Boolean, default: true },
  });

  const emit = defineEmits(['close']);

  const leaveStore = useLeaveStore();
  const calendarRef = ref(null);
  const currentRange = ref({ startStr: '', endStr: '' });
  const currentViewType = ref('dayGridMonth');
  const viewportWidth = ref(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  const headerText = computed(
    () => `${props.employee.first_name} ${props.employee.last_name} • Schedule`
  );

  // Consistent colors with EmployeeSchedule table
  const shiftColorHex = (name) => {
    const map = {
      'Morning Shift': { bg: '#bfdbfe', text: '#1e40af', solid: '#3b82f6' },
      'Afternoon Shift': { bg: '#bbf7d0', text: '#065f46', solid: '#10b981' },
      'Night Shift': { bg: '#e9d5ff', text: '#6b21a8', solid: '#8b5cf6' },
      'Day Off': { bg: '#f3f4f6', text: '#6b7280', solid: '#9ca3af' },
      'On Leave': { bg: '#fed7aa', text: '#9a3412', solid: '#ea580c' },
    };
    return map[name] || { bg: '#e5e7eb', text: '#374151', solid: '#6b7280' };
  };

  const isEmployeeOnLeave = (employeeId, dateString) => {
    // Check if employee has approved leave for this date
    const date = new Date(dateString);
    const leaveRequests = leaveStore.allLeaveRequests || [];

    return leaveRequests.some(
      (request) =>
        request.employee_id === employeeId &&
        (request.status === 'approved_by_hr' ||
          request.status === 'approved_by_manager') &&
        new Date(request.from_date) <= date &&
        new Date(request.to_date) >= date
    );
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
    handleWindowResize: true,
    expandRows: true,
    nowIndicator: true,
    stickyHeaderDates: true,
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    slotDuration: '01:00:00',
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: true },
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
      const isDayOff = arg.event.title === 'Day Off';
      root.className = `cs-event-pill${isDayOff ? ' day-off' : ''}`;
      // Prefer custom label; otherwise show "time + title" instead of just time
      const fallback = props.showShiftLabel
        ? arg.timeText
          ? `${arg.timeText} ${arg.event.title || ''}`.trim()
          : arg.event.title || ''
        : arg.timeText || '';
      let label = arg.event.extendedProps?.label || fallback;
      // Truncate label based on viewport so it never exceeds cell width
      const maxLen =
        viewportWidth.value < 640 ? 22 : viewportWidth.value < 1024 ? 28 : 36;
      if (label.length > maxLen) {
        label = label.slice(0, maxLen - 1) + '…';
      }
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

  function updateCalendarForViewport(width) {
    const calendarApi = calendarRef.value?.getApi?.();
    if (!calendarApi) return;

    const isMobile = width < 640; // < sm
    const isTablet = width >= 640 && width < 1024; // sm - md/lg

    // Toolbar: simplify on small screens
    if (isMobile) {
      calendarApi.setOption('headerToolbar', {
        left: 'prev',
        center: 'title',
        right: 'next today timeGridWeek',
      });
      calendarApi.setOption('dayMaxEvents', 2);
      calendarApi.setOption('aspectRatio', 0.85);
      if (calendarApi.view?.type !== 'timeGridWeek') {
        calendarApi.changeView('timeGridWeek');
      }
    } else if (isTablet) {
      calendarApi.setOption('headerToolbar', {
        left: 'prev,next',
        center: 'title',
        right: 'today dayGridMonth,timeGridWeek',
      });
      calendarApi.setOption('dayMaxEvents', 3);
      calendarApi.setOption('aspectRatio', 1.05);
      if (calendarApi.view?.type !== 'dayGridMonth') {
        calendarApi.changeView('dayGridMonth');
      }
    } else {
      calendarApi.setOption('headerToolbar', {
        left: 'title',
        center: '',
        right: 'prev,next today dayGridMonth,timeGridWeek',
      });
      calendarApi.setOption('dayMaxEvents', 3);
      calendarApi.setOption('aspectRatio', 1.35);
      if (calendarApi.view?.type !== 'dayGridMonth') {
        calendarApi.changeView('dayGridMonth');
      }
    }
  }

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

      // Check if employee is on leave for this date
      if (isEmployeeOnLeave(empId, dayKey)) {
        return; // Skip adding schedule events when employee is on leave
      }

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
          const labelText =
            (sched.shift?.name || sched.shift_name) === 'Day Off'
              ? shortTitle(sched)
              : props.showShiftLabel
                ? `${formatClock(startDate)} - ${formatClock(endDate)} ${shortTitle(sched)}`
                : `${formatClock(startDate)} - ${formatClock(endDate)}`;
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
              label: labelText,
            },
          });
        } else {
          // Week/time views: show as one continuous event across days
          const labelText =
            (sched.shift?.name || sched.shift_name) === 'Day Off'
              ? shortTitle(sched)
              : props.showShiftLabel
                ? `${formatClock(startDate)} - ${formatClock(endDate)} ${shortTitle(sched)}`
                : `${formatClock(startDate)} - ${formatClock(endDate)}`;
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
              label: labelText,
            },
          });
        }
      } else {
        const labelText = props.showShiftLabel
          ? `${formatClock(startDate)} - ${formatClock(endDate)} ${shortTitle(sched)}`
          : `${formatClock(startDate)} - ${formatClock(endDate)}`;
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
            label: labelText,
          },
        });
      }
    });

    // Add leave events for days when employee is on leave
    const leaveRequests = leaveStore.allLeaveRequests || [];
    const employeeLeaveRequests = leaveRequests.filter(
      (request) =>
        request.employee_id === empId &&
        (request.status === 'approved_by_hr' ||
          request.status === 'approved_by_manager')
    );

    employeeLeaveRequests.forEach((leaveRequest) => {
      const startDate = new Date(leaveRequest.from_date);
      const endDate = new Date(leaveRequest.to_date);

      // Create all-day leave events for each day in the leave period
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayKey = formatDateKey(currentDate);
        const colors = shiftColorHex('On Leave');

        events.push({
          id: `leave-${leaveRequest.id}-${dayKey}`,
          title: 'On Leave',
          start: currentDate.toISOString(),
          allDay: true,
          backgroundColor: colors.bg,
          borderColor: colors.solid,
          textColor: colors.text,
          classNames: ['cs-event', 'leave-event'],
          extendedProps: {
            leaveType: leaveRequest.leave_type,
            reason: leaveRequest.reason,
            label: `On Leave - ${leaveRequest.leave_type}`,
          },
        });

        currentDate.setDate(currentDate.getDate() + 1);
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

  watch(
    () => leaveStore.allLeaveRequests,
    () => refreshEvents(),
    { deep: true }
  );

  onMounted(async () => {
    // Load leave data for the employee
    try {
      // Fetch all leave requests to ensure we have the latest data
      await leaveStore.fetchAllLeaveRequests({
        page: 1,
        limit: 1000,
      });
    } catch (error) {
      console.warn('Could not load leave data:', error);
    }

    // Ensure the initial events are loaded when modal opens
    setTimeout(refreshEvents, 0);
    // Track viewport and update calendar layout
    const onResize = () => {
      viewportWidth.value = window.innerWidth;
      updateCalendarForViewport(viewportWidth.value);
    };
    window.addEventListener('resize', onResize, { passive: true });
    // Initial update
    updateCalendarForViewport(viewportWidth.value);
    // Store remover
    resizeCleanup = () => window.removeEventListener('resize', onResize);
  });

  let resizeCleanup = null;

  onUnmounted(() => {
    if (typeof resizeCleanup === 'function') resizeCleanup();
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
    --fc-button-bg-color: #466114;
    --fc-button-border-color: #466114;
    --fc-button-hover-bg-color: #466114;
    --fc-button-hover-border-color: #466114;
    --fc-button-text-color: #ffffff;
    --fc-button-border-radius: 10px;
    --fc-today-bg-color: rgba(20, 83, 45, 0.06);
  }

  /* Ensure calendar shrinks nicely and toolbar wraps on small screens */
  :deep(.fc) {
    width: 100%;
  }
  :deep(.fc .fc-toolbar) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  :deep(.fc .fc-toolbar-chunk) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  :deep(.fc .fc-toolbar-title) {
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    :deep(.fc .fc-toolbar-title) {
      font-size: 1rem;
    }
    :deep(.fc .fc-button) {
      padding: 0.25rem 0.45rem;
      font-size: 0.75rem;
    }
    :deep(.fc .fc-daygrid-day-number) {
      font-size: 0.75rem;
    }
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
  .cs-event-pill.day-off {
    justify-content: center !important;
    text-align: center !important;
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
