export const staffRoles = ["editor", "validator", "admin"] as const;
export const validationRoles = ["validator", "admin"] as const;

export type StaffRole = (typeof staffRoles)[number];

export function hasStaffAccess(role: string | null | undefined): role is StaffRole {
  return Boolean(role && staffRoles.includes(role as StaffRole));
}

export function hasValidationAccess(role: string | null | undefined) {
  return Boolean(role && validationRoles.includes(role as (typeof validationRoles)[number]));
}

export function hasAdminAccess(role: string | null | undefined) {
  return role === "admin";
}
