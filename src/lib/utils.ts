import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const RAM_OPTIONS = [
  { label: "1 GB", value: 1024 },
  { label: "2 GB", value: 2048 },
  { label: "3 GB", value: 3072 },
  { label: "4 GB", value: 4096 },
  { label: "5 GB", value: 5120 },
  { label: "6 GB", value: 6144 },
  { label: "7 GB", value: 7168 },
  { label: "8 GB", value: 8192 },
  { label: "9 GB", value: 9216 },
  { label: "10 GB", value: 10240 },
  { label: "Unlimited", value: 0 },
];

export const CPU_OPTIONS = [
  { label: "10%", value: 10 },
  { label: "25%", value: 25 },
  { label: "50%", value: 50 },
  { label: "100%", value: 100 },
  { label: "200%", value: 200 },
  { label: "300%", value: 300 },
  { label: "Unlimited", value: 0 },
];

export const STORAGE_OPTIONS = [
  { label: "1 GB", value: 1024 },
  { label: "2 GB", value: 2048 },
  { label: "5 GB", value: 5120 },
  { label: "10 GB", value: 10240 },
  { label: "20 GB", value: 20480 },
  { label: "50 GB", value: 51200 },
  { label: "100 GB", value: 102400 },
  { label: "Unlimited", value: 0 },
];

export const NODE_VERSIONS = ["18", "20", "22", "24"];

export const ALL_SCOPES = [
  "users:read",
  "users:create",
  "users:update",
  "users:delete",
  "resellers:read",
  "resellers:create",
  "resellers:update",
  "resellers:delete",
  "servers:read",
  "servers:create",
  "servers:update",
  "servers:delete",
  "servers:start",
  "servers:stop",
  "servers:restart",
  "servers:kill",
  "servers:console",
  "servers:files",
  "servers:environment",
  "nodes:read",
  "nodes:create",
  "nodes:update",
  "nodes:delete",
  "resources:read",
  "ports:read",
  "ports:manage",
  "logs:read",
  "api_keys:read",
  "api_keys:create",
  "api_keys:revoke",
  "api_keys:rotate",
  "admin:*",
];

export const SCOPE_PRESETS = {
  "Read-only": ["servers:read", "users:read", "resellers:read", "nodes:read", "resources:read", "ports:read", "logs:read"],
  "Server Management": ["servers:read", "servers:create", "servers:update", "servers:delete", "servers:start", "servers:stop", "servers:restart", "servers:kill", "servers:console", "servers:files", "servers:environment"],
  "User Management": ["users:read", "users:create", "users:update", "users:delete"],
  "Reseller Management": ["resellers:read", "resellers:create", "resellers:update", "resellers:delete"],
  "Node Management": ["nodes:read", "nodes:create", "nodes:update", "nodes:delete"],
  "File Management": ["servers:files", "servers:read"],
  "Full API Access": [...ALL_SCOPES],
};
