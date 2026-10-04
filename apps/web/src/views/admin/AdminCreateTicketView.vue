<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createTicket } from '../../api/tickets'
import { getUsers, getTechnicians, getUserOverview } from '../../api/users'
import { getGroups } from '../../api/groups'
import { getCategories } from '../../api/categories'
import { categoryLabel, categoriesOfGroup } from '../../utils/categories'
import { STATUS_LABEL } from '../../utils/status'
import { initials, avatarColor } from '../../utils/avatar'
import { membersOfGroup, groupsOfTechnician, byFullName } from '../../utils/groups'
import StatusBadge from '../../components/StatusBadge.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'

const router = useRouter()
const route = useRoute()

const users = ref([])
const technicians = ref([])
const groups = ref([])
const categories = ref([])
const contact = ref(null)
const contactOverview = ref(null)
const loadingContact = ref(false)

const subject = ref('')
const description = ref('')
const priority = ref('medium')
const status = ref('pending')
const assignedTo = ref('')
const groupId = ref('')
const categoryId = ref('')

const error = ref('')
const saving = ref(false)

const STATUSES = ['pending', 'in_progress', 'resolved', 'closed']

const ROLE_BADGE = { admin: 'badge-admin', technician: 'badge-tech', user: 'badge-user' }

const recentTickets = computed(() =>
  contactOverview.value ? contactOverview.value.recentCreated.slice(0, 5) : []
)

const technicianOptions = computed(() =>
  groupId.value
    ? byFullName(membersOfGroup(groups.value, groupId.value))
    : byFullName(technicians.value)
)

const groupOptions = computed(() =>
  assignedTo.value ? groupsOfTechnician(groups.value, assignedTo.value) : groups.value
)

const assignmentOptions = computed(() => {
  const options = []

  for (const group of groupOptions.value) {
    options.push({ value: `${group.id}:`, label: group.name })
    for (const category of categoriesOfGroup(categories.value, group)) {
      options.push({ value: `${group.id}:${category.id}`, label: `» ${categoryLabel(category, group)}` })
    }
  }

  return options
})

const assignmentValue = computed(() => {
  if (!groupId.value && !categoryId.value) return ''
  return `${groupId.value}:${categoryId.value}`
})

function onAssignmentChange(value) {
  if (!value) {
    groupId.value = ''
    categoryId.value = ''
    return
  }

  const [group, category] = value.split(':')
  groupId.value = group
  categoryId.value = category || ''
}

watch(groupId, (value) => {
  if (
    value &&
    assignedTo.value &&
    !membersOfGroup(groups.value, value).some((m) => m.id === Number(assignedTo.value))
  ) {
    assignedTo.value = ''
  }
})

watch(assignedTo, (value) => {
  if (
    value &&
    groupId.value &&
    !groupsOfTechnician(groups.value, value).some((g) => g.id === Number(groupId.value))
  ) {
    groupId.value = ''
    categoryId.value = ''
  }
})

watch(contact, async (value) => {
  contactOverview.value = null
  if (!value) return

  loadingContact.value = true
  try {
    contactOverview.value = await getUserOverview(value.id)
  } catch {
    contactOverview.value = null
  } finally {
    loadingContact.value = false
  }
})

async function handleSubmit() {
  error.value = ''

  if (!contact.value) {
    error.value = 'Please select a contact'
    return
  }
  const plainDescription = description.value.replace(/<[^>]*>/g, ' ').trim()
  if (!subject.value.trim() || !plainDescription) {
    error.value = 'Subject and description are required'
    return
  }

  saving.value = true

  try {
    const ticket = await createTicket({
      created_by: contact.value.id,
      subject: subject.value.trim(),
      description: description.value.trim(),
      priority: priority.value,
      status: status.value,
      ...(assignedTo.value && { assigned_to: Number(assignedTo.value) }),
      ...(groupId.value && { group_id: Number(groupId.value) }),
      ...(categoryId.value && { category_id: Number(categoryId.value) }),
    })
    router.push(`/tickets/${ticket.id}`)
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not create the ticket'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const [u, t, g, c] = await Promise.all([getUsers(), getTechnicians(), getGroups(), getCategories()])
    users.value = u
    technicians.value = t
    groups.value = g
    categories.value = c

    // Preselect the contact when opened from a member profile
    const contactId = Number(route.query.contact)
    if (contactId) {
      const found = users.value.find((user) => user.id === contactId)
      if (found) contact.value = found
    }
  } catch {
    error.value = 'Failed to load form options'
  }
})
</script>

<template>
  <div class="create-grid">
    <section class="card">
      <h2>New ticket</h2>

      <form @submit.prevent="handleSubmit">
        <label for="contact">Contact *</label>
        <select id="contact" v-model="contact">
          <option :value="null">Select a member...</option>
          <option v-for="user in users" :key="user.id" :value="user">
            {{ user.full_name }} — {{ user.email }}
          </option>
        </select>

        <label for="subject">Subject *</label>
        <input id="subject" v-model="subject" type="text" placeholder="e.g. Laptop cannot start" />

        <div class="form-row-2">
          <div>
            <label for="status">Status</label>
            <select id="status" v-model="status">
              <option v-for="value in STATUSES" :key="value" :value="value">
                {{ STATUS_LABEL[value] }}
              </option>
            </select>
          </div>
          <div>
            <label for="priority">Priority</label>
            <select id="priority" v-model="priority">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div class="form-row-2">
          <div>
            <label for="group">Group</label>
            <select id="group" :value="assignmentValue" @change="onAssignmentChange($event.target.value)">
              <option value="">—</option>
              <option v-for="opt in assignmentOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div>
            <label for="assigned">Assigned technician</label>
            <select id="assigned" v-model="assignedTo">
              <option value="">—</option>
              <option v-for="tech in technicianOptions" :key="tech.id" :value="tech.id">
                {{ tech.full_name }}
              </option>
            </select>
          </div>
        </div>

        <label>Description *</label>
        <RichTextEditor v-model="description" placeholder="Describe the issue..." />

        <p v-if="error" class="error">{{ error }}</p>

        <div class="row form-actions">
          <button class="btn" type="submit" :disabled="saving">
            {{ saving ? 'Creating...' : 'Create ticket' }}
          </button>
          <button class="btn btn-ghost" type="button" @click="router.back()">Cancel</button>
        </div>
      </form>
    </section>

    <aside class="contact-side">
      <div class="card">
        <h3>Contact details</h3>

        <template v-if="contact">
          <div class="member-cell contact-cell">
            <img v-if="contact.avatar_url" :src="contact.avatar_url" class="avatar-img" alt="" />
            <span v-else class="avatar-sm" :class="avatarColor(contact.full_name || contact.email)">
              {{ initials(contact.full_name) }}
            </span>
            <div>
              <b>{{ contact.full_name }}</b>
              <br />
              <span class="muted small">{{ contact.email }}</span>
            </div>
          </div>

          <div class="detail-block">
            <span class="detail-label">Phone</span>
            <span>{{ contact.phone || '—' }}</span>
          </div>

          <div class="detail-block">
            <span class="detail-label">Role</span>
            <span class="badge" :class="ROLE_BADGE[contact.role]">{{ contact.role }}</span>
          </div>

          <router-link :to="`/users/${contact.id}`" class="link">View profile</router-link>
        </template>

        <p v-else class="muted small">Select a contact to see their details.</p>
      </div>

      <div v-if="contact" class="card">
        <h3>Recent tickets</h3>
        <p v-if="loadingContact" class="muted small">Loading...</p>
        <p v-else-if="!recentTickets.length" class="muted small">No tickets yet.</p>
        <ul v-else class="mini-tickets">
          <li v-for="ticket in recentTickets" :key="ticket.id">
            <router-link :to="`/tickets/${ticket.id}`">
              <span class="mini-subject">{{ ticket.subject }} · {{ ticket.id }}</span>
              <StatusBadge :status="ticket.status" />
            </router-link>
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>
