export const STATUS_LABEL = {
  pending: 'Pending',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const STATUS_BADGE = {
  pending: 'badge-gray',
  in_progress: 'badge-blue',
  resolved: 'badge-green',
  closed: 'badge-dark',
}

export const PRIORITY_BADGE = {
  low: 'badge-gray',
  medium: 'badge-blue',
  high: 'badge-red',
}

export const NEXT_STATUS = {
  pending: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed',
}

export const NEXT_LABEL = {
  pending: 'Start',
  in_progress: 'Resolve',
  resolved: 'Close',
}
