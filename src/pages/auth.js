const USERS_STORAGE_KEY = 'handloom_fashion_users'
const CURRENT_USER_STORAGE_KEY = 'handloom_fashion_current_user'

export function readUsers() {
  const usersValue = localStorage.getItem(USERS_STORAGE_KEY)
  if (!usersValue) {
    return []
  }

  try {
    const parsedUsers = JSON.parse(usersValue)
    return Array.isArray(parsedUsers) ? parsedUsers : []
  } catch {
    return []
  }
}

export function saveUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

export function readCurrentUser() {
  const userValue = localStorage.getItem(CURRENT_USER_STORAGE_KEY)
  if (!userValue) {
    return null
  }

  try {
    return JSON.parse(userValue)
  } catch {
    return null
  }
}

export function saveCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user))
}

export function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
}
