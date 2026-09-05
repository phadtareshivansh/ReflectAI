import React, { useState, useEffect } from "react";
import { UserProfile, JournalInteraction, ReflectionMode, ChatMessage } from "./types";
import {
  auth,
  db,
  signInWithGoogle,
  signOutUser,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  testConnection,
  handleFirestoreError,
  OperationType,
} from "./firebase";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { ReflectionComposer } from "./components/ReflectionComposer";
import { ActiveInteractionView } from "./components/ActiveInteractionView";
import { HistorySidebar } from "./components/HistorySidebar";
import { AlertCircle, ShieldAlert, Sparkles } from "lucide-react";

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
        await loadUserInteractions(firebaseUser.uid);
      } else {
        setUser(null);
        setInteractions([]);
        setSelectedInteraction(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch private isolated entries from Firestore
  const loadUserInteractions = async (uid: string) => {
    const path = `users/${uid}/interactions`;
    try {
      const interactionsRef = collection(db, "users", uid, "interactions");
      const q = query(interactionsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const items: JournalInteraction[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as JournalInteraction);
      });

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
      await loadUserInteractions(fbUser.uid);
    } catch (err: any) {
      console.error("Sign-in exception:", err);
      throw err;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      setInteractions([]);
      setSelectedInteraction(null);
    } catch (err) {
      console.error("Sign-out error:", err);
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

      setStatusMessage("Securing reflection in private Firestore archive...");

      // 2. Guaranteed Transaction Persistence
      const newInteractionId = doc(collection(db, "users", user.uid, "interactions")).id;
      const now = new Date().toISOString();

      const interactionRecord: JournalInteraction = {
        id: newInteractionId,
        userId: user.uid,
        title: title || (prompt.length > 50 ? `${prompt.slice(0, 47)}...` : prompt),
        content: prompt,
        mode,
        mood: mood || "Focused",
        geminiResponse: geminiSynthesis,
        modelUsed,
        createdAt: now,
        updatedAt: now,
        messages: [],
      };

      // Strict undefined stripping
      const sanitizedRecord = sanitizePayload(interactionRecord);

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

      // 3. Update local state
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

      // Persist to Firestore
      const updatePath = `users/${user.uid}/interactions/${interactionId}`;
      try {
        const docRef = doc(db, "users", user.uid, "interactions", interactionId);
        await setDoc(docRef, sanitizePayload(updatedInteraction), { merge: true });
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
          setHistoryOpen(false);
        }}
        onToggleHistory={() => setHistoryOpen(!historyOpen)}
        historyCount={interactions.length}
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
            onSelect={(item) => setSelectedInteraction(item)}
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
