import Dexie, { Table } from 'dexie';

export interface TabBackground {
  tabId: string;
  imageBlob?: Blob;
  imageUrl?: string;
  imageName: string;
  imageType: string;
  updatedAt: number;
}

export interface NpcData {
  id: string;
  name: string;
  age: string;
  nationality: string;
  job: string;
  hobbies: string;
  interests: string;
  relationshipStatus: string;
  background: string;
  story: string;
  avatar: string;
  cover: string;
  likeCount?: string;
  followerCount?: string;
  followingCount?: string;
  createdAt: number;
  updatedAt: number;
}

export interface NpcPost {
  id: string;
  npcId: string;
  content: string;
  imageBlob?: Blob;
  likeCount: string;
  commentCount: string;
  saveCount: string;
  shareCount: string;
  createdAt: number;
}

export interface FeedBatch {
  id: string;
  npcId: string;
  model: string;
  prompt: string;
  createdAt: number;
}

export interface AppSetting {
  key: string;
  value: any;
  updatedAt: number;
}

export interface ApiFeatureBatch {
  id: string;
  featureName: string;
  npcId: string;
  npcName: string;
  model: string;
  prompt: string;
  totalTokens: number;
  itemCount: number;
  batchNumber: number;
  summary?: string;
  isPinned: boolean;
  createdAt: number;
}

export interface ApiFeatureBatchItem {
  id: string;
  batchId: string;
  title: string;
  content: string;
  metadata?: any;
}

export interface ApiHistoryBatch {
  id: string;
  featureName: string;
  activeNpc: any;
  channelId?: string;
  channelName?: string;
  createdAt: number;
  userPrompt: string;
  systemPrompt: string;
  contextWindow: any;
  response: string;
  summary?: string;
  tokenCount: number;
  model: string;
  endpoint: string;
  isPinned: number;
}

export class KikokoTiktokDB extends Dexie {
  app_settings!: Table<AppSetting, string>;
  tab_backgrounds!: Table<TabBackground, string>;
  npcs!: Table<NpcData, string>;
  npc_posts!: Table<NpcPost, string>;
  feed_batches!: Table<FeedBatch, string>;
  api_feature_batches!: Table<ApiFeatureBatch, string>;
  api_feature_batch_items!: Table<ApiFeatureBatchItem, string>;
  api_history!: Table<ApiHistoryBatch, string>;

  constructor() {
    super('KikokoTiktokDB');
    this.version(2).stores({
      app_settings: 'key',
      tab_backgrounds: 'tabId',
      npcs: 'id, createdAt',
      npc_posts: 'id, npcId, createdAt',
      feed_batches: 'id, npcId, createdAt',
      api_feature_batches: 'id, featureName, npcId, createdAt',
      api_feature_batch_items: 'id, batchId'
    });
    this.version(3).stores({
      app_settings: 'key',
      tab_backgrounds: 'tabId',
      npcs: 'id, createdAt',
      npc_posts: 'id, npcId, createdAt',
      feed_batches: 'id, npcId, createdAt',
      api_feature_batches: 'id, featureName, npcId, createdAt',
      api_feature_batch_items: 'id, batchId',
      api_history: 'id, featureName, createdAt'
    });
  }
}

export const db = new KikokoTiktokDB();

// --- BATCH HISTORY HELPERS ---

export const getBatchesByFeature = async (featureName: string) => {
  return await db.api_feature_batches
    .where('featureName')
    .equals(featureName)
    .reverse()
    .sortBy('createdAt');
};

export const getBatchItems = async (batchId: string) => {
  return await db.api_feature_batch_items
    .where('batchId')
    .equals(batchId)
    .toArray();
};

export const deleteApiBatch = async (batchId: string) => {
  await db.api_feature_batches.delete(batchId);
  await db.api_feature_batch_items.where('batchId').equals(batchId).delete();
};

export const togglePinBatch = async (id: string, isPinned: boolean) => {
  await db.api_feature_batches.update(id, { isPinned });
};

export const getNextBatchNumber = async (featureName: string) => {
  return (await db.api_feature_batches.where('featureName').equals(featureName).count()) + 1;
};

export const saveApiFeatureBatch = async (batch: ApiFeatureBatch, items: ApiFeatureBatchItem[]) => {
  if (!batch.id || batch.id.trim() === '') {
    batch.id = crypto.randomUUID();
  }
  const validatedItems = items.map(item => {
    const validated = { ...item };
    if (!validated.id || validated.id.trim() === '') {
      validated.id = crypto.randomUUID();
    }
    if (!validated.batchId || validated.batchId.trim() === '') {
      validated.batchId = batch.id;
    }
    return validated;
  });
  await db.api_feature_batches.put(batch);
  if (validatedItems.length > 0) {
    await db.api_feature_batch_items.bulkPut(validatedItems);
  }
};

export const saveApiHistoryBatch = async (batch: ApiHistoryBatch) => {
  if (!batch.id || batch.id.trim() === '') {
    batch.id = crypto.randomUUID();
  }
  await db.api_history.put(batch);
};

export const getRecentHistoryByFeature = async (featureName: string, limit: number = 2) => {
  return await db.api_history
    .where('featureName')
    .equals(featureName)
    .reverse()
    .limit(limit)
    .toArray();
};
