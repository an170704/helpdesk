<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGroup, addGroupMembers, removeGroupMember } from '../../api/groups'
import { getTechnicians } from '../../api/users'
import { getCategories, createCategory, deleteCategory } from '../../api/categories'
import { categoryLabel } from '../../utils/categories'
import { initials, avatarColor } from '../../utils/avatar'
import ModalDialog from '../../components/ModalDialog.vue'

const route = useRoute()
const router = useRouter()

const group = ref(null)
const technicians = ref([])
const categories = ref([])
const loading = ref(true)
const error = ref('')
const notice = ref(null)
const tab = ref('agents')

const memberSearch = ref('')

const addOpen = ref(false)
const agentInput = ref('')
const agentInputEl = ref(null)
const chips = ref([])
const adding = ref(false)
const addError = ref('')

const savingCategories = ref(false)

let noticeTimer = null

const ROLE_BADGE = { admin: 'badge-admin', technician: 'badge-tech', user: 'badge-user' }

const filteredMembers = computed(() => {
  if (!group.value) return []

  const query = memberSearch.value.trim().toLowerCase()
  if (!query) return group.value.members

  return group.value.members.filter(
    (member) =>
      member.full_name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
  )
})

const categoryInput = ref('')

const assignedCategories = computed(() =>
  categories.value
    .filter((category) => Number(category.group_id) === Number(group.value && group.value.id))
    .sort((a, b) => categoryLabel(a, group.value).localeCompare(categoryLabel(b, group.value)))
)

const suggestions = computed(() => {
  if (!group.value) return []

  const query = agentInput.value.trim().toLowerCase()
  const memberIds = new Set(group.value.members.map((m) => m.id))

  return technicians.value
    .filter((tech) => !memberIds.has(tech.id))
    .filter((tech) => !chips.value.includes(tech.email.toLowerCase()))
    .filter(
      (tech) =>
        !query ||
        tech.full_name.toLowerCase().includes(query) ||
        tech.email.toLowerCase().includes(query)
    )
    .slice(0, 6)
})

function showNotice(text, type = 'ok') {
  notice.value = { text, type }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 4500)
}

async function loadGroup() {
  const groupData = await getGroup(route.params.id)
  group.value = groupData
}

async function loadAll() {
  loading.value = true
  error.value = ''

  try {
    await loadGroup()
  } catch (err) {
    console.error('[group-detail] group fetch failed:', err)
    error.value = `Group fetch failed: ${err.response ? err.response.status + ' ' + (err.response.data?.message || '') : err.message}`
    loading.value = false
    return
  }

  try {
    const [techs, cats] = await Promise.all([getTechnicians(), getCategories()])
    technicians.value = techs
    categories.value = cats
  } catch (err) {
    console.error('[group-detail] options fetch failed:', err)
    error.value = `Options fetch failed: ${err.response ? err.response.status + ' ' + (err.response.data?.message || '') : err.message}`
  } finally {
    loading.value = false
  }
}

function openAddAgents() {
  chips.value = []
  agentInput.value = ''
  addError.value = ''
  addOpen.value = true
}

function addChip(email) {
  const value = String(email || '').trim().toLowerCase()
  if (!value) return
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    addError.value = `"${value}" is not a valid email`
    return
  }
  if (!chips.value.includes(value)) {
    chips.value = [...chips.value, value]
  }
  addError.value = ''
}

function commitInput() {
  const parts = agentInput.value.split(/[\s,;]+/).filter(Boolean)
  for (const part of parts) addChip(part)
  agentInput.value = ''
}

function onKeydown(event) {
  if (['Enter', ',', ';', ' '].includes(event.key)) {
    event.preventDefault()
    commitInput()
  } else if (event.key === 'Backspace' && !agentInput.value && chips.value.length) {
    chips.value = chips.value.slice(0, -1)
  }
}

function skipSuggestion(tech) {
  addChip(tech.email)
  agentInput.value = ''
}

async function addAgents() {
  commitInput()
  addError.value = ''

  if (!chips.value.length) {
    addError.value = 'Enter at least one email address'
    return
  }

  adding.value = true
  try {
    const result = await addGroupMembers(group.value.id, chips.value)
    let message = `Added ${result.added} technician(s) to the group`
    if (result.unknown.length) {
      message += ` — not found: ${result.unknown.join(', ')}`
    }
    showNotice(message, result.unknown.length ? 'error' : 'ok')
    addOpen.value = false
    await loadGroup()
  } catch (err) {
    addError.value = err.response?.data?.message || 'Could not add members'
  } finally {
    adding.value = false
  }
}

async function removeMember(member) {
  if (!window.confirm(`Remove ${member.full_name} from this group?`)) return

  try {
    await removeGroupMember(group.value.id, member.id)
    showNotice(`${member.full_name} removed from the group`)
    await loadGroup()
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not remove the member', 'error')
  }
}

async function removeCategory(category) {
  if (!window.confirm(`Delete category "${categoryLabel(category, group.value)}" from this group?`)) return

  savingCategories.value = true
  try {
    await deleteCategory(category.id)
    categories.value = categories.value.filter((c) => c.id !== category.id)
    showNotice(`"${category.name}" deleted`)
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not delete the category', 'error')
  } finally {
    savingCategories.value = false
  }
}

async function addCategoryFromInput() {
  const name = categoryInput.value.trim()
  if (!name || savingCategories.value) return

  if (assignedCategories.value.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    showNotice(`"${name}" already exists in this group`, 'error')
    return
  }

  savingCategories.value = true
  try {
    const created = await createCategory({ name, group_id: Number(group.value.id) })
    categories.value = [...categories.value, created]
    categoryInput.value = ''
    showNotice(`"${created.name}" added to the group`)
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not create the category', 'error')
  } finally {
    savingCategories.value = false
  }
}

onMounted(loadAll)
</script>

<template>
  <div>
    <button class="btn btn-ghost btn-small" @click="router.push('/groups')">Back to Groups</button>

    <p v-if="error" class="error" style="margin-top: 14px">{{ error }}</p>
    <p v-else-if="loading" class="muted" style="margin-top: 14px">Loading...</p>

    <template v-else>
      <p v-if="notice" :class="notice.type === 'error' ? 'error' : 'notice-ok'" style="margin-top: 12px">
        {{ notice.text }}
      </p>

      <section class="card" style="margin-top: 14px">
        <div class="group-head">
          <div>
            <h2 style="margin-bottom: 4px">{{ group.name }}</h2>
            <p class="muted small" style="margin: 0">
              {{ group.description || 'No description' }}
            </p>
          </div>
          <div class="group-meta">
            <span class="badge badge-gray">{{ group.members.length }} member(s)</span>
            <span class="badge badge-blue">{{ group.ticket_count }} ticket(s)</span>
          </div>
        </div>

        <div class="profile-tabs" style="margin-top: 14px">
          <button :class="{ active: tab === 'agents' }" @click="tab = 'agents'">
            Members ({{ group.members.length }})
          </button>
          <button :class="{ active: tab === 'categories' }" @click="tab = 'categories'">
            Categories ({{ assignedCategories.length }})
          </button>
        </div>

        <template v-if="tab === 'agents'">
          <div class="filters" style="margin-top: 12px">
            <div class="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input v-model="memberSearch" type="text" placeholder="Search members..." />
            </div>
            <div class="filters-right">
              <button class="btn btn-small" @click="openAddAgents">Add members</button>
            </div>
          </div>

          <p v-if="!filteredMembers.length" class="muted">No members found.</p>

          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th class="menu-col"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="member in filteredMembers" :key="member.id">
                  <td>
                    <div class="member-cell">
                      <span class="avatar-sm" :class="avatarColor(member.full_name || member.email)">
                        {{ initials(member.full_name) }}
                      </span>
                      <span>{{ member.full_name }}</span>
                    </div>
                  </td>
                  <td>{{ member.email }}</td>
                  <td class="menu-col" @click.stop>
                    <button class="icon-btn icon-btn-danger" title="Remove from group" @click="removeMember(member)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <template v-else>
          <p class="muted small" style="margin: 12px 0 4px">
            Categories owned by this group. Type a name to create one — it belongs to this group only.
          </p>

          <div class="cat-chips">
            <span v-for="category in assignedCategories" :key="category.id" class="chip">
              {{ categoryLabel(category, group) }}
              <button type="button" title="Delete" :disabled="savingCategories" @click="removeCategory(category)">×</button>
            </span>
            <span v-if="!assignedCategories.length" class="muted small">No categories yet.</span>
          </div>

          <div class="cat-add">
            <input
              v-model="categoryInput"
              type="text"
              placeholder="e.g. Networking, Monitor, Email..."
              :disabled="savingCategories"
              @keydown.enter.prevent="addCategoryFromInput"
            />
            <button
              class="btn btn-small"
              type="button"
              :disabled="!categoryInput.trim() || savingCategories"
              @click="addCategoryFromInput"
            >
              {{ savingCategories ? 'Saving...' : 'Add' }}
            </button>
          </div>
        </template>
      </section>

      <ModalDialog :open="addOpen" title="Add members" @close="addOpen = false">
        <label for="agent-input">Add members</label>

        <div class="chips-input" @click="agentInputEl && agentInputEl.focus()">
          <span v-for="chip in chips" :key="chip" class="chip">
            {{ chip }}
            <button type="button" title="Remove" @click="chips = chips.filter((c) => c !== chip)">×</button>
          </span>
          <input
            id="agent-input"
            ref="agentInputEl"
            v-model="agentInput"
            type="text"
            placeholder="name@company.com"
            @keydown="onKeydown"
          />
        </div>

        <p class="field-hint muted small">Paste as many email addresses, separated by comma or space.</p>

        <ul v-if="suggestions.length" class="agent-suggestions">
          <li v-for="tech in suggestions" :key="tech.id" @click="skipSuggestion(tech)">
            {{ tech.full_name }} — {{ tech.email }}
          </li>
        </ul>

        <p v-if="addError" class="error">{{ addError }}</p>

        <template #footer>
          <button class="btn btn-ghost" type="button" @click="addOpen = false">Cancel</button>
          <button class="btn" type="button" :disabled="adding" @click="addAgents">
            {{ adding ? 'Adding...' : 'Add to group' }}
          </button>
        </template>
      </ModalDialog>
    </template>
  </div>
</template>
