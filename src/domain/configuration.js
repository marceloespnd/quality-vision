// Opening the creation form also sets a type; only a saved original value
// identifies an edit. An empty team on a project must not block creation.
export function isExistingConfigEdit(editing, type, items) {
  return editing.type === type && Boolean(editing.value) && items.includes(editing.value)
}

export function saveConfigValue(items, value, originalValue = '') {
  return originalValue
    ? items.map(item => item === originalValue ? value : item)
    : items.includes(value) ? items : [...items, value]
}
