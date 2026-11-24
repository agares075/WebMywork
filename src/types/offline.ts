import type { Job } from "./job";
import type { Contact } from "./contact";
import type { JobFile } from "./file";

export type MutationData = { job?: Job; contact?: Contact; file?: JobFile; deleted?: boolean; warning?: string; queued?: boolean };
export type QueuedRequest = {
  id: string; url: string; method: "PUT" | "PATCH" | "POST" | "DELETE";
  entity: string; label: string; json?: Record<string, unknown>; blobKey?: string;
  form?: { id: string; name: string; type: string };
  optimistic: MutationData; base?: Record<string, unknown>; localVersion?: string; blocked?: string;
};
export type MutationRequest = Omit<QueuedRequest, "id" | "blobKey" | "form" | "blocked"> & { file?: File; fileId?: string };
export type MutationEvent = { account: string; entry: QueuedRequest; data: MutationData };
