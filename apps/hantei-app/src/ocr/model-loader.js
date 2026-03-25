/**
 * モデルファイルのダウンロード・IndexedDBキャッシュ管理
 * 参考: yuta1984/ndlocrlite-web の model-loader.ts
 */

const DB_NAME = 'HanteiOCRModels';
const DB_VERSION = 1;
const STORE_NAME = 'models';
const MODEL_VERSION = '1.0.0';

// モデル配信ベースURL
// 開発時: Viteプロキシ経由 (/models)、本番時: R2 CDN直接
const MODEL_BASE_URL = import.meta.env.VITE_MODEL_BASE_URL
  ?? (import.meta.env.DEV ? '/models' : 'https://pub-9cac8877191a4c3697edb59fd982130f.r2.dev');

export const MODEL_URLS = {
  layout: `${MODEL_BASE_URL}/deim-s-1024x1024.onnx`,
  recognition30: `${MODEL_BASE_URL}/parseq-ndl-30.onnx`,
  recognition50: `${MODEL_BASE_URL}/parseq-ndl-50.onnx`,
  recognition100: `${MODEL_BASE_URL}/parseq-ndl-100.onnx`,
};

// NDLmoji.yamlはアプリ内の静的ファイルとして配置（参考実装と同様）
export const CONFIG_URL = '/config/NDLmoji.yaml';

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
  });
}

async function getModelFromCache(modelName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(modelName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const entry = request.result;
      if (entry && entry.version === MODEL_VERSION) {
        resolve(entry.data);
      } else {
        resolve(undefined);
      }
    };
  });
}

async function saveModelToCache(modelName, data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({
      name: modelName,
      data,
      cachedAt: Date.now(),
      version: MODEL_VERSION,
    });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function downloadWithProgress(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) {
    throw new Error(`Model file not found (HTML returned): ${url}`);
  }

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
  let receivedLength = 0;
  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedLength += value.length;
    if (onProgress && contentLength > 0) {
      onProgress(receivedLength / contentLength);
    }
  }

  const allChunks = new Uint8Array(receivedLength);
  let position = 0;
  for (const chunk of chunks) {
    allChunks.set(chunk, position);
    position += chunk.length;
  }

  return allChunks.buffer;
}

export async function loadModel(modelType, onProgress) {
  const modelUrl = MODEL_URLS[modelType];
  if (!modelUrl) {
    throw new Error(`Unknown model type: ${modelType}`);
  }

  const cached = await getModelFromCache(modelType);
  if (cached) {
    console.log(`Model ${modelType} loaded from cache`);
    if (onProgress) onProgress(1.0);
    return cached;
  }

  console.log(`Downloading model ${modelType} from ${modelUrl}`);
  const modelData = await downloadWithProgress(modelUrl, onProgress);
  await saveModelToCache(modelType, modelData);
  console.log(`Model ${modelType} cached successfully`);
  return modelData;
}
