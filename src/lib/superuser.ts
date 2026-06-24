export const SUPER_USER_EMAIL = "thegreatsidhu@gmail.com";

export function isSuperUser(email?: string | null): boolean {
  return email === SUPER_USER_EMAIL;
}
