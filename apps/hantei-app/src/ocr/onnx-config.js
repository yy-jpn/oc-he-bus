/**
 * ONNX Runtime Web 設定
 * Web Worker内での統一設定
 */

import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';

function initializeONNX() {
  ort.env.wasm.wasmPaths = { wasm: wasmUrl };
  ort.env.wasm.numThreads = 1;
  ort.env.logLevel = 'warning';
  ort.env.wasm.proxy = false;
}

export async function createSession(modelData, options = {}) {
  const defaultOptions = {
    executionProviders: ['wasm'],
    logSeverityLevel: 4,
    graphOptimizationLevel: 'basic',
    enableCpuMemArena: false,
    enableMemPattern: false,
    ...options,
  };

  const session = await ort.InferenceSession.create(modelData, defaultOptions);
  return session;
}

initializeONNX();

export { ort };
