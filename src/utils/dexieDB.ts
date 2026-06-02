import Dexie, { Table } from 'dexie';

// --- TYPES FOR PERSISTENT STORAGE ---

export interface DiscordServer {
  id: string;
  name: string;
  avatar: string;
  coverImage?: string;
  categoryBackground?: string;
  membersCount: number;
  emojis: any[];
  roles: any[];
  members: any[]; // Full NPC objects for now to match current state
  categories: any[]; 
}

export interface NPCProfile {
  id: string;
  serverId?: string;
  name: string;
  avatar: string;
  age: number;
  gender: string;
  biography?: string;
  sexualOrientation?: string;
  habits?: string;
  hometown?: string;
  personalHobbies?: string;
  typingStyle?: string;
  onlineStatus: boolean;
  friendliness?: string;
  roleId?: string;
  isCustom?: boolean;
}

export interface ForumTopic {
  id: string;
  channelId: string;
  serverId: string;
  title: string;
  content: string;
  authorName: string;
  authorAvatar: string;
  timestamp: string;
  imageUrl?: string;
  batchId?: string;
  likes: number;
  replies: any[];
}

export interface NovelStory {
  id: string;
  title: string;
  author: string;
  description: string;
  cover: string;
  genre: string;
  status: string;
  updatedAt: number;
  intro?: string;
  // Novel specific settings/context
  mood?: string;
  direction?: string;
  tags?: string[];
  [key: string]: any; 
}

export interface NovelChapter {
  id: string;
  storyId: string;
  title: string;
  content: string;
  summary?: string;
  tokenCount: number;
  timestamp: number;
  isDraft?: boolean;
}

export interface AnalyzerPost {
  id: string;
  groupId: string;
  type: 'user' | 'hot';
  content: string; // Trong table này chỉ lưu preview 200 kí tự để Render UI siêu siêu mượt nha vợ!
  likes: number;
  comments: number;
  shares: number;
  tags: string[];
  date: string;
  imageUrl?: string;
  avatarUrl?: string;
  isActive?: boolean;
}

export interface AnalyzerPostChunk {
  id?: number;
  postId: string;
  chunkIndex: number;
  text: string;
}

export interface AppSetting {
  id: string; // key
  value: any;
}

export interface NavigationState {
  id: string; // screen name or 'last_nav'
  view: string;
  serverId?: string;
  channelId?: string;
  postId?: string;
  timestamp: number;
}

export interface CachedImage {
  id: string; // URL or custom ID
  data: string; // Base64 or Blob
  timestamp: number;
}

export interface ApiHistoryBatch {
  id: string;
  featureName: string;
  activeNpc?: any;
  channelName?: string;
  channelId?: string;
  createdAt: number;
  userPrompt?: string;
  systemPrompt?: string;
  contextWindow?: any;
  response: string;
  parsedResponse?: any;
  summary?: string;
  tokenCount: number;
  model: string;
  endpoint: string;
  isPinned?: number; // Dùng number (0|1) vì boolean không phải là valid key trong IndexedDB nhen vợ!
}

export interface ApiFeatureBatch {
  id: string; // Tự sinh
  featureName: string;
  batchNumber: number;
  batchLabel: string;
  npcId?: string;
  npcName?: string;
  channelId?: string;
  title?: string;
  summary?: string;
  itemCount: number;
  tokenCount: number;
  model: string;
  endpointDomain?: string;
  createdAt: number;
  updatedAt: number;
  isPinned: number; // 0 | 1
}

export interface ApiFeatureBatchItem {
  id?: number; // Auto-increment
  batchId: string;
  featureName: string;
  npcId?: string;
  itemType: string; // 'post' | 'comment' | 'message' | 'chat'
  itemIndex: number;
  data: any; // Nội dung thực tế của item (JSON)
  createdAt: number;
}

// --- DEXIE DATABASE DEFINITION ---

export class KikokoDexieDB extends Dexie {
  servers!: Table<DiscordServer>;
  npcs!: Table<NPCProfile>;
  topics!: Table<ForumTopic>;
  stories!: Table<NovelStory>;
  chapters!: Table<NovelChapter>;
  settings!: Table<AppSetting>;
  navigation!: Table<NavigationState>;
  imageCache!: Table<CachedImage>;
  analyzerPosts!: Table<AnalyzerPost>;
  analyzerPostChunks!: Table<AnalyzerPostChunk>;
  apiHistory!: Table<ApiHistoryBatch>;
  apiFeatureBatches!: Table<ApiFeatureBatch>;
  apiFeatureBatchItems!: Table<ApiFeatureBatchItem>;

  constructor() {
    super('KikokoPersistentDB');
    this.version(2).stores({
      servers: 'id, name',
      npcs: 'id, serverId, name',
      topics: 'id, channelId, serverId, batchId',
      stories: 'id, title, updatedAt',
      chapters: 'id, storyId, timestamp',
      settings: 'id',
      navigation: 'id',
      imageCache: 'id',
      analyzerPosts: 'id, groupId, type'
    });
    this.version(3).stores({
      servers: 'id, name',
      npcs: 'id, serverId, name',
      topics: 'id, channelId, serverId, batchId',
      stories: 'id, title, updatedAt',
      chapters: 'id, storyId, timestamp',
      settings: 'id',
      navigation: 'id',
      imageCache: 'id',
      analyzerPosts: 'id, groupId, type',
      analyzerPostChunks: '++id, postId, chunkIndex'
    });
    this.version(4).stores({
      servers: 'id, name',
      npcs: 'id, serverId, name',
      topics: 'id, channelId, serverId, batchId',
      stories: 'id, title, updatedAt',
      chapters: 'id, storyId, timestamp',
      settings: 'id',
      navigation: 'id',
      imageCache: 'id',
      analyzerPosts: 'id, groupId, type',
      analyzerPostChunks: '++id, postId, chunkIndex',
      apiHistory: 'id, featureName, channelId, createdAt, isPinned'
    });
    this.version(5).stores({
      servers: 'id, name',
      npcs: 'id, serverId, name',
      topics: 'id, channelId, serverId, batchId',
      stories: 'id, title, updatedAt',
      chapters: 'id, storyId, timestamp',
      settings: 'id',
      navigation: 'id',
      imageCache: 'id',
      analyzerPosts: 'id, groupId, type',
      analyzerPostChunks: '++id, postId, chunkIndex',
      apiHistory: 'id, featureName, channelId, createdAt, isPinned',
      apiFeatureBatches: 'id, featureName, npcId, channelId, createdAt, isPinned',
      apiFeatureBatchItems: '++id, batchId, featureName, npcId, itemType'
    });
  }
}

export const db = new KikokoDexieDB();

// --- API BATCH LIBRARY HELPERS ---

export const getNextBatchNumber = async (featureName: string) => {
  const count = await db.apiFeatureBatches.where('featureName').equals(featureName).count();
  return count + 1;
};

export const saveApiFeatureBatch = async (batch: ApiFeatureBatch, items: ApiFeatureBatchItem[]) => {
  if (!batch.id || batch.id.trim() === '') {
    batch.id = crypto.randomUUID();
  }
  const validatedItems = items.map(item => {
    const validated = { ...item };
    if (!validated.batchId || validated.batchId.trim() === '') {
      validated.batchId = batch.id;
    }
    // Note: apiFeatureBatchItems has primary key '++id', so id? is optional or auto-incremented, but we can set it if null to avoid any eval errors.
    return validated;
  });
  await db.apiFeatureBatches.put(batch);
  if (validatedItems.length > 0) {
    await db.apiFeatureBatchItems.bulkPut(validatedItems);
  }
};

export const getBatchesByFeature = async (featureName: string) => {
  return await db.apiFeatureBatches
    .where('featureName')
    .equals(featureName)
    .reverse()
    .sortBy('createdAt');
};

export const getBatchItems = async (batchId: string) => {
  return await db.apiFeatureBatchItems
    .where('batchId')
    .equals(batchId)
    .sortBy('itemIndex');
};

export const deleteApiBatch = async (batchId: string) => {
  await db.apiFeatureBatches.delete(batchId);
  await db.apiFeatureBatchItems.where('batchId').equals(batchId).delete();
};

export const togglePinBatch = async (id: string, isPinned: boolean) => {
  await db.apiFeatureBatches.update(id, { isPinned: isPinned ? 1 : 0 });
};

// --- API HISTORY HELPERS ---

export const getRecentHistoryByFeature = async (featureName: string, limit: number = 2) => {
  try {
    return await db.apiHistory
      .where('featureName')
      .equals(featureName)
      .reverse()
      .limit(limit)
      .toArray();
  } catch (err) {
    console.warn("Lỗi getRecentHistoryByFeature, dùng fallback:", err);
    const all = await db.apiHistory.where('featureName').equals(featureName).toArray();
    return all.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, limit);
  }
};

export const saveApiHistoryBatch = async (batch: ApiHistoryBatch) => {
  if (!batch.id || batch.id.trim() === '') {
    batch.id = crypto.randomUUID();
  }
  await db.apiHistory.put(batch);
};

export const getApiHistory = async (limit: number = 50, offset: number = 0) => {
  try {
    return await db.apiHistory
      .orderBy('createdAt')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  } catch (err) {
    console.warn("Lỗi getApiHistory, dùng fallback:", err);
    // Fallback nếu index gãy hoặc gặp record có key invalid nhen vợ!
    const all = await db.apiHistory.toArray();
    return all
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(offset, offset + limit);
  }
};

export const getPinnedApiHistory = async () => {
  try {
     return await db.apiHistory.where('isPinned').equals(1).toArray();
  } catch (err) {
     const all = await db.apiHistory.toArray();
     return all.filter(item => item.isPinned === 1);
  }
};

export const deleteApiHistory = async (id: string) => {
  await db.apiHistory.delete(id);
};

export const togglePinHistory = async (id: string, isPinned: boolean) => {
  await db.apiHistory.update(id, { isPinned: isPinned ? 1 : 0 });
};

// --- HELPER FUNCTIONS FOR AUTO-SAVE & RESTORE ---

export const saveNavigationState = async (state: Partial<NavigationState>) => {
  await db.navigation.put({
    id: 'last_discord_nav',
    view: state.view || 'community',
    serverId: state.serverId,
    channelId: state.channelId,
    postId: state.postId,
    timestamp: Date.now()
  });
};

export const getNavigationState = async () => {
  return await db.navigation.get('last_discord_nav');
};

export const saveAppSetting = async (key: string, value: any) => {
  await db.settings.put({ id: key, value });
};

export const getAppSetting = async (key: string) => {
  const setting = await db.settings.get(key);
  return setting?.value;
};

// --- NPC HELPERS ---

export const saveNPC = async (npc: NPCProfile) => {
  if (!npc.id || typeof npc.id !== 'string' || npc.id.trim() === '') {
    npc.id = crypto.randomUUID();
  }
  await db.npcs.put(npc);
};

export const getNPCsByServer = async (serverId: string) => {
  return await db.npcs.where('serverId').equals(serverId).toArray();
};

// --- FORUM TOPIC HELPERS ---

export const saveTopic = async (topic: ForumTopic) => {
  if (!topic.id || typeof topic.id !== 'string' || topic.id.trim() === '') {
    topic.id = crypto.randomUUID();
  }
  await db.topics.put(topic);
};

export const getTopicsByChannel = async (channelId: string) => {
  return await db.topics.where('channelId').equals(channelId).toArray();
};

// --- IMAGE CACHE HELPERS ---

export const cacheLocalImage = async (base64Data: string): Promise<string> => {
  try {
    const id = `local-img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await db.imageCache.put({
      id,
      data: base64Data,
      timestamp: Date.now()
    });
    return id;
  } catch (error) {
    console.error('Lỗi cache ảnh vào Dexie:', error);
    return base64Data; // Fallback to raw base64 if cache fails
  }
};

export const getCachedImage = async (id: string): Promise<string | null> => {
  if (!id.startsWith('local-img-')) return null;
  const entry = await db.imageCache.get(id);
  return entry ? entry.data : null;
};

// --- ANALYZER POST HELPERS ---

export const saveAnalyzerPost = async (post: AnalyzerPost) => {
  if (!post.id || typeof post.id !== 'string' || post.id.trim() === '') {
    post.id = crypto.randomUUID();
  }
  await db.analyzerPosts.put(post);
};

export const deleteAnalyzerPost = async (id: string) => {
  await db.analyzerPosts.delete(id);
};

export const getAnalyzerPosts = async (groupId: string, type: 'user' | 'hot') => {
  return await db.analyzerPosts.where({ groupId, type }).reverse().sortBy('date');
};

export const saveMultipleAnalyzerPosts = async (posts: AnalyzerPost[]) => {
  if (posts.length === 0) return;
  const validated = posts.map(p => {
    if (!p.id || typeof p.id !== 'string' || p.id.trim() === '') {
      return { ...p, id: crypto.randomUUID() };
    }
    return p;
  });
  await db.analyzerPosts.bulkPut(validated);
};

// --- CHUNK HELPERS FOR LONG POSTS ---
export const savePostContentInChunks = async (postId: string, text: string) => {
  // Xóa sạch chunk cũ của bài viết này nhen
  await db.analyzerPostChunks.where('postId').equals(postId).delete();
  
  if (!text) return;
  
  const CHUNK_SIZE = 10000;
  const numChunks = Math.ceil(text.length / CHUNK_SIZE);
  
  // Thực thi bất đồng bộ giãn cách, nhường CPU tránh block main thread
  const saveChunkAsync = (idx: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const start = idx * CHUNK_SIZE;
        const chunkText = text.substring(start, start + CHUNK_SIZE);
        await db.analyzerPostChunks.put({
          postId,
          chunkIndex: idx,
          text: chunkText
        });
        resolve();
      }, 0);
    });
  };

  for (let i = 0; i < numChunks; i++) {
    await saveChunkAsync(i);
  }
};

export const getPostContentFromChunks = async (postId: string): Promise<string> => {
  const chunks = await db.analyzerPostChunks.where('postId').equals(postId).sortBy('chunkIndex');
  if (chunks.length === 0) return '';
  return chunks.map(c => c.text).join('');
};

export const deletePostChunks = async (postId: string) => {
  await db.analyzerPostChunks.where('postId').equals(postId).delete();
};
