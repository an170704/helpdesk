export function membersOfGroup(groups, groupId) {
  const group = groups.find((g) => g.id === Number(groupId))
  return group ? group.members : []
}

export function groupsOfTechnician(groups, technicianId) {
  return groups.filter((g) => g.members.some((m) => m.id === Number(technicianId)))
}

export function byFullName(list) {
  return [...list].sort((a, b) => a.full_name.localeCompare(b.full_name))
}
