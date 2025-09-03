const KEY = "moment_session";

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}
export function setSession(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
export function clearSession() {
  localStorage.removeItem(KEY);
}
export function isAuthed() {
  return !!getSession();
}
