import { mockWorkspaces } from "@/data/mock-workspaces";

const rootHosts = new Set(["localhost", "127.0.0.1", "tradehub.com", "www.tradehub.com"]);

export function normalizeWorkspaceHandle(handle: string) {
  return handle.trim().toLowerCase();
}

export function resolveWorkspaceHandleFromPathname(pathname?: string | null) {
  if (!pathname) {
    return null;
  }

  const match = pathname.match(/^\/join\/([^/?#]+)/i);
  return match ? normalizeWorkspaceHandle(match[1]) : null;
}

export function resolveWorkspaceHandleFromHostname(hostname?: string | null) {
  if (!hostname) {
    return null;
  }

  const normalizedHost = hostname.split(":")[0].trim().toLowerCase();

  if (!normalizedHost || rootHosts.has(normalizedHost)) {
    return null;
  }

  if (normalizedHost.endsWith(".localhost")) {
    return normalizeWorkspaceHandle(normalizedHost.replace(/\.localhost$/, ""));
  }

  const hostParts = normalizedHost.split(".");

  if (hostParts.length >= 3 && hostParts.slice(-2).join(".") === "tradehub.com") {
    return normalizeWorkspaceHandle(hostParts.slice(0, -2).join("."));
  }

  return null;
}

export function resolveWorkspaceHandle(input: {
  pathname?: string | null;
  hostname?: string | null;
}) {
  return (
    resolveWorkspaceHandleFromPathname(input.pathname) ??
    resolveWorkspaceHandleFromHostname(input.hostname)
  );
}

export function resolveWorkspaceByHandle(handle?: string | null) {
  if (!handle) {
    return null;
  }

  const normalizedHandle = normalizeWorkspaceHandle(handle);
  return mockWorkspaces.find((workspace) => workspace.handle === normalizedHandle) ?? null;
}
