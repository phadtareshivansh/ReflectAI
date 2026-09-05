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
  content: string; // Plaintext in memory, ciphertext when persisted in Firestore
  mode: ReflectionMode;
  mood?: string;
  geminiResponse: string; // Plaintext in memory, ciphertext when persisted in Firestore
  modelUsed: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  // Encryption Metadata
  isEncrypted?: boolean;
  encryptionIv?: string;
  responseIv?: string;
  messagesIv?: string;
}

export interface EncryptedInteractionDoc {
  id: string;
  userId: string;
  title: string;
  content: string; // Base64 ciphertext
  mode: ReflectionMode;
  mood?: string;
  geminiResponse: string; // Base64 ciphertext
  modelUsed: string;
  createdAt: string;
  updatedAt: string;
  messagesCiphertext?: string; // Base64 ciphertext of serialized ChatMessage[]
  messagesIv?: string;
  isEncrypted: boolean;
  encryptionIv: string;
  responseIv?: string;
}

export interface UserVaultKeyRecord {
  keyJwk: string;
  algorithm: string;
  createdAt: string;
  userId: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface WeeklyReflectionData {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  entryCount: number;
  recurringThemes: string[];
  toneShift: string;
  synthesis: string;
  actionableInsight: string;
  moodDistribution: Record<string, number>;
  modelUsed: string;
  createdAt: string;
  isEncrypted?: boolean;
  summaryIv?: string;
}

export interface EncryptedWeeklySummaryDoc {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  entryCount: number;
  summaryCiphertext: string;
  summaryIv: string;
  themesCiphertext: string;
  themesIv: string;
  insightsCiphertext: string;
  insightsIv: string;
  toneShift: string;
  moodDistribution: Record<string, number>;
  modelUsed: string;
  createdAt: string;
  isEncrypted: boolean;
}

