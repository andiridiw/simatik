export function getCurrentUser(): any {
  const data = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveCurrentUser(user: any, rememberMe: boolean = false): void {
  const data = JSON.stringify(user);
  if (rememberMe) {
    localStorage.setItem('currentUser', data);
  } else {
    sessionStorage.setItem('currentUser', data);
  }
}

export function clearCurrentUser(): void {
  localStorage.removeItem('currentUser');
  sessionStorage.removeItem('currentUser');
}