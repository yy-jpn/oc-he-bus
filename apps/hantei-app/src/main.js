import './styles.css';

// ============================================================
// デフォルト閾値
// ============================================================
const DEFAULT_THRESHOLDS = {
  bmi_low:  { label: 'BMI 下限', value: 16.5, unit: '未満', type: 'number' },
  bmi_high: { label: 'BMI 上限', value: 35, unit: '以上', type: 'number' },
  sbp:      { label: '収縮期血圧', value: 180, unit: 'mmHg以上', type: 'number' },
  dbp:      { label: '拡張期血圧', value: 110, unit: 'mmHg以上', type: 'number' },
  hb_low:   { label: 'Hb 下限', value: 8, unit: 'g/dL以下', type: 'number' },
  hb_high:  { label: 'Hb 上限', value: 20, unit: 'g/dL以上', type: 'number' },
  ast:      { label: 'AST', value: 200, unit: 'U/L以上', type: 'number' },
  alt:      { label: 'ALT', value: 200, unit: 'U/L以上', type: 'number' },
  ldl:      { label: 'LDL-c', value: 200, unit: 'mg/dL以上', type: 'number' },
  tg:       { label: 'TG', value: 500, unit: 'mg/dL以上', type: 'number' },
  fbg:      { label: '空腹時血糖', value: 200, unit: 'mg/dL以上', type: 'number' },
  cre:      { label: '血清Cre', value: 2.0, unit: 'mg/dL以上', type: 'number' },
  egfr_over40:  { label: 'eGFR（40歳以上）', value: 45, unit: '以下', type: 'number' },
  egfr_under40: { label: 'eGFR（40歳未満）', value: 60, unit: '以下', type: 'number' },
  vision:   { label: '視力（矯正）', value: '', unit: '未満', type: 'number_optional' },
  urine_protein: { label: '尿蛋白', value: '1+', type: 'select', options: [
    { v: 'off', l: '判定しない' }, { v: '+-', l: '±以上' },
    { v: '1+', l: '1+以上' }, { v: '2+', l: '2+以上' }, { v: '3+', l: '3+以上' },
  ]},
  urine_sugar: { label: '尿糖', value: 'off', type: 'select', options: [
    { v: 'off', l: '判定しない' }, { v: '+-', l: '±以上' },
    { v: '1+', l: '1+以上' }, { v: '2+', l: '2+以上' }, { v: '3+', l: '3+以上' },
  ]},
  hearing: { label: '聴力', value: '4k_only', type: 'select', options: [
    { v: 'off', l: '判定しない' },
    { v: '4k_only', l: '4000Hzに異常あり' },
    { v: '1k_only', l: '1000Hzに異常あり' },
    { v: 'both', l: '1000Hz・4000Hzともに異常' },
    { v: 'either', l: '1000Hz・4000Hzいずれかに異常' },
  ]},
  ecg: { label: '心電図', value: 'not_normal_obs', type: 'select', options: [
    { v: 'off', l: '判定しない' },
    { v: 'not_normal', l: '異常なし以外すべて' },
    { v: 'not_normal_obs', l: '異常なし・経過観察以外' },
  ]},
  xray: { label: '胸部X線', value: 'not_normal_obs', type: 'select', options: [
    { v: 'off', l: '判定しない' },
    { v: 'not_normal', l: '異常なし以外すべて' },
    { v: 'not_normal_obs', l: '異常なし・経過観察以外' },
  ]},
};

let thresholds = loadThresholds();
let autoOverwrite = loadAutoOverwrite();

function loadThresholds() {
  try {
    const saved = localStorage.getItem('oc-he-thresholds');
    if (saved) {
      const parsed = JSON.parse(saved);
      const merged = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));
      for (const k in parsed) { if (merged[k]) merged[k].value = parsed[k]; }
      return merged;
    }
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));
}

function loadAutoOverwrite() {
  try {
    return localStorage.getItem('oc-he-auto-overwrite') === 'true';
  } catch(e) { return false; }
}

window.showSettings = function() {
  const form = document.getElementById('threshold-form');
  form.innerHTML = Object.entries(thresholds).map(([key, t]) => {
    if (t.type === 'select') {
      const opts = t.options.map(o => `<option value="${o.v}"${o.v === t.value ? ' selected' : ''}>${o.l}</option>`).join('');
      return `<div class="flex items-center gap-3"><label class="w-32 text-sm font-medium">${t.label}</label><select id="th-${key}" class="border rounded px-3 py-1 text-sm">${opts}</select></div>`;
    } else if (t.type === 'number_optional') {
      return `<div class="flex items-center gap-3"><label class="w-32 text-sm font-medium">${t.label}</label><input type="number" step="any" id="th-${key}" value="${t.value}" class="border rounded px-3 py-1 text-sm w-24" placeholder="未設定"><span class="text-xs text-gray-400">${t.unit}</span></div>`;
    }
    return `<div class="flex items-center gap-3"><label class="w-32 text-sm font-medium">${t.label}</label><input type="number" step="any" id="th-${key}" value="${t.value}" class="border rounded px-3 py-1 text-sm w-24"><span class="text-xs text-gray-400">${t.unit}</span></div>`;
  }).join('');
  document.getElementById('th-auto-overwrite').checked = autoOverwrite;
  document.getElementById('settings-modal').classList.remove('hidden');
};
window.hideSettings = function() { document.getElementById('settings-modal').classList.add('hidden'); };
window.saveThresholds = function() {
  const vals = {};
  for (const key in thresholds) {
    const el = document.getElementById(`th-${key}`);
    if (!el) { vals[key] = thresholds[key].value; continue; }
    if (thresholds[key].type === 'select') {
      thresholds[key].value = el.value; vals[key] = el.value;
    } else if (thresholds[key].type === 'number_optional') {
      const v = el.value.trim();
      thresholds[key].value = v === '' ? '' : parseFloat(v); vals[key] = thresholds[key].value;
    } else {
      thresholds[key].value = parseFloat(el.value); vals[key] = thresholds[key].value;
    }
  }
  localStorage.setItem('oc-he-thresholds', JSON.stringify(vals));
  autoOverwrite = document.getElementById('th-auto-overwrite').checked;
  localStorage.setItem('oc-he-auto-overwrite', String(autoOverwrite));
  window.hideSettings();
};
window.resetThresholds = function() {
  thresholds = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));
  localStorage.removeItem('oc-he-thresholds');
  autoOverwrite = false;
  localStorage.removeItem('oc-he-auto-overwrite');
  window.showSettings();
};

// ============================================================
// タブ切り替え
// ============================================================
window.switchTab = function(name) {
  ['upload','list','results'].forEach(t => {
    document.getElementById('panel-'+t).classList.toggle('hidden', t !== name);
    document.getElementById('tab-'+t).classList.toggle('tab-active', t === name);
    if (t !== name) document.getElementById('tab-'+t).classList.add('text-gray-500');
    else document.getElementById('tab-'+t).classList.remove('text-gray-500');
  });
};

// ============================================================
// 対象者データストア
// ============================================================
let persons = [];

function getFormData() {
  const g = id => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; };
  const s = id => document.getElementById(id).value;
  const h = g('f-height'), w = g('f-weight');
  const bmi = (h && w && h > 0) ? +(w / ((h/100)**2)).toFixed(1) : null;
  return {
    name: s('f-name'), age: g('f-age'), sex: s('f-sex'), history: s('f-history'),
    birthDate: s('f-birth-date') || null, examDate: s('f-exam-date') || null,
    height: h, weight: w, waist: g('f-waist'), bmi,
    visionR: g('f-vision-r'), visionL: g('f-vision-l'),
    hearing1k: s('f-hearing-1k'), hearing4k: s('f-hearing-4k'),
    sbp: g('f-sbp'), dbp: g('f-dbp'),
    hb: g('f-hb'), rbc: g('f-rbc'),
    ast: g('f-ast'), alt: g('f-alt'), ggt: g('f-ggt'),
    ldl: g('f-ldl'), hdl: g('f-hdl'), tg: g('f-tg'),
    fbg: g('f-fbg'), hba1c: g('f-hba1c'), cre: g('f-cre'), egfr: g('f-egfr'),
    urineSugar: s('f-urine-sugar'), urineProtein: s('f-urine-protein'),
    xray: s('f-xray'), ecg: s('f-ecg'), ecgNote: s('f-ecg-note'),
    symptoms: s('f-symptoms'),
  };
}

// ============================================================
// 同一人物検出・マージ
// ============================================================
function normalizeName(name) {
  if (!name) return '';
  return name.replace(/[\s　]/g, '').normalize('NFKC').toLowerCase();
}

function findSamePerson(person) {
  const newName = normalizeName(person.name);
  if (!newName) return -1;
  for (let i = 0; i < persons.length; i++) {
    const existName = normalizeName(persons[i].name);
    if (newName === existName) {
      if (person.birthDate && persons[i].birthDate) {
        if (person.birthDate === persons[i].birthDate) return i;
      } else {
        return i;
      }
    }
  }
  return -1;
}

function showMergeDialog(existingPerson, newPerson) {
  return new Promise((resolve) => {
    const dialog = document.getElementById('merge-dialog');
    const msg = document.getElementById('merge-dialog-message');
    const existDate = existingPerson.examDate || '不明';
    const newDate = newPerson.examDate || '不明';
    msg.textContent = `「${newPerson.name}」は既に登録されています。既存データ（検査日: ${existDate}）を新しいデータ（検査日: ${newDate}）で上書きしますか？`;
    dialog.classList.remove('hidden');

    const overwriteBtn = document.getElementById('merge-dialog-overwrite');
    const skipBtn = document.getElementById('merge-dialog-skip');

    function cleanup() {
      dialog.classList.add('hidden');
      overwriteBtn.removeEventListener('click', onOverwrite);
      skipBtn.removeEventListener('click', onSkip);
    }
    function onOverwrite() { cleanup(); resolve('overwrite'); }
    function onSkip() { cleanup(); resolve('skip'); }

    overwriteBtn.addEventListener('click', onOverwrite);
    skipBtn.addEventListener('click', onSkip);
  });
}

async function addPersonWithMerge(person) {
  const existIdx = findSamePerson(person);
  if (existIdx >= 0) {
    const existing = persons[existIdx];
    // examDateで比較: 新しい方を採用（examDateがない場合は後から入力されたデータを最新とみなす）
    const existDate = existing.examDate ? new Date(existing.examDate) : new Date(0);
    const newDate = person.examDate ? new Date(person.examDate) : new Date();

    if (autoOverwrite) {
      if (newDate >= existDate) {
        persons[existIdx] = person;
      }
      // 古いデータの場合は無視
    } else {
      const action = await showMergeDialog(existing, person);
      if (action === 'overwrite') {
        persons[existIdx] = person;
      } else {
        persons.push(person);
      }
    }
  } else {
    persons.push(person);
  }
  updatePersonCount();
  renderPersonTable();
}

window.addPerson = async function() {
  const d = getFormData();
  if (!d.name) { alert('氏名を入力してください。'); return; }
  await addPersonWithMerge(d);
  clearFormFields();
  window.switchTab('list');
};

window.removePerson = function(i) { persons.splice(i, 1); updatePersonCount(); renderPersonTable(); };
function updatePersonCount() { document.getElementById('person-count').textContent = persons.length; }

function renderPersonTable() {
  const c = document.getElementById('person-table-container');
  if (persons.length === 0) { c.innerHTML = '<p class="text-gray-400 text-sm">対象者が追加されていません。</p>'; return; }
  c.innerHTML = `<table class="w-full text-sm"><thead><tr class="bg-gray-50 text-left"><th class="px-3 py-2">氏名</th><th class="px-3 py-2">年齢</th><th class="px-3 py-2">性別</th><th class="px-3 py-2">検査日</th><th class="px-3 py-2">BP</th><th class="px-3 py-2">Hb</th><th class="px-3 py-2">FBG</th><th class="px-3 py-2"></th></tr></thead><tbody>${
    persons.map((p,i) => `<tr class="border-t"><td class="px-3 py-2">${p.name}</td><td class="px-3 py-2">${p.age||'-'}</td><td class="px-3 py-2">${p.sex==='male'?'男':'女'}</td><td class="px-3 py-2">${p.examDate||'-'}</td><td class="px-3 py-2">${p.sbp||'-'}/${p.dbp||'-'}</td><td class="px-3 py-2">${p.hb||'-'}</td><td class="px-3 py-2">${p.fbg||'-'}</td><td class="px-3 py-2"><button onclick="removePerson(${i})" class="text-red-500 hover:text-red-700 text-xs">削除</button></td></tr>`).join('')
  }</tbody></table>`;
}

// ============================================================
// BMI自動計算
// ============================================================
document.getElementById('f-height').addEventListener('input', () => {
  const h = parseFloat(document.getElementById('f-height').value)/100;
  const w = parseFloat(document.getElementById('f-weight').value);
  document.getElementById('f-bmi').value = (h>0 && w>0) ? (w/(h*h)).toFixed(1) : '';
});
document.getElementById('f-weight').addEventListener('input', () => document.getElementById('f-height').dispatchEvent(new Event('input')));

// ============================================================
// フォームクリア
// ============================================================
function clearFormFields() {
  document.querySelectorAll('#panel-upload input[type="number"], #panel-upload input[type="text"], #panel-upload input[type="date"]').forEach(el => el.value = '');
  document.querySelectorAll('#panel-upload select').forEach(el => el.selectedIndex = 0);
  document.getElementById('f-symptoms').value = '';
  document.getElementById('f-bmi').value = '';
  // OCRハイライトをリセット
  document.querySelectorAll('#panel-upload .ocr-filled').forEach(el => el.classList.remove('ocr-filled'));
  // OCR元テキストを非表示
  document.getElementById('ocr-raw-text-section').classList.add('hidden');
}
window.clearFormFields = clearFormFields;

// ============================================================
// フォームに値をセット（OCR結果反映用）
// ============================================================
function fillFormWithPerson(person, rawText) {
  clearFormFields();
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val != null && val !== '') {
      el.value = val;
      el.classList.add('ocr-filled');
    }
  };
  setVal('f-name', person.name);
  setVal('f-age', person.age);
  if (person.sex) document.getElementById('f-sex').value = person.sex;
  setVal('f-birth-date', person.birthDate);
  setVal('f-exam-date', person.examDate);
  setVal('f-history', person.history);
  setVal('f-height', person.height);
  setVal('f-weight', person.weight);
  setVal('f-waist', person.waist);
  setVal('f-vision-r', person.visionR);
  setVal('f-vision-l', person.visionL);
  if (person.hearing1k) document.getElementById('f-hearing-1k').value = person.hearing1k;
  if (person.hearing4k) document.getElementById('f-hearing-4k').value = person.hearing4k;
  setVal('f-sbp', person.sbp);
  setVal('f-dbp', person.dbp);
  setVal('f-hb', person.hb);
  setVal('f-rbc', person.rbc);
  setVal('f-ast', person.ast);
  setVal('f-alt', person.alt);
  setVal('f-ggt', person.ggt);
  setVal('f-ldl', person.ldl);
  setVal('f-hdl', person.hdl);
  setVal('f-tg', person.tg);
  setVal('f-fbg', person.fbg);
  setVal('f-hba1c', person.hba1c);
  setVal('f-cre', person.cre);
  setVal('f-egfr', person.egfr);
  if (person.urineSugar) document.getElementById('f-urine-sugar').value = person.urineSugar;
  if (person.urineProtein) document.getElementById('f-urine-protein').value = person.urineProtein;
  if (person.xray) document.getElementById('f-xray').value = person.xray;
  if (person.ecg) document.getElementById('f-ecg').value = person.ecg;
  setVal('f-ecg-note', person.ecgNote);
  setVal('f-symptoms', person.symptoms);

  // BMI自動計算
  document.getElementById('f-height').dispatchEvent(new Event('input'));

  // OCR元テキスト表示
  if (rawText) {
    const section = document.getElementById('ocr-raw-text-section');
    section.classList.remove('hidden');
    document.getElementById('ocr-raw-text').textContent = rawText;
  }
}

// ============================================================
// ファイルアップロード処理
// ============================================================
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', e => handleFiles(e.target.files));

async function handleFiles(files) {
  const csvFiles = [];
  const ocrFiles = [];

  for (const file of files) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) {
      csvFiles.push(file);
    } else if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.pdf')) {
      ocrFiles.push(file);
    } else {
      alert(`対応していないファイル形式です: ${file.name}`);
    }
  }

  for (const file of csvFiles) {
    await handleCSV(file);
  }

  if (ocrFiles.length > 0) {
    await handleOCRFiles(ocrFiles);
  }

  fileInput.value = '';
}

async function handleCSV(file) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) { alert('CSVにデータ行がありません。'); return; }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const headerMap = buildHeaderMap(headers);

  let added = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const person = mapCSVRow(headerMap, cols);
    if (person.name || added === 0) {
      await addPersonWithMerge(person);
      added++;
    }
  }
  updatePersonCount();
  renderPersonTable();
  window.switchTab('list');
  alert(`CSVから ${added} 名分のデータを読み込みました。`);
}

function parseCSVLine(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

export function buildHeaderMap(headers) {
  const map = {};
  const patterns = {
    name: /氏名|名前|name/i,
    age: /年齢|age/i,
    sex: /性別|sex|gender/i,
    birthDate: /生年月日|誕生日|birth/i,
    examDate: /検査日|受診日|健診日|実施日|exam.*date/i,
    height: /身長|height/i,
    weight: /体重|weight/i,
    waist: /腹囲|waist/i,
    visionR: /右.*視力|視力.*右|vision.*r/i,
    visionL: /左.*視力|視力.*左|vision.*l/i,
    hearing1k: /1000|1k/i,
    hearing4k: /4000|4k/i,
    sbp: /収縮|最高|sbp|systolic/i,
    dbp: /拡張|最低|dbp|diastolic/i,
    hb: /血色素|ヘモグロビン(?!A1c)|(?<![A-Za-z])Hb(?!A1c)|hemoglobin/i,
    rbc: /赤血球|rbc/i,
    ast: /AST|GOT/i,
    alt: /ALT|GPT/i,
    ggt: /γ.?GTP|GGT|ガンマ/i,
    ldl: /LDL/i,
    hdl: /HDL/i,
    tg: /TG|中性脂肪|トリグリセリド/i,
    fbg: /空腹時血糖|血糖|FBG|FBS|glucose/i,
    hba1c: /HbA1c|A1c|ヘモグロビンA1c/i,
    cre: /血清Cre|(?<![尿])Cre|(?<![尿])クレアチニン|serum.*creatinine|creatinine(?!.*urine)/i,
    egfr: /eGFR|GFR/i,
    urineSugar: /尿糖/i,
    urineProtein: /尿蛋白|尿タンパク/i,
    xray: /X線|レントゲン|胸部/i,
    ecg: /心電図|ECG|EKG/i,
    history: /既往|現病歴|history/i,
    symptoms: /自覚|他覚|症状|symptom/i,
  };
  headers.forEach((h, idx) => {
    for (const [key, pat] of Object.entries(patterns)) {
      if (!map[key] && pat.test(h)) { map[key] = idx; break; }
    }
  });
  return map;
}

export function normalizeQual(val) {
  if (!val) return '-';
  if (/3\+|3＋|＋＋＋/.test(val)) return '3+';
  if (/2\+|2＋|＋＋/.test(val)) return '2+';
  if (/1\+|1＋|(?<!\d)＋(?!＋)|(?<!\d)\+(?!\+)/.test(val)) return '1+';
  if (/±|＋ー|＋−/.test(val)) return '+-';
  if (/^[\-ー－]$|陰性|negative/i.test(val)) return '-';
  return val;
}

export function normalizeSelect(val) {
  if (!val) return 'normal';
  if (/異常なし|正常|問題なし|normal/i.test(val)) return 'normal';
  if (/経過観察|要経過/i.test(val)) return 'observation';
  if (/要精検|要精密/i.test(val)) return 'recheck';
  if (/不整脈/i.test(val)) return 'arrhythmia';
  if (/虚血/i.test(val)) return 'ischemia';
  if (/異常/i.test(val)) return 'abnormal';
  return 'other';
}

export function normalizeHearing(val) {
  if (!val) return 'normal';
  if (/異常なし|正常|所見なし|normal/i.test(val)) return 'normal';
  return 'abnormal';
}

function mapCSVRow(headerMap, cols) {
  const get = key => headerMap[key] !== undefined ? cols[headerMap[key]] || '' : '';
  const num = key => { const v = parseFloat(get(key)); return isNaN(v) ? null : v; };
  const sexRaw = get('sex');
  const sex = /女|female|f/i.test(sexRaw) ? 'female' : 'male';
  const h = num('height'), w = num('weight');
  const bmi = (h && w && h > 0) ? +(w / ((h/100)**2)).toFixed(1) : null;

  return {
    name: get('name'), age: num('age'), sex, history: get('history'),
    birthDate: get('birthDate') || null, examDate: get('examDate') || null,
    height: h, weight: w, waist: num('waist'), bmi,
    visionR: num('visionR'), visionL: num('visionL'),
    hearing1k: normalizeHearing(get('hearing1k')), hearing4k: normalizeHearing(get('hearing4k')),
    sbp: num('sbp'), dbp: num('dbp'),
    hb: num('hb'), rbc: num('rbc'),
    ast: num('ast'), alt: num('alt'), ggt: num('ggt'),
    ldl: num('ldl'), hdl: num('hdl'), tg: num('tg'),
    fbg: num('fbg'), hba1c: num('hba1c'), cre: num('cre'), egfr: num('egfr'),
    urineSugar: normalizeQual(get('urineSugar')), urineProtein: normalizeQual(get('urineProtein')),
    xray: normalizeSelect(get('xray')), ecg: normalizeSelect(get('ecg')), ecgNote: normalizeSelect(get('ecg')) !== 'normal' && normalizeSelect(get('ecg')) !== 'observation' ? get('ecg') : '',
    symptoms: get('symptoms'),
  };
}

// ============================================================
// OCR ファイル処理
// ============================================================
let ocrWorker = null;

function showOCRProgress(percent, message) {
  const container = document.getElementById('ocr-progress');
  const bar = document.getElementById('ocr-progress-bar');
  const text = document.getElementById('ocr-progress-text');
  container.classList.remove('hidden');
  bar.style.width = percent + '%';
  text.textContent = message;
}

function hideOCRProgress() {
  document.getElementById('ocr-progress').classList.add('hidden');
}

async function getOCRWorker() {
  if (ocrWorker) return ocrWorker;
  ocrWorker = new Worker(new URL('./ocr/ocr.worker.js', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    ocrWorker.onmessage = (e) => {
      if (e.data.type === 'progress') {
        showOCRProgress(e.data.percent, e.data.message);
      } else if (e.data.type === 'ready') {
        resolve(ocrWorker);
      } else if (e.data.type === 'error') {
        reject(new Error(e.data.message));
      }
    };
    ocrWorker.postMessage({ type: 'init' });
  });
}

async function runOCR(imageData) {
  const worker = await getOCRWorker();
  return new Promise((resolve, reject) => {
    const handler = (e) => {
      if (e.data.type === 'progress') {
        showOCRProgress(e.data.percent, e.data.message);
      } else if (e.data.type === 'result') {
        worker.removeEventListener('message', handler);
        resolve(e.data);
      } else if (e.data.type === 'error') {
        worker.removeEventListener('message', handler);
        reject(new Error(e.data.message));
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'run', imageData }, [imageData.data.buffer]);
  });
}

async function handleOCRFiles(files) {
  try {
    showOCRProgress(0, 'OCRモデルを準備中...');

    const { loadImageFile } = await import('./ocr/image-loader.js');
    const { loadPDFFile } = await import('./ocr/pdf-loader.js');
    const { parseOCRText } = await import('./ocr/text-parser.js');

    // ファイルごとにページをグルーピング（1ファイル=1人想定）
    const fileGroups = [];
    for (const file of files) {
      const name = file.name.toLowerCase();
      if (name.endsWith('.pdf')) {
        const pages = await loadPDFFile(file);
        fileGroups.push({ filename: file.name, pages });
      } else {
        const imageData = await loadImageFile(file);
        fileGroups.push({ filename: file.name, pages: [imageData] });
      }
    }

    const totalPages = fileGroups.reduce((s, g) => s + g.pages.length, 0);
    let processedPages = 0;

    if (fileGroups.length === 1) {
      // === 単一ファイルモード: フォームに自動入力 ===
      const group = fileGroups[0];
      const texts = [];
      for (const page of group.pages) {
        processedPages++;
        showOCRProgress(
          Math.round((processedPages / totalPages) * 100),
          `OCR処理中 (${processedPages}/${totalPages}ページ)`
        );
        const result = await runOCR(page);
        texts.push(result.text);
      }
      hideOCRProgress();

      const combinedText = texts.join('\n\n');
      const person = parseOCRText(combinedText);
      fillFormWithPerson(person, combinedText);
      window.switchTab('upload');
      alert('OCR結果をフォームに反映しました。内容を確認・修正してから「対象者に追加」を押してください。');
    } else {
      // === 複数ファイルモード: ファイルごとにパースして対象者に自動追加 ===
      let added = 0;
      for (const group of fileGroups) {
        const texts = [];
        for (const page of group.pages) {
          processedPages++;
          showOCRProgress(
            Math.round((processedPages / totalPages) * 100),
            `OCR処理中 (${processedPages}/${totalPages}ページ — ${group.filename})`
          );
          const result = await runOCR(page);
          texts.push(result.text);
        }
        const combinedText = texts.join('\n\n');
        const person = parseOCRText(combinedText);
        if (person.name) {
          await addPersonWithMerge(person);
          added++;
        }
      }
      hideOCRProgress();
      updatePersonCount();
      renderPersonTable();
      window.switchTab('list');
      alert(`OCRから ${added} 名分のデータを読み込みました。`);
    }
  } catch (err) {
    hideOCRProgress();
    console.error('OCR error:', err);
    alert(`OCR処理でエラーが発生しました: ${err.message}`);
  }
}

// ============================================================
// eGFR自動計算（日本人向けGFR推算式）
// ============================================================
function calcEGFR(cre, age, sex) {
  if (cre == null || age == null || cre <= 0) return null;
  const base = 194 * Math.pow(cre, -1.094) * Math.pow(age, -0.287);
  return sex === 'female' ? +(base * 0.739).toFixed(1) : +base.toFixed(1);
}

// ============================================================
// 判定ロジック
// ============================================================
const TYPE_DESC = {
  1: { name: '類型1: 就業による持病悪化の予防', desc: '就業が健康や疾病経過に悪影響を与えると予見される場合' },
  2: { name: '類型2: 事故・災害リスクの予防', desc: '疾患に関連して生じる可能性のある事故を予防する目的' },
  3: { name: '類型3: 健康管理（受診勧奨）', desc: '受診や生活習慣の改善を促すための就業制限' },
  4: { name: '類型4: 企業・職場への注意喚起', desc: '事業主への問題提起としての就業制限' },
  5: { name: '類型5: 適正配置', desc: '健康上の理由や能力的な適性からの業務制限' },
};

function judgePerson(p) {
  const th = thresholds;
  const findings = [];
  const types = new Set();
  const measures = [];

  if (p.bmi !== null) {
    if (p.bmi < th.bmi_low.value) {
      findings.push({ severity: 'danger', item: 'BMI', value: p.bmi, note: '著明低体重' });
      types.add(1); measures.push('受診勧奨（低体重の精査）');
    } else if (p.bmi >= th.bmi_high.value) {
      findings.push({ severity: 'danger', item: 'BMI', value: p.bmi, note: '高度肥満' });
      types.add(1); measures.push('受診勧奨（肥満関連疾患の精査）');
    }
  }

  if (p.sbp !== null || p.dbp !== null) {
    if ((p.sbp !== null && p.sbp >= th.sbp.value) || (p.dbp !== null && p.dbp >= th.dbp.value)) {
      findings.push({ severity: 'danger', item: '血圧', value: `${p.sbp||'-'}/${p.dbp||'-'} mmHg`, note: '重症高血圧' });
      types.add(1); types.add(2);
      measures.push('就業制限を検討'); measures.push('速やかな受診勧奨（降圧治療）');
    }
  }

  if (p.hb !== null) {
    if (p.hb <= th.hb_low.value) {
      findings.push({ severity: 'danger', item: 'Hb', value: `${p.hb} g/dL`, note: '重度貧血' });
      types.add(1); measures.push('就業制限を検討'); measures.push('速やかな受診勧奨（貧血の精査）');
    } else if (p.hb >= th.hb_high.value) {
      findings.push({ severity: 'danger', item: 'Hb', value: `${p.hb} g/dL`, note: '多血症' });
      types.add(1); measures.push('受診勧奨（多血症の精査）');
    }
  }

  if (p.ast !== null && p.ast >= th.ast.value) {
    findings.push({ severity: 'danger', item: 'AST', value: `${p.ast} U/L`, note: '高値' });
    types.add(1); measures.push('受診勧奨（肝機能障害の精査）');
  }

  if (p.alt !== null && p.alt >= th.alt.value) {
    findings.push({ severity: 'danger', item: 'ALT', value: `${p.alt} U/L`, note: '高値' });
    types.add(1); measures.push('受診勧奨（肝機能障害の精査）');
  }

  if (p.ldl !== null && p.ldl >= th.ldl.value) {
    findings.push({ severity: 'danger', item: 'LDL-c', value: `${p.ldl} mg/dL`, note: '高LDLコレステロール血症' });
    types.add(3); measures.push('受診勧奨（脂質異常症の治療）');
  }

  if (p.tg !== null && p.tg >= th.tg.value) {
    findings.push({ severity: 'danger', item: 'TG', value: `${p.tg} mg/dL`, note: '著明高値' });
    types.add(3); measures.push('受診勧奨（急性膵炎リスク）');
  }

  if (p.fbg !== null && p.fbg >= th.fbg.value) {
    findings.push({ severity: 'danger', item: '空腹時血糖', value: `${p.fbg} mg/dL`, note: '著明高値' });
    types.add(1); types.add(2); measures.push('就業制限を検討'); measures.push('速やかな受診勧奨（糖尿病の精査・治療）');
  }

  if (p.cre !== null) {
    if (p.cre >= th.cre.value) {
      findings.push({ severity: 'danger', item: '血清Cre', value: `${p.cre} mg/dL`, note: '高値' });
      types.add(1); types.add(3); measures.push('受診勧奨（腎機能障害の精査）');
    }
    const egfr = p.egfr !== null ? p.egfr : calcEGFR(p.cre, p.age, p.sex);
    if (egfr !== null) {
      const ageOver40 = p.age == null || p.age >= 40;
      const egfrTh = ageOver40 ? th.egfr_over40.value : th.egfr_under40.value;
      if (egfr <= egfrTh) {
        findings.push({ severity: 'danger', item: 'eGFR', value: `${egfr} mL/min/1.73m²`, note: `低値（${ageOver40 ? '40歳以上' : '40歳未満'}基準${egfrTh}以下）` });
        types.add(1); types.add(3); measures.push('受診勧奨（腎機能障害の精査）');
      }
    }
  }

  if (th.vision.value !== '' && th.vision.value !== null) {
    const vTh = th.vision.value;
    if ((p.visionR !== null && p.visionR < vTh) || (p.visionL !== null && p.visionL < vTh)) {
      findings.push({ severity: 'danger', item: '視力', value: `右${p.visionR??'-'} 左${p.visionL??'-'}`, note: `矯正視力${vTh}未満` });
      types.add(5); measures.push('受診勧奨（視力低下の精査）');
    }
  }

  const qualLevels = ['-', '+-', '1+', '2+', '3+'];
  if (th.urine_protein.value !== 'off') {
    const thIdx = qualLevels.indexOf(th.urine_protein.value);
    const pIdx = qualLevels.indexOf(p.urineProtein);
    if (pIdx >= 0 && thIdx >= 0 && pIdx >= thIdx) {
      findings.push({ severity: 'danger', item: '尿蛋白', value: `(${p.urineProtein})`, note: '' });
      types.add(3); measures.push('受診勧奨（腎機能の精査）');
    }
  }

  if (th.urine_sugar.value !== 'off') {
    const thIdx = qualLevels.indexOf(th.urine_sugar.value);
    const pIdx = qualLevels.indexOf(p.urineSugar);
    if (pIdx >= 0 && thIdx >= 0 && pIdx >= thIdx) {
      findings.push({ severity: 'danger', item: '尿糖', value: `(${p.urineSugar})`, note: '' });
      types.add(3); measures.push('受診勧奨（糖代謝の精査）');
    }
  }

  if (th.ecg.value !== 'off') {
    let ecgAbn = false;
    if (th.ecg.value === 'not_normal_obs') ecgAbn = p.ecg && p.ecg !== 'normal' && p.ecg !== 'observation';
    else if (th.ecg.value === 'not_normal') ecgAbn = p.ecg && p.ecg !== 'normal';
    if (ecgAbn) {
      const ecgLabel = { arrhythmia: '不整脈', ischemia: '虚血性変化', other: 'その他異常', recheck: '要精検', abnormal: '異常あり', observation: '経過観察' };
      findings.push({ severity: 'danger', item: '心電図', value: ecgLabel[p.ecg] || p.ecg, note: p.ecgNote || '' });
      types.add(2); measures.push('受診勧奨（循環器科での精査）');
    }
  }

  if (th.xray.value !== 'off') {
    let xrayAbn = false;
    if (th.xray.value === 'not_normal_obs') xrayAbn = p.xray && p.xray !== 'normal' && p.xray !== 'observation';
    else if (th.xray.value === 'not_normal') xrayAbn = p.xray && p.xray !== 'normal';
    if (xrayAbn) {
      const xrayLabel = { recheck: '要精検', abnormal: '異常あり', other: 'その他異常', observation: '経過観察' };
      findings.push({ severity: 'danger', item: '胸部X線', value: xrayLabel[p.xray] || p.xray, note: '' });
      measures.push('受診勧奨（胸部X線異常の精査）');
    }
  }

  if (th.hearing.value !== 'off') {
    const mode = th.hearing.value;
    let hearingAbn = false;
    if (mode === '4k_only') hearingAbn = p.hearing4k === 'abnormal';
    else if (mode === '1k_only') hearingAbn = p.hearing1k === 'abnormal';
    else if (mode === 'both') hearingAbn = p.hearing1k === 'abnormal' && p.hearing4k === 'abnormal';
    else if (mode === 'either') hearingAbn = p.hearing1k === 'abnormal' || p.hearing4k === 'abnormal';
    if (hearingAbn) {
      const modeLabel = { '4k_only': '4000Hz', '1k_only': '1000Hz', 'both': '1000Hz・4000Hz', 'either': '1000Hz/4000Hz' };
      findings.push({ severity: 'danger', item: `聴力(${modeLabel[mode]})`, value: '所見あり', note: '' });
      measures.push('受診勧奨（聴力障害の精査）');
    }
  }

  let category = 'normal';
  if (findings.length > 0) category = 'restriction';

  return { person: p, category, findings, types: Array.from(types).sort(), measures: [...new Set(measures)] };
}

// ============================================================
// 一括判定
// ============================================================
window.runAllJudgments = function() {
  if (persons.length === 0) { alert('対象者が追加されていません。'); return; }
  const results = persons.map(judgePerson);
  renderResults(results);
  window.switchTab('results');
};

function renderResults(results) {
  const container = document.getElementById('results-container');
  const abnormal = results.filter(r => r.findings.length > 0);
  const normal = results.filter(r => r.findings.length === 0);

  let html = `<div class="bg-white rounded-lg shadow p-6 mb-6">
    <h2 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2">判定サマリー</h2>
    <div class="grid grid-cols-3 gap-4 text-center">
      <div class="bg-green-50 rounded p-4"><div class="text-3xl font-bold text-green-700">${normal.length}</div><div class="text-sm text-green-600">通常勤務</div></div>
      <div class="bg-orange-50 rounded p-4"><div class="text-3xl font-bold text-orange-700">${abnormal.length}</div><div class="text-sm text-orange-600">要対応（所見あり）</div></div>
      <div class="bg-blue-50 rounded p-4"><div class="text-3xl font-bold text-blue-700">${results.length}</div><div class="text-sm text-blue-600">合計</div></div>
    </div>
  </div>`;

  if (abnormal.length > 0) {
    html += `<section class="bg-white rounded-lg shadow p-6 mb-6"><h2 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2">所見ありの対象者</h2>`;
    for (const r of abnormal) {
      html += renderPersonResult(r);
    }
    html += `</section>`;
  }

  if (normal.length > 0) {
    html += `<section class="bg-white rounded-lg shadow p-6 mb-6"><h2 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2">通常勤務（所見なし）</h2>
      <ul class="list-disc pl-5 text-sm text-gray-600">${normal.map(r => `<li>${r.person.name}（${r.person.age||'?'}歳）</li>`).join('')}</ul></section>`;
  }

  html += `<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 no-print">
    <p class="text-sm text-yellow-800"><strong>注意:</strong> 判定結果は参考情報です。最終的な就業判定は産業医の総合的な判断に基づいて行ってください。</p></div>`;

  container.innerHTML = html;
}

function renderPersonResult(r) {
  const p = r.person;
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  const opinion = `健康診断に基づく就業上の措置に関する医師の意見書

作成日: ${today}

■ 対象者情報
  氏名: ${p.name}
  年齢: ${p.age||'?'}歳  性別: ${p.sex==='male'?'男性':'女性'}

■ 就業区分
  ${r.findings.length > 0 ? '就業制限が必要' : '通常勤務可'}

■ 健康診断における所見
${r.findings.map(f => `  ・${f.item}: ${f.value}${f.note ? `（${f.note}）` : ''}`).join('\n') || '  特記事項なし'}

■ 就業上の措置に関する意見
  ${r.measures.length > 0 ? '以下の措置を講ずることが適当と考える。' : '特になし'}
${r.measures.map(m => `  ・${m}`).join('\n') || '  特になし'}
${r.types.length > 0 ? `\n■ 判定の根拠（就業判定の類型）\n${r.types.map(t => `  ・${TYPE_DESC[t].name}`).join('\n')}` : ''}

■ 備考
  本意見は定期健康診断の結果に基づくものであり、臨床経過や
  治療状況等を踏まえ、最終判断を行うことを推奨する。

                              産業医署名: ___________________`;

  return `<div class="border rounded-lg p-4 mb-4">
    <div class="flex justify-between items-start mb-3">
      <div>
        <span class="font-bold text-gray-800">${p.name}</span>
        <span class="text-sm text-gray-500 ml-2">${p.age||'?'}歳 ${p.sex==='male'?'男':'女'}</span>
      </div>
      <span class="text-xs font-bold px-3 py-1 rounded bg-orange-100 text-orange-800">要対応</span>
    </div>
    <div class="mb-3">${r.findings.map(f =>
      `<div class="text-sm border-l-4 border-red-400 pl-3 py-1 mb-1 bg-red-50 rounded-r"><strong>${f.item}</strong>: ${f.value} ${f.note ? `— ${f.note}` : ''}</div>`
    ).join('')}</div>
    ${r.types.length > 0 ? `<div class="mb-3 text-xs text-blue-700">${r.types.map(t => TYPE_DESC[t].name).join(' / ')}</div>` : ''}
    <details class="mt-2"><summary class="text-sm text-primary cursor-pointer font-bold">意見書ドラフトを表示</summary>
      <div class="mt-2 flex gap-2 no-print"><button onclick="copyText(this)" class="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300">コピー</button></div>
      <pre class="bg-gray-50 border rounded p-4 text-xs mt-2 whitespace-pre-wrap font-mono opinion-text">${opinion}</pre>
    </details>
  </div>`;
}

window.copyText = function(btn) {
  const pre = btn.closest('details').querySelector('.opinion-text');
  navigator.clipboard.writeText(pre.textContent).then(() => {
    btn.textContent = 'コピーしました'; setTimeout(() => btn.textContent = 'コピー', 2000);
  });
};
