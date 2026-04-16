import { Project } from "./types";
import {
  isConfigured,
  dbSaveProject,
  dbDeleteProject,
  dbGetProjects,
  dbGetProject as dbFetchProject,
  getCurrentProfile,
  dbLogActivity,
} from "./supabase";

const PROJECTS_KEY = "designStudio_projects";
const USER_KEY = "designStudio_user";
const PROFILE_KEY = "designStudio_profile";

// ── Database sync ──

let _syncTimeout: ReturnType<typeof setTimeout> | null = null;

async function syncToDb(project: Project) {
  if (!isConfigured()) return;
  try {
    const profile = getProfile();
    if (!profile?.companyId || !profile?.id) return;
    const { client, property, rooms, moodBoards, targetGuests, style, budget, notes } = project;
    await dbSaveProject(
      {
        id: project.id,
        name: project.name,
        status: project.status,
        data: { client, property, rooms, moodBoards, targetGuests, style, budget, notes },
        updatedAt: project.updatedAt,
      },
      profile.companyId,
      profile.id
    );
  } catch (e) {
    console.error("Sync to DB failed:", e);
  }
}

function debouncedSync(project: Project) {
  if (_syncTimeout) clearTimeout(_syncTimeout);
  _syncTimeout = setTimeout(() => syncToDb(project), 300);
}

/** Pull all company projects from Supabase into localStorage */
export async function loadFromDatabase(): Promise<void> {
  if (!isConfigured()) return;
  try {
    const rows = await dbGetProjects();
    const projects: Project[] = rows.map((row: Record<string, unknown>) => {
      const data = (row.data ?? {}) as Record<string, unknown>;
      return {
        id: row.id as string,
        name: row.name as string,
        status: row.status as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        client: data.client ?? { name: "", email: "", phone: "", preferences: "" },
        property: data.property ?? {
          address: "", city: "", state: "", squareFootage: 0,
          bedrooms: 0, bathrooms: 0, floors: 1,
          matterportLink: "", polycamLink: "", spoakLink: "",
        },
        rooms: data.rooms ?? [],
        moodBoards: data.moodBoards ?? [],
        targetGuests: data.targetGuests ?? 12,
        style: data.style ?? "modern",
        budget: data.budget ?? 0,
        notes: data.notes ?? "",
      } as Project;
    });
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error("loadFromDatabase failed:", e);
  }
}

/** Load one project from DB */
export async function loadProjectFromDatabase(id: string): Promise<Project | null> {
  if (!isConfigured()) return getProject(id);
  try {
    const row = await dbFetchProject(id);
    if (!row) return null;
    const data = (row.data ?? {}) as Record<string, unknown>;
    const project: Project = {
      id: row.id,
      name: row.name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      client: data.client as Project["client"],
      property: data.property as Project["property"],
      rooms: (data.rooms ?? []) as Project["rooms"],
      moodBoards: (data.moodBoards ?? []) as Project["moodBoards"],
      targetGuests: (data.targetGuests ?? 12) as number,
      style: (data.style ?? "modern") as Project["style"],
      budget: (data.budget ?? 0) as number,
      notes: (data.notes ?? "") as string,
    };
    // Update localStorage cache
    const projects = getProjects();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx >= 0) projects[idx] = project;
    else projects.push(project);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    return project;
  } catch (e) {
    console.error("loadProjectFromDatabase failed:", e);
    return getProject(id);
  }
}

// ── Project CRUD ──

export function getProjects(): Project[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROJECTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getProject(id: string): Project | null {
  return getProjects().find((p) => p.id === id) ?? null;
}

export function saveProject(project: Project): void {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  project.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  debouncedSync(project);
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  if (isConfigured()) {
    dbDeleteProject(id).catch(console.error);
  }
}

// ── Room operations ──

export function addRoom(projectId: string, room: Project["rooms"][0]): void {
  const project = getProject(projectId);
  if (!project) return;
  project.rooms.push(room);
  saveProject(project);
}

export function updateRoom(projectId: string, room: Project["rooms"][0]): void {
  const project = getProject(projectId);
  if (!project) return;
  const idx = project.rooms.findIndex((r) => r.id === room.id);
  if (idx >= 0) {
    project.rooms[idx] = room;
    saveProject(project);
  }
}

export function deleteRoom(projectId: string, roomId: string): void {
  const project = getProject(projectId);
  if (!project) return;
  project.rooms = project.rooms.filter((r) => r.id !== roomId);
  saveProject(project);
}

// ── Bed config ──

export function setRoomBedConfig(
  projectId: string,
  roomId: string,
  config: Project["rooms"][0]["selectedBedConfig"]
): void {
  const project = getProject(projectId);
  if (!project) return;
  const room = project.rooms.find((r) => r.id === roomId);
  if (room) {
    room.selectedBedConfig = config;
    saveProject(project);
  }
}

// ── Furniture ──

export function addFurnitureToRoom(
  projectId: string,
  roomId: string,
  item: Project["rooms"][0]["furniture"][0]
): void {
  const project = getProject(projectId);
  if (!project) return;
  const room = project.rooms.find((r) => r.id === roomId);
  if (room) {
    room.furniture.push(item);
    saveProject(project);
  }
}

export function removeFurnitureFromRoom(
  projectId: string,
  roomId: string,
  furnitureItemId: string
): void {
  const project = getProject(projectId);
  if (!project) return;
  const room = project.rooms.find((r) => r.id === roomId);
  if (room) {
    room.furniture = room.furniture.filter((f) => f.item.id !== furnitureItemId);
    saveProject(project);
  }
}

// ── Mood boards ──

export function addMoodBoard(projectId: string, board: Project["moodBoards"][0]): void {
  const project = getProject(projectId);
  if (!project) return;
  project.moodBoards.push(board);
  saveProject(project);
}

export function deleteMoodBoard(projectId: string, boardId: string): void {
  const project = getProject(projectId);
  if (!project) return;
  project.moodBoards = project.moodBoards.filter((b) => b.id !== boardId);
  saveProject(project);
}

// ── User / Profile ──

export interface StoredUser {
  name: string;
  email: string;
}

export interface StoredProfile {
  id: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
  inviteCode: string;
  role: string;
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(PROJECTS_KEY);
}

export function getProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setProfile(profile: StoredProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  setUser({ name: profile.name, email: profile.email });
}

/** Fetch profile from Supabase and cache locally */
export async function syncProfile(): Promise<StoredProfile | null> {
  if (!isConfigured()) return null;
  try {
    const p = await getCurrentProfile();
    if (!p) return null;
    const company = p.companies as Record<string, string> | null;
    const profile: StoredProfile = {
      id: p.id,
      name: p.full_name,
      email: p.email,
      companyId: p.company_id ?? "",
      companyName: company?.name ?? "",
      inviteCode: company?.invite_code ?? "",
      role: p.role,
    };
    setProfile(profile);
    return profile;
  } catch {
    return null;
  }
}

// ── Activity helpers ──

export function logActivity(projectId: string, action: string, details?: string) {
  if (!isConfigured()) return;
  const profile = getProfile();
  if (!profile) return;
  dbLogActivity(projectId, profile.id, action, details).catch(console.error);
}

// ── Helpers ──

export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function createEmptyProject(overrides?: Partial<Project>): Project {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: "",
    client: { name: "", email: "", phone: "", preferences: "" },
    property: {
      address: "",
      city: "",
      state: "",
      squareFootage: 0,
      bedrooms: 0,
      bathrooms: 0,
      floors: 1,
      matterportLink: "",
      polycamLink: "",
      spoakLink: "",
    },
    rooms: [],
    moodBoards: [],
    targetGuests: 12,
    style: "modern",
    budget: 0,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    notes: "",
    ...overrides,
  };
}
