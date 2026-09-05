export type ReflectionMode = "reflect" | "summarize" | "brainstorm";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface JournalInteraction {
  id: string;
  userId: string;
  title: string;
  content: string;
  mode: ReflectionMode;
  mood?: string;
  geminiResponse: string;
  modelUsed: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
