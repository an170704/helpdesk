<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getGroups, createGroup, updateGroup, deleteGroup } from '../../api/groups'
import { initials, avatarColor } from '../../utils/avatar'
import ModalDialog from '../../components/ModalDialog.vue'

const router = useRouter()

const groups = ref([])
const loading = ref(true)
const error = ref('')
const notice = ref(null)
const searchQuery = ref('')

const modalOpen = ref(false)
const editing = ref(null)
const form = ref({ name: '', description: '' })
const addMembersNext = ref(false)
const saving = ref(false)
const formError = ref('')

const menuGroup = ref(null)
const menuPosition = ref({ top: 0, left: 0 })

let noticeTimer = null

const filteredGroups = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return groups.value

  return groups.value.filter(
    (g) =>
      g.name.toLowerCase().includes(query) ||
      (g.description || '').toLowerCase().includes(query)
  )
})

function showNotice(text, type = 'ok') {
  notice.value = { text, type }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 3500)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    groups.value = await getGroups()
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load groups'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', description: '' }
  addMembersNext.value = false
  formError.value = ''
  modalOpen.value = true
}

function openEdit(group) {
  editing.value = group
  form.value = {
    name: group.name,
    description: group.description || '',
  }
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function save() {
  formError.value = ''

  if (!form.value.name.trim()) {
    formError.value = 'Name is required'
    return
  }

  saving.value = true

  try {
    if (editing.value) {
      await updateGroup(editing.value.id, {
        name: form.value.name.trim(),
        description: form.value.description.trim() || null,
      })
      showNotice(`Group "${form.value.name.trim()}" updated`)
      closeModal()
      await load()
    } else {
      const created = await createGroup({
        name: form.value.name.trim(),
        description: form.value.description.trim() || null,
      })

      if (addMembersNext.value) {
        closeModal()
        router.push(`/groups/${created.id}`)
      } else {
        showNotice(`Group "${created.name}" created`)
        closeModal()
        await load()
      }
    }
  } catch (err) {
    formError.value = err.response?.data?.message || 'Could not save the group'
  } finally {
    saving.value = false
  }
}

function toggleMenu(group, event) {
  if (menuGroup.value && menuGroup.value.id === group.id) {
    closeMenu()
    return
  }

  const rect = event.currentTarget.getBoundingClientRect()
  menuPosition.value = {
    top: rect.bottom + 6,
    left: Math.max(8, rect.right - 180),
  }
  menuGroup.value = group
}

function closeMenu() {
  menuGroup.value = null
}

function onWindowClick() {
  closeMenu()
}

async function askDelete(group) {
  closeMenu()
  if (!window.confirm(`Delete group "${group.name}"?`)) return

  try {
    await deleteGroup(group.id)
    showNotice(`Group "${group.name}" deleted`)
    await load()
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not delete the group', 'error')
  }
}

function editFromMenu(group) {
  closeMenu()
  openEdit(group)
}

onMounted(() => {
  load()
  window.addEventListener('click', onWindowClick)
})

onUnmounted(() => {
  window.removeEventListener('click', onWindowClick)
})
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div>
        <h2>Groups</h2>
        <p class="muted small" style="margin: 2px 0 0">
          Organize technicians into groups like Network, Hardware or General to streamline ticket assignment.
        </p>
      </div>
      <div class="head-actions">
        <span class="muted small">{{ filteredGroups.length }} group(s)</span>
        <button class="btn btn-small" @click="openCreate">New group</button>
      </div>
    </div>

    <div class="filters">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input v-model="searchQuery" type="text" placeholder="Search groups..." />
      </div>
    </div>

    <p v-if="notice" :class="notice.type === 'error' ? 'error' : 'notice-ok'">{{ notice.text }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>

    <div v-else-if="!groups.length" class="empty-state">
      <h3>Let's create your first group</h3>
      <p class="muted">Create groups based on your technicians' functions.</p>
      <button class="btn" @click="openCreate">Create new</button>
    </div>

    <p v-else-if="!filteredGroups.length" class="muted">No groups match this filter.</p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Group</th>
            <th>Members</th>
            <th>Tickets</th>
            <th class="menu-col"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="group in filteredGroups" :key="group.id" class="row-link" @click="router.push(`/groups/${group.id}`)">
            <td>
              <b>{{ group.name }}</b>
              <div v-if="group.description" class="muted small">{{ group.description }}</div>
            </td>
            <td>
              <div v-if="(group.members || []).length" class="member-cell">
                <div class="avatar-stack">
                  <span
                    v-for="member in (group.members || []).slice(0, 4)"
                    :key="member.id"
                    class="avatar-sm"
                    :class="avatarColor(member.full_name || member.email)"
                    :title="member.full_name"
                  >
                    {{ initials(member.full_name) }}
                  </span>
                </div>
                <span class="muted small">
                  {{ group.members.length }} member(s)
                </span>
              </div>
              <span v-else class="muted small">No members</span>
            </td>
            <td class="muted">{{ group.ticket_count }}</td>
            <td class="menu-col" @click.stop>
              <button class="icon-btn" title="Actions" @click.stop="toggleMenu(group, $event)">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <circle cx="12" cy="5" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="12" cy="19" r="1.6" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div
        v-if="menuGroup"
        class="row-menu"
        :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }"
        @click.stop
      >
        <button class="row-menu-item" @click="editFromMenu(menuGroup)">Edit group</button>
        <button class="row-menu-item" @click="askDelete(menuGroup)">Delete group</button>
      </div>
    </Teleport>

    <ModalDialog
      :open="modalOpen"
      :title="editing ? 'Edit group' : 'New group'"
      @close="closeModal"
    >
      <label for="g-name">Name *</label>
      <input id="g-name" v-model="form.name" type="text" placeholder="e.g. HARDWARE TEAM" />

      <label for="g-desc">Description</label>
      <textarea
        id="g-desc"
        v-model="form.description"
        rows="2"
        placeholder="What does this group handle?"
      ></textarea>

      <template v-if="editing">
        <p class="muted small">Manage the group's members and categories from the group page.</p>
      </template>

      <label v-else class="checkbox-row">
        <input v-model="addMembersNext" type="checkbox" />
        Add members in the next step
      </label>

      <p v-if="formError" class="error">{{ formError }}</p>

      <template #footer>
        <button class="btn btn-ghost" type="button" @click="closeModal">Cancel</button>
        <button class="btn" type="button" :disabled="saving" @click="save">
          {{ saving ? 'Saving...' : editing ? 'Save' : 'Create' }}
        </button>
      </template>
    </ModalDialog>
  </section>
</template>
