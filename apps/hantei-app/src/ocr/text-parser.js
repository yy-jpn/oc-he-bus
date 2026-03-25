/**
 * OCRテキストから健診データを抽出するパーサ
 * 既存の buildHeaderMap パターン辞書を再利用・拡張
 */

import { normalizeQual, normalizeSelect, normalizeHearing } from '../main.js';

// ============================================================
// 前処理
// ============================================================

/** 全角数字・記号を半角に変換 */
function toHalfWidth(str) {
  return str
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/[Ａ-Ｚａ-ｚ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/．/g, '.').replace(/：/g, ':').replace(/／/g, '/').replace(/－/g, '-')
    .replace(/（/g, '(').replace(/）/g, ')');
}

/** 数値コンテキストでのOCR誤認識補正 */
function fixOCRDigits(str) {
  return str.replace(/(?<=\d)[Oo](?=\d)/g, '0').replace(/(?<=\d)[lI](?=\d)/g, '1');
}

function preprocess(text) {
  return fixOCRDigits(toHalfWidth(text));
}

// ============================================================
// 日付パース
// ============================================================

const ERA_MAP = {
  '明治': 1868, '大正': 1912, '昭和': 1926, '平成': 1989, '令和': 2019,
  'M': 1868, 'T': 1912, 'S': 1926, 'H': 1989, 'R': 2019,
};

/** 和暦・西暦の日付文字列をYYYY-MM-DDに変換 */
function parseDate(str) {
  if (!str) return null;
  str = toHalfWidth(str).trim();

  // 西暦: 2025/03/10, 2025-03-10, 2025.3.10
  let m = str.match(/(\d{4})\s*[/\-\.年]\s*(\d{1,2})\s*[/\-\.月]\s*(\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }

  // 和暦: 令和7年3月10日, R7.3.10
  for (const [era, baseYear] of Object.entries(ERA_MAP)) {
    const pat = new RegExp(`${era}\\s*(\\d{1,2})\\s*[年/\\-\\.]\\s*(\\d{1,2})\\s*[月/\\-\\.]\\s*(\\d{1,2})`);
    m = str.match(pat);
    if (m) {
      const year = baseYear + parseInt(m[1]) - 1;
      return `${year}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    }
  }

  return null;
}

// ============================================================
// 項目パターン辞書（ラベル:値ペア用）
// ============================================================

const ITEM_PATTERNS = {
  name: { label: /氏名|名前|受診者名/i, type: 'text' },
  age: { label: /年齢|年令/i, type: 'number' },
  sex: { label: /性別/i, type: 'text' },
  birthDate: { label: /生年月日|誕生日/i, type: 'date' },
  examDate: { label: /検査日|受診日|健診日|実施日|受診年月日|健診年月日/i, type: 'date' },
  height: { label: /身長/i, type: 'number' },
  weight: { label: /体重/i, type: 'number' },
  waist: { label: /腹囲/i, type: 'number' },
  sbp: { label: /収縮期|最高血圧|(?:血圧.*?上)/i, type: 'number' },
  dbp: { label: /拡張期|最低血圧|(?:血圧.*?下)/i, type: 'number' },
  visionR: { label: /右.*?視力|視力.*?右/i, type: 'number' },
  visionL: { label: /左.*?視力|視力.*?左/i, type: 'number' },
  hearing1k: { label: /(?:聴力|聴検).*?1000|1000.*?Hz/i, type: 'text' },
  hearing4k: { label: /(?:聴力|聴検).*?4000|4000.*?Hz/i, type: 'text' },
  hb: { label: /血色素|ヘモグロビン(?!A)|(?<![A-Za-z])Hb(?!A)/i, type: 'number' },
  rbc: { label: /赤血球|RBC/i, type: 'number' },
  ast: { label: /AST|GOT/i, type: 'number' },
  alt: { label: /ALT|GPT/i, type: 'number' },
  ggt: { label: /[γYy].?GTP|GGT|ガンマ/i, type: 'number' },
  ldl: { label: /LDL/i, type: 'number' },
  hdl: { label: /HDL/i, type: 'number' },
  tg: { label: /TG|中性脂肪|トリグリセリド/i, type: 'number' },
  fbg: { label: /空腹時血糖|血糖(?!.*ヘモ)/i, type: 'number' },
  hba1c: { label: /HbA1c|A1c|ヘモグロビンA/i, type: 'number' },
  cre: { label: /(?:血清)?Cre|クレアチニン(?!.*尿)/i, type: 'number' },
  egfr: { label: /eGFR|GFR/i, type: 'number' },
  urineSugar: { label: /尿糖/i, type: 'qual' },
  urineProtein: { label: /尿蛋白|尿タンパク/i, type: 'qual' },
  xray: { label: /(?:胸部)?X線|レントゲン/i, type: 'select' },
  ecg: { label: /心電図|ECG/i, type: 'select' },
};

// ============================================================
// ラベル:値ペア抽出
// ============================================================

/** 行の中から項目名の直後の値を抽出 */
function extractValueAfterLabel(line, labelMatch, type) {
  const afterLabel = line.substring(labelMatch.index + labelMatch[0].length);

  if (type === 'number') {
    const m = afterLabel.match(/[:\s]*(\d+\.?\d*)/);
    return m ? parseFloat(m[1]) : null;
  }

  if (type === 'date') {
    return parseDate(afterLabel);
  }

  if (type === 'qual') {
    const m = afterLabel.match(/[:\s]*([\(\(]?\s*[3]?\+|[2]?\+|\+|\-|±|＋|ー|陰性|陽性)/);
    if (m) return normalizeQual(m[1]);
    return null;
  }

  if (type === 'select') {
    const m = afterLabel.match(/[:\s]*(.{1,20})/);
    if (m) return normalizeSelect(m[1].trim());
    return null;
  }

  if (type === 'text') {
    const m = afterLabel.match(/[:\s]*(.+)/);
    return m ? m[1].trim() : null;
  }

  return null;
}

// ============================================================
// 単位ベース値抽出（フォールバック）
// 健診結果のOCRでは値に単位が付いていることが多い
// ============================================================

function extractByUnit(text, result, found) {
  // 氏名: ふりがなの近くにある漢字名
  if (!found.has('name')) {
    // パターン1: 漢字名の後にふりがな（健診個人票の一般的な配置）
    const nameM1 = text.match(/([\u4e00-\u9fff]{1,5})\s+(?:法定外|[ぁ-ん]{2,})/);
    if (nameM1) { result.name = nameM1[1]; found.add('name'); }
    // パターン2: ふりがなの後に漢字名
    if (!found.has('name')) {
      const nameM2 = text.match(/[ぁ-ん]{2,}\s+([\u4e00-\u9fff]{2,5})/);
      if (nameM2) { result.name = nameM2[1]; found.add('name'); }
    }
  }

  // 性別
  if (!found.has('sex')) {
    const sexM = text.match(/性別\s*(男|女|male|female)/i);
    if (sexM) { result.sex = /女|female/i.test(sexM[1]) ? 'female' : 'male'; found.add('sex'); }
  }

  // 年齢: N歳
  if (!found.has('age')) {
    const ageM = text.match(/(\d{1,3})\s*歳/);
    if (ageM) { result.age = parseInt(ageM[1]); found.add('age'); }
  }

  // 生年月日: 和暦パターン（昭和52年10月19日 など）
  if (!found.has('birthDate')) {
    for (const [era, baseYear] of Object.entries(ERA_MAP)) {
      const pat = new RegExp(`(?:生年月日[\\s:]*)?(${era})\\s*(\\d{1,2})\\s*年\\s*(\\d{1,2})\\s*月\\s*(\\d{1,2})\\s*日`);
      const m = text.match(pat);
      if (m) {
        const year = baseYear + parseInt(m[2]) - 1;
        result.birthDate = `${year}-${m[3].padStart(2, '0')}-${m[4].padStart(2, '0')}`;
        found.add('birthDate');
        break;
      }
    }
  }

  // 健診年月日: 令和N年N月N日
  if (!found.has('examDate')) {
    // "令和7年4月25日" のようなパターンを探す（生年月日と区別するため後方のものを優先）
    const dates = [];
    for (const [era, baseYear] of Object.entries(ERA_MAP)) {
      const pat = new RegExp(`(${era})\\s*(\\d{1,2})\\s*年\\s*(\\d{1,2})\\s*月\\s*(\\d{1,2})\\s*日`, 'g');
      let m;
      while ((m = pat.exec(text)) !== null) {
        const year = baseYear + parseInt(m[2]) - 1;
        const dateStr = `${year}-${m[3].padStart(2, '0')}-${m[4].padStart(2, '0')}`;
        dates.push(dateStr);
      }
    }
    // 生年月日と異なる日付を検査日として使用（最も新しいもの）
    const examCandidates = dates.filter(d => d !== result.birthDate);
    if (examCandidates.length > 0) {
      examCandidates.sort((a, b) => b.localeCompare(a));
      result.examDate = examCandidates[0];
      found.add('examDate');
    }
  }

  // 既往歴: 一般的なパターン
  if (!found.has('history')) {
    const histM = text.match(/(?:既往歴|現病歴)[:\s]*([^\s]{2,20})/);
    if (histM && histM[1] !== '業務歴') { result.history = histM[1]; found.add('history'); }
  }

  // 身長: NNN.Ncm
  if (!found.has('height')) {
    const m = text.match(/(\d{2,3}\.\d)\s*cm/);
    if (m) {
      const v = parseFloat(m[1]);
      if (v >= 100 && v <= 250) { result.height = v; found.add('height'); }
    }
  }

  // 体重: NN.Nkg
  if (!found.has('weight')) {
    const m = text.match(/(\d{2,3}\.\d)\s*kg/i);
    if (m) { result.weight = parseFloat(m[1]); found.add('weight'); }
  }

  // 腹囲: 2番目のcm値（身長ではないもの）
  if (!found.has('waist')) {
    const cmValues = [...text.matchAll(/(\d{2,3}\.\d)\s*cm/g)];
    for (const cm of cmValues) {
      const v = parseFloat(cm[1]);
      if (v < 100 && v > 50) { result.waist = v; found.add('waist'); break; }
    }
  }

  // 血圧: 収縮期:NNNmHg/拡張期:NNmHg or NNN/NN
  if (!found.has('sbp') || !found.has('dbp')) {
    // パターン1: 収縮期:160mHg/拡張期:99mHg
    const bpM = text.match(/収縮期\s*[:\s]*(\d{2,3})\s*m?m?Hg\s*[/／]\s*拡張期\s*[:\s]*(\d{2,3})\s*m?m?Hg/i);
    if (bpM) {
      if (!found.has('sbp')) { result.sbp = parseInt(bpM[1]); found.add('sbp'); }
      if (!found.has('dbp')) { result.dbp = parseInt(bpM[2]); found.add('dbp'); }
    }
    // パターン2: 血圧 NNN/NN
    if (!found.has('sbp') || !found.has('dbp')) {
      const bp2 = text.match(/(?:血圧|BP)\s*[:\s]*(\d{2,3})\s*[/／]\s*(\d{2,3})/i);
      if (bp2) {
        if (!found.has('sbp')) { result.sbp = parseInt(bp2[1]); found.add('sbp'); }
        if (!found.has('dbp')) { result.dbp = parseInt(bp2[2]); found.add('dbp'); }
      }
    }
  }

  // 視力: 右:N.N左:N.N
  if (!found.has('visionR') || !found.has('visionL')) {
    const visM = text.match(/右\s*[:\s]*(\d\.\d)\s*左\s*[:\s]*(\d\.\d)/);
    if (visM) {
      if (!found.has('visionR')) { result.visionR = parseFloat(visM[1]); found.add('visionR'); }
      if (!found.has('visionL')) { result.visionL = parseFloat(visM[2]); found.add('visionL'); }
    }
  }

  // Hb: NN.Ng/dL (g/dlも対応)
  if (!found.has('hb')) {
    const m = text.match(/(\d{1,2}\.\d)\s*g\s*\/\s*d[lL]/i);
    if (m) { result.hb = parseFloat(m[1]); found.add('hb'); }
  }

  // RBC: NNN万/μL (uLも対応)
  if (!found.has('rbc')) {
    const m = text.match(/(\d{2,4})\s*万\s*\/\s*[uμ][lL]/i);
    if (m) { result.rbc = parseInt(m[1]); found.add('rbc'); }
  }

  // U/L値群: AST, ALT, γ-GTPの順序で出現することが多い
  const ulValues = [...text.matchAll(/(\d{1,4})\s*U\s*\/\s*L/gi)];
  const ulKeys = ['ast', 'alt', 'ggt'];
  for (let i = 0; i < ulValues.length && i < ulKeys.length; i++) {
    const key = ulKeys[i];
    if (!found.has(key)) {
      result[key] = parseInt(ulValues[i][1]);
      found.add(key);
    }
  }

  // mg/dL値群: ラベル付きパターンを優先
  if (!found.has('ldl')) {
    const m = text.match(/LDL[^\d]*?(\d{2,3})\s*mg\s*\/\s*d[lL]/i);
    if (m) { result.ldl = parseInt(m[1]); found.add('ldl'); }
  }
  if (!found.has('hdl')) {
    const m = text.match(/HDL[^\d]*?(\d{2,3})\s*mg\s*\/\s*d[lL]/i);
    if (m) { result.hdl = parseInt(m[1]); found.add('hdl'); }
  }
  if (!found.has('tg')) {
    const m = text.match(/(?:中性脂肪|TG)[^\d]*?(\d{2,4})\s*mg\s*\/\s*d[lL]/i);
    if (m) { result.tg = parseInt(m[1]); found.add('tg'); }
  }
  if (!found.has('fbg')) {
    const m = text.match(/(?:空腹時血糖|血糖)[^\d]*?(\d{2,3})\s*mg\s*\/\s*d[lL]/i);
    if (m) { result.fbg = parseInt(m[1]); found.add('fbg'); }
  }

  // ラベルなしmg/dL値: 順序で推定
  // 健診個人票の典型的順序: LDL, HDL, (Hb g/dL), (RBC万), FBG, (尿酸), (Cre)
  // ※ TGはmg/dLの中で3番目に出現することが多い
  const mgdlValues = [...text.matchAll(/(\d{1,4})\s*mg\s*\/\s*d[lL]/gi)];
  const mgdlKeys = ['ldl', 'hdl', 'fbg'];
  let mgdlIdx = 0;
  for (const mv of mgdlValues) {
    if (mgdlIdx >= mgdlKeys.length) break;
    const key = mgdlKeys[mgdlIdx];
    if (!found.has(key)) {
      result[key] = parseInt(mv[1]);
      found.add(key);
    }
    mgdlIdx++;
  }

  // HbA1c: N.N (% or 単位なし)
  if (!found.has('hba1c')) {
    // パターン1: ラベル付き
    let m = text.match(/(?:HbA1c|HbAlc|A1c)\s*[:\s]*(\d{1,2}\.\d)/i);
    if (m) { result.hba1c = parseFloat(m[1]); found.add('hba1c'); }
    // パターン2: 尿定性(-)の後の独立した小数（HbA1cは通常4.0-15.0の範囲）
    if (!found.has('hba1c')) {
      m = text.match(/\(-\)\s*\(-\)\s*[\S]*?\s*(\d{1,2}\.\d)\s/);
      if (m) {
        const v = parseFloat(m[1]);
        if (v >= 3.0 && v <= 15.0) { result.hba1c = v; found.add('hba1c'); }
      }
    }
  }

  // クレアチニン: N.NNmg/dL
  if (!found.has('cre')) {
    // パターン1: ラベル付き
    let m = text.match(/(?:クレアチニン|Cre)[:\s]*(\d+\.?\d*)\s*mg\s*\/\s*d[lL]/i);
    if (m) { result.cre = parseFloat(m[1]); found.add('cre'); }
    // パターン2: 0.XX mg/dL（典型的なCre値の範囲: 0.4-1.5）
    if (!found.has('cre')) {
      const creValues = [...text.matchAll(/(0\.\d{1,2})\s*mg\s*\/\s*d[lL]/gi)];
      if (creValues.length > 0) { result.cre = parseFloat(creValues[0][1]); found.add('cre'); }
    }
  }

  // eGFR
  if (!found.has('egfr')) {
    const m = text.match(/(\d{1,3}\.?\d*)\s*mL\s*\/\s*min/i);
    if (m) { result.egfr = parseFloat(m[1]); found.add('egfr'); }
  }

  // 尿糖・尿蛋白: (-) パターン
  if (!found.has('urineSugar') || !found.has('urineProtein')) {
    const qualValues = [...text.matchAll(/\(\s*([+\-±]|[23]?\+)\s*\)/g)];
    // 尿糖と尿蛋白の順序で出現
    const qualKeys = ['urineSugar', 'urineProtein'];
    for (let i = 0; i < qualValues.length && i < qualKeys.length; i++) {
      const key = qualKeys[i];
      if (!found.has(key)) {
        result[key] = normalizeQual(qualValues[i][0]);
        found.add(key);
      }
    }
  }

  // 心電図: ST-T変化、不整脈、異常なし等
  if (!found.has('ecg')) {
    if (/ST.?T変化/i.test(text)) {
      result.ecg = 'other';
      result.ecgNote = 'ST-T変化';
      found.add('ecg');
    } else if (/不整脈/i.test(text)) {
      result.ecg = 'arrhythmia';
      found.add('ecg');
    }
  }

  // 聴力: 10Hz/40Hzパターン（OCR特有の表記）
  // "10Hz右:所見なし左:所見なし40Hz右:所見あり左:所見なし"
  if (!found.has('hearing1k')) {
    const m = text.match(/1[0O]{2,3}\s*Hz\s*右\s*[:\s]*(所見なし|所見あり|異常なし|異常あり)/i);
    if (m) { result.hearing1k = normalizeHearing(m[1]); found.add('hearing1k'); }
  }
  if (!found.has('hearing4k')) {
    const m = text.match(/4[0O]{2,3}\s*Hz\s*右\s*[:\s]*(所見なし|所見あり|異常なし|異常あり)/i);
    if (m) { result.hearing4k = normalizeHearing(m[1]); found.add('hearing4k'); }
  }
}

// ============================================================
// メインパーサ
// ============================================================

export function parseOCRText(rawText) {
  const text = preprocess(rawText);
  const lines = text.split(/\n/).filter(l => l.trim());

  const result = {
    name: null, age: null, sex: 'male', history: null,
    birthDate: null, examDate: null,
    height: null, weight: null, waist: null, bmi: null,
    visionR: null, visionL: null,
    hearing1k: 'normal', hearing4k: 'normal',
    sbp: null, dbp: null,
    hb: null, rbc: null,
    ast: null, alt: null, ggt: null,
    ldl: null, hdl: null, tg: null,
    fbg: null, hba1c: null, cre: null, egfr: null,
    urineSugar: '-', urineProtein: '-',
    xray: 'normal', ecg: 'normal', ecgNote: '',
    symptoms: null,
  };

  const found = new Set();

  // Phase 1: 各行を走査してラベル:値ペアを抽出
  for (const line of lines) {
    for (const [key, { label, type }] of Object.entries(ITEM_PATTERNS)) {
      if (found.has(key)) continue;

      const m = line.match(label);
      if (!m) continue;

      const value = extractValueAfterLabel(line, m, type);
      if (value != null && value !== '') {
        if (key === 'sex') {
          result.sex = /女|female|f/i.test(value) ? 'female' : 'male';
        } else if (key === 'hearing1k' || key === 'hearing4k') {
          result[key] = normalizeHearing(value);
        } else {
          result[key] = value;
        }
        found.add(key);
      }
    }
  }

  // Phase 2: 単位ベースの値抽出（フォールバック）
  // テーブル形式のOCR（ラベルと値が離れている場合）に対応
  extractByUnit(text, result, found);

  // BMI自動計算
  if (result.height && result.weight && result.height > 0) {
    result.bmi = +(result.weight / ((result.height / 100) ** 2)).toFixed(1);
  }

  return result;
}
