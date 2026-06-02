import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'banhnho_db';
const STORE_NAME = 'bot_cards';
const BG_STORE_NAME = 'backgrounds';
const STORY_STORE_NAME = 'stories';
const KIKOKO_STORY_STORE_NAME = 'kikoko_stories';
const KIKOKO_IG_STORE_NAME = 'kikoko_ig';
const KIKOKO_CHAPTER_PARTS_STORE = 'kikoko_chapter_parts';
const KIKOKO_CHAPTER_CHECKPOINTS_STORE = 'kikoko_chapter_checkpoints';
const KIKOKO_ANALYSIS_HISTORY_STORE = 'kikoko_analysis_history';
const KIKOKO_REWRITE_HISTORY_STORE = 'kikoko_rewrite_history';
const KIKOKO_NOVEL_HISTORY_STORE = 'kikoko_novel_history';
const CHAT_STORE_NAME = 'chat_history';
const FORUM_STORE_NAME = 'forum_data';
export const PERMANENT_MEM_STORE = 'novel_permanent_mem';
export const SHORT_TERM_MEM_STORE = 'novel_short_term_mem';
export const LONG_TERM_MEM_STORE = 'novel_long_term_mem';
export const LOREBOOK_STORE = 'novel_lorebook';
export const NPC_PROFILE_STORE = 'npc_profiles';
export const NPC_CONVO_STORE = 'npc_conversations';
const VERSION = 22;

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(BG_STORE_NAME)) {
        db.createObjectStore(BG_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(STORY_STORE_NAME)) {
        db.createObjectStore(STORY_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(KIKOKO_STORY_STORE_NAME)) {
        db.createObjectStore(KIKOKO_STORY_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(CHAT_STORE_NAME)) {
        db.createObjectStore(CHAT_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(KIKOKO_IG_STORE_NAME)) {
        db.createObjectStore(KIKOKO_IG_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(FORUM_STORE_NAME)) {
        db.createObjectStore(FORUM_STORE_NAME);
      }
      // AI Analyzer Histories
      if (!db.objectStoreNames.contains(KIKOKO_ANALYSIS_HISTORY_STORE)) {
        db.createObjectStore(KIKOKO_ANALYSIS_HISTORY_STORE);
      }
      if (!db.objectStoreNames.contains(KIKOKO_REWRITE_HISTORY_STORE)) {
        db.createObjectStore(KIKOKO_REWRITE_HISTORY_STORE);
      }
      if (!db.objectStoreNames.contains(KIKOKO_NOVEL_HISTORY_STORE)) {
        db.createObjectStore(KIKOKO_NOVEL_HISTORY_STORE);
      }
      if (!db.objectStoreNames.contains('kikoko_single_analysis_history')) {
        db.createObjectStore('kikoko_single_analysis_history');
      }
      // Smart Memory Stores
      if (!db.objectStoreNames.contains(PERMANENT_MEM_STORE)) {
        db.createObjectStore(PERMANENT_MEM_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SHORT_TERM_MEM_STORE)) {
        db.createObjectStore(SHORT_TERM_MEM_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(LONG_TERM_MEM_STORE)) {
        db.createObjectStore(LONG_TERM_MEM_STORE, { keyPath: 'id' });
      }
      const longTermStore = transaction.objectStore(LONG_TERM_MEM_STORE);
      if (!longTermStore.indexNames.contains('novelId')) {
        longTermStore.createIndex('novelId', 'novelId', { unique: false });
      }
      if (!db.objectStoreNames.contains(LOREBOOK_STORE)) {
        db.createObjectStore(LOREBOOK_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(NPC_PROFILE_STORE)) {
        const npcStore = db.createObjectStore(NPC_PROFILE_STORE, { keyPath: 'id' });
        npcStore.createIndex('botId', 'botId', { unique: false });
      }
      if (!db.objectStoreNames.contains(NPC_CONVO_STORE)) {
        const convoStore = db.createObjectStore(NPC_CONVO_STORE, { keyPath: 'id' });
        convoStore.createIndex('npcId', 'npcId', { unique: false });
        convoStore.createIndex('botId', 'botId', { unique: false });
      }
      if (!db.objectStoreNames.contains(KIKOKO_CHAPTER_PARTS_STORE)) {
        const partStore = db.createObjectStore(KIKOKO_CHAPTER_PARTS_STORE, { keyPath: 'id' });
        partStore.createIndex('chapterId', 'chapterId', { unique: false });
      }
      if (!db.objectStoreNames.contains(KIKOKO_CHAPTER_CHECKPOINTS_STORE)) {
        db.createObjectStore(KIKOKO_CHAPTER_CHECKPOINTS_STORE, { keyPath: 'chapterId' });
      }
      if (!db.objectStoreNames.contains('kikoko_vector_memories')) {
        db.createObjectStore('kikoko_vector_memories', { keyPath: 'id' });
      }
    },
  });
}

export async function saveChat(botId: string, messages: any[]) {
  const db = await getDB();
  await db.put(CHAT_STORE_NAME, messages, botId);
}

export async function loadChat(botId: string): Promise<any[]> {
  const db = await getDB();
  return (await db.get(CHAT_STORE_NAME, botId)) || [];
}

export async function saveChatSettings(botId: string, settings: any) {
  const db = await getDB();
  await db.put(CHAT_STORE_NAME, settings, `settings_${botId}`);
}

export async function loadChatSettings(botId: string): Promise<any> {
  const db = await getDB();
  return await db.get(CHAT_STORE_NAME, `settings_${botId}`);
}

export async function saveCards(cards: any[]) {
  const db = await getDB();
  await db.put(STORE_NAME, cards, 'saved_cards');
}

export async function loadCards(): Promise<any[]> {
  const db = await getDB();
  return (await db.get(STORE_NAME, 'saved_cards')) || [];
}

export async function deleteChat(botId: string) {
  const db = await getDB();
  const tx = db.transaction(CHAT_STORE_NAME, 'readwrite');
  await tx.objectStore(CHAT_STORE_NAME).delete(botId);
  await tx.objectStore(CHAT_STORE_NAME).delete(`settings_${botId}`);
  await tx.done;
}

export async function saveDraft(key: string, value: any) {
  const db = await getDB();
  await db.put(STORE_NAME, value, `draft_${key}`);
}

export async function loadDraft(key: string): Promise<any> {
  const db = await getDB();
  return await db.get(STORE_NAME, `draft_${key}`);
}

export async function clearDrafts() {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const keys = await store.getAllKeys();
  for (const key of keys) {
    if (typeof key === 'string' && key.startsWith('draft_')) {
      await store.delete(key);
    }
  }
  await tx.done;
}

export async function saveBackground(tabId: string, base64: string) {
  const db = await getDB();
  await db.put(BG_STORE_NAME, base64, tabId);
}

export async function loadBackgrounds(): Promise<Record<string, string>> {
  const db = await getDB();
  const tx = db.transaction(BG_STORE_NAME, 'readonly');
  const store = tx.objectStore(BG_STORE_NAME);
  const keys = await store.getAllKeys();
  const values = await store.getAll();
  
  const result: Record<string, string> = {};
  keys.forEach((key, i) => {
    result[key as string] = values[i];
  });
  return result;
}

export async function getAllStories(): Promise<any[]> {
  const db = await getDB();
  return await db.getAll(STORY_STORE_NAME);
}

export async function saveStory(story: any) {
  const db = await getDB();
  if (!story.id || typeof story.id !== 'string' || story.id.trim() === '') {
    story.id = crypto.randomUUID();
  }
  await db.put(STORY_STORE_NAME, story, story.id);
}

export async function deleteStory(id: string) {
  const db = await getDB();
  await db.delete(STORY_STORE_NAME, id);
}

export async function clearAllStories() {
  const db = await getDB();
  await db.clear(STORY_STORE_NAME);
}

export async function getAllKikokoStories(): Promise<any[]> {
  const db = await getDB();
  return await db.getAll(KIKOKO_STORY_STORE_NAME);
}

export async function getKikokoStory(id: string): Promise<any> {
  const db = await getDB();
  return await db.get(KIKOKO_STORY_STORE_NAME, id);
}

export async function saveKikokoStory(story: any) {
  const db = await getDB();
  if (!story.id || typeof story.id !== 'string' || story.id.trim() === '') {
    story.id = crypto.randomUUID();
  }
  await db.put(KIKOKO_STORY_STORE_NAME, story, story.id);
}

export async function deleteKikokoStory(id: string) {
  const db = await getDB();
  await db.delete(KIKOKO_STORY_STORE_NAME, id);
}

export async function clearAllKikokoStories() {
  const db = await getDB();
  await db.clear(KIKOKO_STORY_STORE_NAME);
}

export async function saveKikokoInstagram(storyId: string, data: any) {
  const db = await getDB();
  await db.put(KIKOKO_IG_STORE_NAME, data, storyId);
}

export async function loadKikokoInstagram(storyId: string): Promise<any> {
  const db = await getDB();
  return await db.get(KIKOKO_IG_STORE_NAME, storyId);
}

export async function saveGalleryBackground(base64: string) {
  const db = await getDB();
  await db.put(BG_STORE_NAME, base64, 'kikoko_gallery_background');
}

export async function loadGalleryBackground(): Promise<string | null> {
  const db = await getDB();
  return (await db.get(BG_STORE_NAME, 'kikoko_gallery_background')) || null;
}

export async function saveForumData(key: string, value: any) {
  const db = await getDB();
  await db.put(FORUM_STORE_NAME, value, key);
}

export async function loadForumData(key: string): Promise<any> {
  const db = await getDB();
  return await db.get(FORUM_STORE_NAME, key);
}

// NPC Helper Functions
export async function saveNPCProfile(profile: any) {
  const db = await getDB();
  if (!profile.id || typeof profile.id !== 'string' || profile.id.trim() === '') {
    profile.id = crypto.randomUUID();
  }
  await db.put(NPC_PROFILE_STORE, profile);
}

export async function loadNPCProfiles(botId: string): Promise<any[]> {
  const db = await getDB();
  return await db.getAllFromIndex(NPC_PROFILE_STORE, 'botId', botId);
}

export async function deleteNPCProfile(id: string) {
  const db = await getDB();
  await db.delete(NPC_PROFILE_STORE, id);
}

export async function saveNPCConversation(convo: any) {
  const db = await getDB();
  if (!convo.id || typeof convo.id !== 'string' || convo.id.trim() === '') {
    convo.id = crypto.randomUUID();
  }
  await db.put(NPC_CONVO_STORE, convo);
}

export async function loadNPCConversations(npcId: string): Promise<any[]> {
  const db = await getDB();
  return await db.getAllFromIndex(NPC_CONVO_STORE, 'npcId', npcId);
}

export async function deleteNPCConversation(id: string) {
  const db = await getDB();
  await db.delete(NPC_CONVO_STORE, id);
}

// Background Helper Functions
export async function saveGlobalBackground(key: string, base64: string) {
  const db = await getDB();
  await db.put(BG_STORE_NAME, base64, key);
}

export async function loadGlobalBackground(key: string): Promise<string | null> {
  const db = await getDB();
  return (await db.get(BG_STORE_NAME, key)) || null;
}

// === CÁC TIỆN ÍCH LƯU TRỮ PHÂN MẢNH (SEGMENT-BASED AUTO-SAVE) CHO CHƯƠNG TRUYỆN DÀI ===
export interface KikokoChapterPart {
  id: string; // format: `${chapterId}_part_${partIndex}`
  chapterId: string;
  partIndex: number;
  content: string;
  tokenEstimate: number;
  createdAt: number;
}

export interface KikokoChapterCheckpoint {
  chapterId: string;
  lastSavedPartIndex: number;
  estimatedSavedTokens: number;
  status: 'completed' | 'interrupted' | 'running';
  updatedAt: number;
}

export async function saveChapterPart(part: KikokoChapterPart): Promise<void> {
  const db = await getDB();
  if (!part.id || typeof part.id !== 'string' || part.id.trim() === '') {
    part.id = part.chapterId && part.partIndex !== undefined ? `${part.chapterId}_part_${part.partIndex}` : crypto.randomUUID();
  }
  await db.put(KIKOKO_CHAPTER_PARTS_STORE, part);
}

export async function getChapterParts(chapterId: string): Promise<KikokoChapterPart[]> {
  const db = await getDB();
  const parts = await db.getAllFromIndex(KIKOKO_CHAPTER_PARTS_STORE, 'chapterId', chapterId);
  // Sort them by partIndex to maintain narrative linear flow
  return parts.sort((a: any, b: any) => a.partIndex - b.partIndex);
}

export async function clearChapterParts(chapterId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(KIKOKO_CHAPTER_PARTS_STORE, 'readwrite');
  const store = tx.objectStore(KIKOKO_CHAPTER_PARTS_STORE);
  const keys = await store.getAllKeys();
  for (const key of keys) {
    if (typeof key === 'string' && key.startsWith(chapterId + '_part_')) {
      await store.delete(key);
    }
  }
  await tx.done;
}

export async function saveChapterCheckpoint(checkpoint: KikokoChapterCheckpoint): Promise<void> {
  const db = await getDB();
  if (!checkpoint.chapterId || typeof checkpoint.chapterId !== 'string' || checkpoint.chapterId.trim() === '') {
    checkpoint.chapterId = crypto.randomUUID();
  }
  await db.put(KIKOKO_CHAPTER_CHECKPOINTS_STORE, checkpoint);
}

export async function getChapterCheckpoint(chapterId: string): Promise<KikokoChapterCheckpoint | null> {
  const db = await getDB();
  return (await db.get(KIKOKO_CHAPTER_CHECKPOINTS_STORE, chapterId)) || null;
}

// === CÁC TIỆN ÍCH LƯU TRỮ KÝ ỨC VECTOR HỢP NHẤT TRÊN THIẾT BỊ NGUỜI DÙNG ===
export async function saveLocalVectorMemory(mem: any) {
  const db = await getDB();
  if (!mem.id || typeof mem.id !== 'string' || mem.id.trim() === '') {
    mem.id = crypto.randomUUID();
  }
  await db.put('kikoko_vector_memories', mem);
}

export async function getLocalVectorMemories(storyId: string): Promise<any[]> {
  const db = await getDB();
  const all = await db.getAll('kikoko_vector_memories');
  return all.filter((m: any) => m.storyId === storyId);
}

export async function saveLocalVectorMemoriesBulk(mems: any[]) {
  const db = await getDB();
  const tx = db.transaction('kikoko_vector_memories', 'readwrite');
  const store = tx.objectStore('kikoko_vector_memories');
  for (const m of mems) {
    if (!m.id || typeof m.id !== 'string' || m.id.trim() === '') {
      m.id = crypto.randomUUID();
    }
    await store.put(m);
  }
  await tx.done;
}

export async function deleteLocalVectorMemory(id: string) {
  const db = await getDB();
  await db.delete('kikoko_vector_memories', id);
}

export async function clearLocalVectorMemories(storyId: string) {
  const db = await getDB();
  const tx = db.transaction('kikoko_vector_memories', 'readwrite');
  const store = tx.objectStore('kikoko_vector_memories');
  const allKeys = await store.getAllKeys();
  for (const key of allKeys) {
    const mem = await store.get(key);
    if (mem && mem.storyId === storyId) {
      await store.delete(key);
    }
  }
  await tx.done;
}

export async function saveKikokoSocialState(storyId: string, state: any): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, state, `kikoko_social_state_${storyId}`);
}

export async function loadKikokoSocialState(storyId: string): Promise<any | null> {
  const db = await getDB();
  return (await db.get(STORE_NAME, `kikoko_social_state_${storyId}`)) || null;
}

// === AI ANALYZER HISTORIES ===
export async function saveAnalyzerAnalysisHistory(groupId: string, history: any[]) {
  const db = await getDB();
  await db.put(KIKOKO_ANALYSIS_HISTORY_STORE, history, groupId);
}

export async function loadAnalyzerAnalysisHistory(groupId: string): Promise<any[]> {
  const db = await getDB();
  return (await db.get(KIKOKO_ANALYSIS_HISTORY_STORE, groupId)) || [];
}

export async function saveAnalyzerRewriteHistory(groupId: string, history: any[]) {
  const db = await getDB();
  await db.put(KIKOKO_REWRITE_HISTORY_STORE, history, groupId);
}

export async function loadAnalyzerRewriteHistory(groupId: string): Promise<any[]> {
  const db = await getDB();
  return (await db.get(KIKOKO_REWRITE_HISTORY_STORE, groupId)) || [];
}

export async function saveAnalyzerNovelHistory(groupId: string, history: any[]) {
  const db = await getDB();
  await db.put(KIKOKO_NOVEL_HISTORY_STORE, history, groupId);
}

export async function loadAnalyzerNovelHistory(groupId: string): Promise<any[]> {
  const db = await getDB();
  return (await db.get(KIKOKO_NOVEL_HISTORY_STORE, groupId)) || [];
}

export async function saveAnalyzerSingleAnalysisHistory(groupId: string, history: any[]) {
  const db = await getDB();
  await db.put('kikoko_single_analysis_history', history, groupId);
}

export async function loadAnalyzerSingleAnalysisHistory(groupId: string): Promise<any[]> {
  const db = await getDB();
  return (await db.get('kikoko_single_analysis_history', groupId)) || [];
}


