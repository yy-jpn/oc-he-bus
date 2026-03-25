/**
 * OCR Web Worker
 * レイアウト検出 + カスケード文字認識 + 読み順処理
 * 参考: yuta1984/ndlocrlite-web の ocr.worker.ts（簡略化版）
 */

import './onnx-config.js';
import { loadModel } from './model-loader.js';
import { LayoutDetector } from './layout-detector.js';
import { TextRecognizer } from './text-recognizer.js';
import { ReadingOrderProcessor } from './reading-order.js';

let layoutDetector = null;
let recognizer30 = null;
let recognizer50 = null;
let recognizer100 = null;
let readingOrderProcessor = new ReadingOrderProcessor();
let isInitialized = false;

function post(message) {
  self.postMessage(message);
}

async function initialize() {
  if (isInitialized) return;

  post({ type: 'progress', percent: 2, message: 'モデルを準備中...' });

  const progresses = { layout: 0, rec30: 0, rec50: 0, rec100: 0 };
  const reportProgress = () => {
    const avg = (progresses.layout + progresses.rec30 + progresses.rec50 + progresses.rec100) / 4;
    post({ type: 'progress', percent: Math.round(2 + avg * 73), message: `モデルダウンロード中... ${Math.round(avg * 100)}%` });
  };

  const [layoutModelData, rec30Data, rec50Data, rec100Data] = await Promise.all([
    loadModel('layout', (p) => { progresses.layout = p; reportProgress(); }),
    loadModel('recognition30', (p) => { progresses.rec30 = p; reportProgress(); }),
    loadModel('recognition50', (p) => { progresses.rec50 = p; reportProgress(); }),
    loadModel('recognition100', (p) => { progresses.rec100 = p; reportProgress(); }),
  ]);

  post({ type: 'progress', percent: 76, message: 'レイアウトモデルを初期化中...' });
  layoutDetector = new LayoutDetector();
  await layoutDetector.initialize(layoutModelData);

  post({ type: 'progress', percent: 83, message: '認識モデル(30)を初期化中...' });
  recognizer30 = new TextRecognizer([1, 3, 16, 256]);
  await recognizer30.initialize(rec30Data);

  post({ type: 'progress', percent: 90, message: '認識モデル(50)を初期化中...' });
  recognizer50 = new TextRecognizer([1, 3, 16, 384]);
  await recognizer50.initialize(rec50Data);

  post({ type: 'progress', percent: 96, message: '認識モデル(100)を初期化中...' });
  recognizer100 = new TextRecognizer([1, 3, 16, 768]);
  await recognizer100.initialize(rec100Data);

  isInitialized = true;
  post({ type: 'ready' });
}

function selectRecognizer(charCountCategory) {
  if (charCountCategory === 3) return recognizer30;
  if (charCountCategory === 2) return recognizer50;
  return recognizer100;
}

async function processOCR(imageData) {
  if (!isInitialized) await initialize();

  const startTime = Date.now();

  // Stage 1: レイアウト検出
  post({ type: 'progress', percent: 10, message: 'テキスト領域を検出中...' });
  const { lines: textRegions, blocks: pageBlocks } = await layoutDetector.detect(imageData, (p) => {
    post({ type: 'progress', percent: Math.round(10 + p * 30), message: `領域検出中... ${Math.round(p * 100)}%` });
  });

  // Stage 2: 文字認識
  post({ type: 'progress', percent: 40, message: `${textRegions.length} 領域の文字を認識中...` });
  const croppedImages = TextRecognizer.cropImageDataBatch(imageData, textRegions);
  const recognitionResults = [];

  for (let i = 0; i < textRegions.length; i++) {
    const region = textRegions[i];
    const recognizer = selectRecognizer(region.charCountCategory);
    const result = await recognizer.recognizeCropped(croppedImages[i]);

    recognitionResults.push({
      ...region,
      text: result.text,
      readingOrder: i + 1,
    });

    post({
      type: 'progress',
      percent: Math.round(40 + ((i + 1) / textRegions.length) * 40),
      message: `認識中 ${i + 1}/${textRegions.length} 領域`,
    });
  }

  // Stage 3: 読み順処理
  post({ type: 'progress', percent: 80, message: '読み順を処理中...' });
  const orderedResults = readingOrderProcessor.process(recognitionResults, pageBlocks);

  // Stage 4: 出力生成
  post({ type: 'progress', percent: 90, message: 'テキストを生成中...' });
  const text = orderedResults.filter(b => b.text).map(b => b.text).join('\n');

  post({
    type: 'result',
    text,
    textBlocks: orderedResults,
    processingTime: Date.now() - startTime,
  });
}

self.onmessage = async (event) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'init':
        await initialize();
        break;
      case 'run':
        await processOCR(message.imageData);
        break;
    }
  } catch (error) {
    post({ type: 'error', message: error.message || 'Unknown error' });
  }
};

self.onerror = (error) => {
  const message = typeof error === 'string' ? error : error.message ?? 'Unknown error';
  post({ type: 'error', message });
};
