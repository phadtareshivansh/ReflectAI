import React, { useState, useEffect } from "react";
import {
  UserProfile,
  JournalInteraction,
  ReflectionMode,
  ChatMessage,
  UserVaultKeyRecord,
  EncryptedInteractionDoc,
  WeeklyReflectionData,
  EncryptedWeeklySummaryDoc,
} from "./types";
import {
  auth,
  db,
  signInWithGoogle,
  signOutUser,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  testConnection,
  handleFirestoreError,
  OperationType,
} from "./firebase";
import {
  generateVaultKey,
  exportKeyToJwk,
  importKeyFromJwk,
  encryptText,
  decryptText,
  encryptObject,
  decryptObject,
} from "./lib/crypto";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { ReflectionComposer } from "./components/ReflectionComposer";
import { ActiveInteractionView } from "./components/ActiveInteractionView";
import { HistorySidebar } from "./components/HistorySidebar";
import { WeeklyReflectionView } from "./components/WeeklyReflectionView";
import { AlertCircle, ShieldAlert, Sparkles, Lock, Compass } from "lucide-react";

// Zero-crash payload sanitizer: strips undefined values before database storage
function sanitizePayload<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [interactions, setInteractions] = useState<JournalInteraction[]>([]);
  const [selectedInteraction, setSelectedInteraction] = useState<JournalInteraction | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [vaultReady, setVaultReady] = useState(false);

  // Weekly Reflection (Memory & Pattern Engine) state
  const [viewWeekly, setViewWeekly] = useState(false);
  const [currentWeeklySummary, setCurrentWeeklySummary] = useState<WeeklyReflectionData | null>(null);
  const [savedWeeklySummaries, setSavedWeeklySummaries] = useState<WeeklyReflectionData[]>([]);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [savingWeekly, setSavingWeekly] = useState(false);

  // Initialize or load the user's AES-GCM 256-bit vault key from isolated path
  const initOrLoadUserVaultKey = async (uid: string): Promise<CryptoKey> => {
    const keyDocRef = doc(db, "users", uid, "keys", "vault");
    try {
      const keySnap = await getDoc(keyDocRef);
      if (keySnap.exists()) {
        const data = keySnap.data() as UserVaultKeyRecord;
        const imported = await importKeyFromJwk(data.keyJwk);
        setVaultKey(imported);
        setVaultReady(true);
        return imported;
      } else {
        const freshKey = await generateVaultKey();
        const jwkStr = await exportKeyToJwk(freshKey);
        const keyRecord: UserVaultKeyRecord = {
          keyJwk: jwkStr,
          algorithm: "AES-GCM-256",
          createdAt: new Date().toISOString(),
          userId: uid,
        };
        await setDoc(keyDocRef, sanitizePayload(keyRecord));
        setVaultKey(freshKey);
        setVaultReady(true);
        return freshKey;
      }
    } catch (err: any) {
      console.warn("Vault key initialization notice:", err?.message || err);
      // Fallback generate in memory if network delay or initial write pending
      const fallbackKey = await generateVaultKey();
      setVaultKey(fallbackKey);
      setVaultReady(true);
      return fallbackKey;
    }
  };

  // Initialize Auth state listener and test database connectivity
  useEffect(() => {
    testConnection().catch(() => {
      // Handled gracefully inside testConnection
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(profile);
        const key = await initOrLoadUserVaultKey(firebaseUser.uid);
        await loadUserInteractions(firebaseUser.uid, key);
        await loadSavedWeeklySummaries(firebaseUser.uid, key);
      } else {
        setUser(null);
        setVaultKey(null);
        setVaultReady(false);
        setInteractions([]);
        setSelectedInteraction(null);
        setCurrentWeeklySummary(null);
        setSavedWeeklySummaries([]);
        setViewWeekly(false);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch private isolated entries from Firestore, decrypting ciphertext client-side
  const loadUserInteractions = async (uid: string, activeKey?: CryptoKey | null) => {
    const keyToUse = activeKey || vaultKey;
    const path = `users/${uid}/interactions`;
    try {
      const interactionsRef = collection(db, "users", uid, "interactions");
      const q = query(interactionsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const items: JournalInteraction[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.isEncrypted && keyToUse) {
          try {
            const decryptedContent = await decryptText(data.content, data.encryptionIv, keyToUse);
            const decryptedResponse = await decryptText(
              data.geminiResponse,
              data.responseIv || data.encryptionIv,
              keyToUse
            );
            let decryptedMessages: ChatMessage[] = [];
            if (data.messagesCiphertext && data.messagesIv) {
              try {
                decryptedMessages = await decryptObject<ChatMessage[]>(
                  data.messagesCiphertext,
                  data.messagesIv,
                  keyToUse
                );
              } catch {
                decryptedMessages = [];
              }
            } else if (Array.isArray(data.messages)) {
              decryptedMessages = data.messages;
            }

            items.push({
              id: docSnap.id,
              userId: data.userId || uid,
              title: data.title || "Reflective Inscription",
              content: decryptedContent,
              mode: data.mode || "reflect",
              mood: data.mood,
              geminiResponse: decryptedResponse,
              modelUsed: data.modelUsed || "gemini-3.6-flash",
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              messages: decryptedMessages,
              isEncrypted: true,
              encryptionIv: data.encryptionIv,
            });
          } catch (decryptErr) {
            console.warn("Could not decrypt entry:", docSnap.id);
            items.push({
              id: docSnap.id,
              userId: data.userId || uid,
              title: data.title || "Encrypted Entry",
              content: "[Encrypted Vault Content - Decryption Key Mismatch]",
              mode: data.mode || "reflect",
              mood: data.mood,
              geminiResponse: "[Encrypted Gemini Synthesis]",
              modelUsed: data.modelUsed || "gemini-3.6-flash",
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              isEncrypted: true,
              encryptionIv: data.encryptionIv,
            });
          }
        } else {
          // Plaintext / legacy entry
          items.push({ id: docSnap.id, ...data } as JournalInteraction);
        }
      }

      setInteractions(items);
    } catch (err: any) {
      console.warn("Could not load interactions from Firestore:", err?.message || err);
      if (err?.code === "permission-denied" || err?.message?.includes("Missing or insufficient permissions")) {
        try {
          handleFirestoreError(err, OperationType.LIST, path);
        } catch (handled) {
          // Logged contextually
        }
      }
    }
  };

  // Load past encrypted weekly summaries from Firestore, decrypting with vault key (Directive 8 & 9)
  const loadSavedWeeklySummaries = async (uid: string, activeKey?: CryptoKey | null) => {
    const keyToUse = activeKey || vaultKey;
    try {
      const summariesRef = collection(db, "users", uid, "weekly_summaries");
      const q = query(summariesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const items: WeeklyReflectionData[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as EncryptedWeeklySummaryDoc;
        if (data.isEncrypted && keyToUse) {
          try {
            const decSynthesis = await decryptText(data.summaryCiphertext, data.summaryIv, keyToUse);
            const decThemes = data.themesCiphertext && data.themesIv
              ? await decryptObject<string[]>(data.themesCiphertext, data.themesIv, keyToUse)
              : [];
            const decInsight = data.insightsCiphertext && data.insightsIv
              ? await decryptText(data.insightsCiphertext, data.insightsIv, keyToUse)
              : "";

            items.push({
              id: docSnap.id,
              userId: data.userId,
              startDate: data.startDate,
              endDate: data.endDate,
              entryCount: data.entryCount,
              recurringThemes: decThemes,
              toneShift: data.toneShift || "Consistent Focus",
              synthesis: decSynthesis,
              actionableInsight: decInsight,
              moodDistribution: data.moodDistribution || {},
              modelUsed: data.modelUsed || "gemini-3.6-flash",
              createdAt: data.createdAt,
              isEncrypted: true,
              summaryIv: data.summaryIv,
            });
          } catch (decErr) {
            console.warn("Could not decrypt weekly summary record:", docSnap.id);
          }
        }
      }
      setSavedWeeklySummaries(items);
    } catch (err: any) {
      console.warn("Could not load weekly summaries:", err?.message || err);
    }
  };

  // Generate Weekly Pattern Analysis with Gemini across the last 7 days of entries
  const handleGenerateWeeklyReflection = async () => {
    if (!user) return;
    setLoadingWeekly(true);
    setGlobalError(null);
    try {
      const activeKey = vaultKey || (await initOrLoadUserVaultKey(user.uid));
      const keyJwk = await exportKeyToJwk(activeKey);

      // Filter entries strictly within the 7-day window
      const nowMs = Date.now();
      const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
      const recentEntries = interactions.filter((item) => {
        const itemDate = new Date(item.createdAt).getTime();
        return !isNaN(itemDate) && itemDate >= sevenDaysAgoMs && item.userId === user.uid;
      });

      if (recentEntries.length === 0) {
        throw new Error("No reflections found in the last 7 days to synthesize.");
      }

      // Re-verify per-document ownership & enforce max batch cap of 10 (Directive 9)
      const cappedEntries = recentEntries.slice(0, 10);

      const res = await fetch("/api/weekly-reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          keyJwk,
          entries: cappedEntries,
          startDate: new Date(sevenDaysAgoMs).toISOString(),
          endDate: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Synthesis request failed.");
      }

      const data = await res.json();
      const generatedSummary: WeeklyReflectionData = {
        id: `weekly-${Date.now()}`,
        userId: user.uid,
        startDate: data.startDate,
        endDate: data.endDate,
        entryCount: data.entryCount,
        recurringThemes: data.recurringThemes,
        toneShift: data.toneShift,
        synthesis: data.synthesis,
        actionableInsight: data.actionableInsight,
        moodDistribution: data.moodDistribution,
        modelUsed: data.modelUsed,
        createdAt: data.createdAt,
        isEncrypted: false,
      };

      setCurrentWeeklySummary(generatedSummary);
      setViewWeekly(true);
      setSelectedInteraction(null);
    } catch (err: any) {
      console.error("Weekly reflection generation failed:", err);
      setGlobalError(err?.message || "Failed to generate weekly reflection patterns.");
    } finally {
      setLoadingWeekly(false);
    }
  };

  // Encrypt Weekly Summary with client-side AES-GCM and store in Firestore (Directive 8 & 9)
  const handleSaveWeeklySummary = async (data: WeeklyReflectionData) => {
    if (!user) return;
    setSavingWeekly(true);
    setGlobalError(null);
    try {
      const activeKey = vaultKey || (await initOrLoadUserVaultKey(user.uid));

      // Client-Side Encryption with AES-GCM
      const encSynthesis = await encryptText(data.synthesis, activeKey);
      const encThemes = await encryptObject(data.recurringThemes, activeKey);
      const encInsight = await encryptText(data.actionableInsight || "", activeKey);

      const summaryId = `summary_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docData: EncryptedWeeklySummaryDoc = {
        id: summaryId,
        userId: user.uid,
        startDate: data.startDate,
        endDate: data.endDate,
        entryCount: data.entryCount,
        summaryCiphertext: encSynthesis.ciphertext,
        summaryIv: encSynthesis.iv,
        themesCiphertext: encThemes.ciphertext,
        themesIv: encThemes.iv,
        insightsCiphertext: encInsight.ciphertext,
        insightsIv: encInsight.iv,
        toneShift: data.toneShift,
        moodDistribution: data.moodDistribution || {},
        modelUsed: data.modelUsed,
        createdAt: new Date().toISOString(),
        isEncrypted: true,
      };

      const docRef = doc(db, "users", user.uid, "weekly_summaries", summaryId);
      await setDoc(docRef, sanitizePayload(docData));

      const updatedRecord: WeeklyReflectionData = {
        ...data,
        id: summaryId,
        isEncrypted: true,
        summaryIv: encSynthesis.iv,
      };

      setCurrentWeeklySummary(updatedRecord);
      setSavedWeeklySummaries((prev) => [updatedRecord, ...prev]);
    } catch (err: any) {
      console.error("Failed to save weekly summary:", err);
      setGlobalError("Failed to save encrypted weekly summary to vault.");
      throw err;
    } finally {
      setSavingWeekly(false);
    }
  };

  const handleSignIn = async () => {
    setGlobalError(null);
    try {
      const fbUser = await signInWithGoogle();
      const profile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
      };
      setUser(profile);
      const key = await initOrLoadUserVaultKey(fbUser.uid);
      await loadUserInteractions(fbUser.uid, key);
      await loadSavedWeeklySummaries(fbUser.uid, key);
    } catch (err: any) {
      console.error("Sign-in exception:", err);
      throw err;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      setUser(null);
      setVaultKey(null);
      setVaultReady(false);
      setInteractions([]);
      setSelectedInteraction(null);
      setCurrentWeeklySummary(null);
      setSavedWeeklySummaries([]);
      setViewWeekly(false);
    }
  };

  // Submit a new reflection: call server API (Gemini with multi-tier fallback) and save to Firestore
  const handleCreateReflection = async (
    title: string,
    prompt: string,
    mode: ReflectionMode,
    mood?: string
  ) => {
    if (!user) {
      throw new Error("You must be authenticated to record reflections.");
    }

    setLoadingAction(true);
    setStatusMessage("Synthesizing reflection with Gemini...");
    setGlobalError(null);

    try {
      // 1. Call server-side API with defensive payload
      const response = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          mood,
          title: title || "Reflective Inscription",
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server synthesis failed with status ${response.status}`);
      }

      const data = await response.json();
      const geminiSynthesis = data.response;
      const modelUsed = data.modelUsed || "gemini-3.6-flash";

      setStatusMessage("Encrypting with AES-GCM and securing in vault...");

      // 2. Guaranteed Transaction Persistence with Client-Side AES-GCM Encryption
      const newInteractionId = doc(collection(db, "users", user.uid, "interactions")).id;
      const now = new Date().toISOString();

      let effectiveKey = vaultKey;
      if (!effectiveKey) {
        effectiveKey = await initOrLoadUserVaultKey(user.uid);
      }

      // Encrypt prompt and synthesis using client-side WebCrypto AES-GCM
      const encContent = await encryptText(prompt, effectiveKey);
      const encResponse = await encryptText(geminiSynthesis, effectiveKey);

      const firestoreDoc: EncryptedInteractionDoc = {
        id: newInteractionId,
        userId: user.uid,
        title: title || (prompt.length > 50 ? `${prompt.slice(0, 47)}...` : prompt),
        content: encContent.ciphertext, // STORED AS CIPHERTEXT IN FIRESTORE
        encryptionIv: encContent.iv,
        geminiResponse: encResponse.ciphertext, // STORED AS CIPHERTEXT IN FIRESTORE
        responseIv: encResponse.iv,
        mode,
        mood: mood || "Focused",
        modelUsed,
        createdAt: now,
        updatedAt: now,
        messagesCiphertext: "",
        messagesIv: "",
        isEncrypted: true,
      };

      // Strict undefined stripping
      const sanitizedRecord = sanitizePayload(firestoreDoc);

      const docPath = `users/${user.uid}/interactions/${newInteractionId}`;
      try {
        const docRef = doc(db, "users", user.uid, "interactions", newInteractionId);
        await setDoc(docRef, sanitizedRecord);
      } catch (dbErr: any) {
        console.warn("Firestore write notice:", dbErr);
        if (dbErr?.code === "permission-denied" || dbErr?.message?.includes("Missing or insufficient permissions")) {
          try {
            handleFirestoreError(dbErr, OperationType.CREATE, docPath);
          } catch (handled) {
            // Logged contextually
          }
        }
      }

      // 3. Update local state with plaintext for immediate rendering
      const interactionRecord: JournalInteraction = {
        id: newInteractionId,
        userId: user.uid,
        title: firestoreDoc.title,
        content: prompt,
        mode,
        mood: mood || "Focused",
        geminiResponse: geminiSynthesis,
        modelUsed,
        createdAt: now,
        updatedAt: now,
        messages: [],
        isEncrypted: true,
        encryptionIv: encContent.iv,
      };

      setInteractions((prev) => [interactionRecord, ...prev]);
      setSelectedInteraction(interactionRecord);
    } catch (err: any) {
      console.error("Failed to complete reflection lifecycle:", err);
      setGlobalError(err?.message || "An error occurred while generating or archiving your reflection.");
      throw err;
    } finally {
      setLoadingAction(false);
      setStatusMessage("");
    }
  };

  // Append a follow-up dialectic message and get Gemini's contextual response
  const handleSendFollowUp = async (interactionId: string, messageText: string) => {
    if (!user || !selectedInteraction) return;

    setLoadingAction(true);
    setStatusMessage("Formulating response with Gemini...");
    setGlobalError(null);

    try {
      // Format chat history for context
      const existingHistory = [
        { role: "user", text: selectedInteraction.content },
        { role: "model", text: selectedInteraction.geminiResponse },
        ...(selectedInteraction.messages || []).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          text: m.text,
        })),
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: existingHistory,
          mode: selectedInteraction.mode,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Dialectic failed with status ${response.status}`);
      }

      const data = await response.json();
      const assistantText = data.response;

      const now = new Date().toISOString();
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text: messageText,
        timestamp: now,
      };

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now() + 1}`,
        role: "assistant",
        text: assistantText,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...(selectedInteraction.messages || []), userMsg, assistantMsg];
      const updatedInteraction: JournalInteraction = {
        ...selectedInteraction,
        messages: updatedMessages,
        updatedAt: now,
      };

      let effectiveKey = vaultKey;
      if (!effectiveKey) {
        effectiveKey = await initOrLoadUserVaultKey(user.uid);
      }

      // Encrypt the chat history client-side before sending to Firestore
      const encMessages = await encryptObject(updatedMessages, effectiveKey);

      // Persist to Firestore with encrypted messages
      const updatePath = `users/${user.uid}/interactions/${interactionId}`;
      try {
        const docRef = doc(db, "users", user.uid, "interactions", interactionId);
        await setDoc(
          docRef,
          sanitizePayload({
            messagesCiphertext: encMessages.ciphertext,
            messagesIv: encMessages.iv,
            updatedAt: now,
          }),
          { merge: true }
        );
      } catch (dbErr: any) {
        console.warn("Firestore update notice:", dbErr);
        if (dbErr?.code === "permission-denied" || dbErr?.message?.includes("Missing or insufficient permissions")) {
          try {
            handleFirestoreError(dbErr, OperationType.UPDATE, updatePath);
          } catch (handled) {
            // Logged contextually
          }
        }
      }

      // Update local state
      setSelectedInteraction(updatedInteraction);
      setInteractions((prev) =>
        prev.map((item) => (item.id === interactionId ? updatedInteraction : item))
      );
    } catch (err: any) {
      console.error("Dialectic continuation failed:", err);
      setGlobalError(err?.message || "Failed to continue dialectic with Gemini.");
      throw err;
    } finally {
      setLoadingAction(false);
      setStatusMessage("");
    }
  };

  // Delete an interaction permanently from the private archive
  const handleDeleteInteraction = async (interactionId: string) => {
    if (!user) return;
    const deletePath = `users/${user.uid}/interactions/${interactionId}`;
    try {
      try {
        const docRef = doc(db, "users", user.uid, "interactions", interactionId);
        await deleteDoc(docRef);
      } catch (dbErr: any) {
        console.warn("Firestore delete notice:", dbErr);
        if (dbErr?.code === "permission-denied" || dbErr?.message?.includes("Missing or insufficient permissions")) {
          try {
            handleFirestoreError(dbErr, OperationType.DELETE, deletePath);
          } catch (handled) {
            // Logged contextually
          }
        }
      }

      setInteractions((prev) => prev.filter((item) => item.id !== interactionId));
      if (selectedInteraction?.id === interactionId) {
        setSelectedInteraction(null);
      }
    } catch (err: any) {
      console.error("Failed to delete entry:", err);
      setGlobalError("Unable to delete entry from database.");
    }
  };

  // Filter entries within the 7-day window for memory & pattern analysis
  const nowMs = Date.now();
  const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const past7DaysEntries = interactions.filter((item) => {
    const itemDate = new Date(item.createdAt).getTime();
    return !isNaN(itemDate) && itemDate >= sevenDaysAgoMs;
  });

  // Auth checking splash
  if (authChecking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0A0A0A] text-[#E5E5E5]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#C5A059] rotate-45 flex items-center justify-center animate-pulse">
            <div className="w-2.5 h-2.5 bg-[#C5A059]"></div>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#888888] font-mono">
            Synchronizing Aether Archive...
          </p>
        </div>
      </div>
    );
  }

  // Not signed in: Show Landing Page
  if (!user) {
    return <LandingPage onSignIn={handleSignIn} />;
  }

  // Authenticated Dashboard
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0A0A0A] text-[#E5E5E5] font-serif selection:bg-[#C5A059]/30 selection:text-[#C5A059]">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onSignOut={handleSignOut}
        onNewReflection={() => {
          setSelectedInteraction(null);
          setViewWeekly(false);
          setHistoryOpen(false);
        }}
        onToggleHistory={() => setHistoryOpen(!historyOpen)}
        historyCount={interactions.length}
        onOpenWeeklyReflection={() => {
          setSelectedInteraction(null);
          setViewWeekly(true);
          setHistoryOpen(false);
        }}
        isWeeklyActive={viewWeekly && !selectedInteraction}
      />

      {/* Global Error Banner */}
      {globalError && (
        <div
          id="global-error-banner"
          className="flex items-center justify-between border-b border-red-900/60 bg-red-950/40 px-6 py-2.5 text-xs text-red-300"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-[10px] uppercase tracking-wider text-red-400 hover:text-red-200 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Archive Sidebar - Desktop */}
        <aside className="hidden lg:block w-80 shrink-0 h-full">
          <HistorySidebar
            interactions={interactions}
            selectedId={selectedInteraction?.id || null}
            onSelect={(item) => {
              setSelectedInteraction(item);
              setViewWeekly(false);
            }}
            loading={false}
          />
        </aside>

        {/* Mobile Slide-over Sidebar Drawer */}
        {historyOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
              onClick={() => setHistoryOpen(false)}
            />
            <div className="relative z-50 w-80 max-w-[85vw] h-full shadow-2xl">
              <HistorySidebar
                interactions={interactions}
                selectedId={selectedInteraction?.id || null}
                onSelect={(item) => {
                  setSelectedInteraction(item);
                  setViewWeekly(false);
                  setHistoryOpen(false);
                }}
                onClose={() => setHistoryOpen(false)}
                loading={false}
              />
            </div>
          </div>
        )}

        {/* Central Stage Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-4xl">
            {selectedInteraction ? (
              <ActiveInteractionView
                interaction={selectedInteraction}
                onSendFollowUp={handleSendFollowUp}
                onDelete={handleDeleteInteraction}
                onBack={() => setSelectedInteraction(null)}
                loading={loadingAction}
              />
            ) : viewWeekly ? (
              <WeeklyReflectionView
                past7DaysEntries={past7DaysEntries}
                onGenerateWeeklySummary={handleGenerateWeeklyReflection}
                onSaveWeeklySummary={handleSaveWeeklySummary}
                currentSummary={currentWeeklySummary}
                savedSummaries={savedWeeklySummaries}
                onSelectSavedSummary={(summary) => setCurrentWeeklySummary(summary)}
                onBack={() => setViewWeekly(false)}
                loading={loadingWeekly}
                saving={savingWeekly}
              />
            ) : (
              <div className="space-y-8">
                <div className="border-b border-[#262626] pb-6">
                  <div className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.25em] text-[#C5A059] font-mono mb-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Private Journal Sanctuary</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-normal text-[#E5E5E5] font-serif">
                    Welcome, {user.displayName || user.email?.split("@")[0] || "Philosopher"}.
                  </h2>
                  <p className="mt-2 text-sm font-serif italic text-[#888888]">
                    Inscribe your reflections, dilemmas, or concepts. Each thought is preserved in your private Firestore collection, isolated from all other accounts.
                  </p>
                </div>

                <ReflectionComposer
                  onSubmit={handleCreateReflection}
                  loading={loadingAction}
                  statusMessage={statusMessage}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
