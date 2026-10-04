export function groupRootName(group) {
  return String(group.name || '').replace(/\s+Team$/i, '').trim() || group.name
}

export function categoryLabel(category, group) {
  if (category.parent_name) return `${category.parent_name} > ${category.name}`
  if (!group) return category.name

  const root = groupRootName(group)
  if (category.name.toLowerCase() === root.toLowerCase()) return category.name
  return `${root} > ${category.name}`
}

export function categoriesOfGroup(categories, group) {
  const ids = group.category_ids || []

  return categories
    .filter((category) => ids.includes(category.id))
    .sort((a, b) => categoryLabel(a, group).localeCompare(categoryLabel(b, group)))
}
