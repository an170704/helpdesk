<script setup>
import { computed } from 'vue'
import { DAY_KEYS, DAY_LABELS } from '../utils/businessHours'

const props = defineProps({
  schedule: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
})

const TIMEZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'UTC',
  'Europe/London',
  'America/New_York',
]

const timezoneOptions = computed(() => {
  const list = [...TIMEZONES]
  if (props.schedule.timezone && !list.includes(props.schedule.timezone)) {
    list.unshift(props.schedule.timezone)
  }
  return list
})

const days = DAY_KEYS.map((key) => ({ key, label: DAY_LABELS[key] }))

function dayIntervals(key) {
  return props.schedule.days[key] || []
}

function isDayEnabled(key) {
  return dayIntervals(key).length > 0
}

function toggleDay(key, enabled) {
  props.schedule.days[key] = enabled ? [['08:00', '12:00'], ['13:00', '17:00']] : []
}

function addBreak(key) {
  props.schedule.days[key].push(['13:00', '17:00'])
}

function removeBreak(key, index) {
  props.schedule.days[key].splice(index, 1)
}

function addHoliday() {
  props.schedule.holidays.push('')
}

function removeHoliday(index) {
  props.schedule.holidays.splice(index, 1)
}
</script>

<template>
  <div class="bh-editor">
    <div class="bh-field">
      <label for="bh-timezone">Timezone</label>
      <select id="bh-timezone" v-model="schedule.timezone" :disabled="disabled">
        <option v-for="zone in timezoneOptions" :key="zone" :value="zone">{{ zone }}</option>
      </select>
    </div>

    <div class="bh-days">
      <div v-for="day in days" :key="day.key" class="bh-day">
        <label class="checkbox-row bh-day-check">
          <input
            type="checkbox"
            :checked="isDayEnabled(day.key)"
            :disabled="disabled"
            @change="toggleDay(day.key, $event.target.checked)"
          />
          {{ day.label }}
        </label>

        <div v-if="isDayEnabled(day.key)" class="bh-intervals">
          <div v-for="(interval, index) in schedule.days[day.key]" :key="index" class="bh-interval">
            <input v-model="interval[0]" type="time" :disabled="disabled" />
            <span class="muted">–</span>
            <input v-model="interval[1]" type="time" :disabled="disabled" />
            <button
              v-if="schedule.days[day.key].length > 1"
              type="button"
              class="icon-btn icon-btn-danger"
              title="Remove break"
              :disabled="disabled"
              @click="removeBreak(day.key, index)"
            >
              ×
            </button>
          </div>

          <button
            type="button"
            class="icon-btn bh-add"
            title="Add break"
            :disabled="disabled"
            @click="addBreak(day.key)"
          >
            +
          </button>
        </div>

        <span v-else class="muted small">Closed</span>
      </div>
    </div>

    <div class="bh-holidays">
      <div v-for="(holiday, index) in schedule.holidays" :key="index" class="bh-holiday">
        <input v-model="schedule.holidays[index]" type="date" :disabled="disabled" />
        <button
          type="button"
          class="icon-btn icon-btn-danger"
          title="Remove holiday"
          :disabled="disabled"
          @click="removeHoliday(index)"
        >
          ×
        </button>
      </div>

      <button type="button" class="btn btn-ghost btn-small" :disabled="disabled" @click="addHoliday">
        + Add holiday
      </button>
    </div>
  </div>
</template>
