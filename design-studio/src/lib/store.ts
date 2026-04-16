import { Project, Room, SelectedFurniture, MoodBoard, BedConfiguration } from "./types";

const PROJECTS_KEY = "designStudio_projects";
const USER_KEY = "designStudio_user";

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
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

// ── Room operations ──

export function addRoom(projectId: string, room: Room): void {
  const project = getProject(projectId);
  if (!project) return;
  project.rooms.push(room);
  saveProject(project);
}

export function updateRoom(projectId: string, room: Room): void {
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
  config: BedConfiguration | null
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
  item: SelectedFurniture
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

export function addMoodBoard(projectId: string, board: MoodBoard): void {
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

// ── User ──

export interface StoredUser {
  name: string;
  email: string;
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
}

// ── Helpers ──

export function generateId(): string {
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
