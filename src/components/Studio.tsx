'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Check, ChevronLeft, ChevronRight, Download,
  Image as ImageIcon, Languages, LayoutGrid, List, LoaderCircle, Plus, Redo2,
  Search, Settings2, Trash2, Undo2, Upload, X, ZoomIn, ZoomOut
} from 'lucide-react';
import { paginate, parseVocabulary } from '@/lib/parser';
import { exportPoster, type ExportFormat, type ExportPageScope } from '@/lib/poster-export';
import type { SelectedImage, VocabularyItem, VocabularyProject } from '@/lib/types';

const STORAGE_KEY = 'vocabulary-poster-studio:last-project';
const demoWords = `cat\ndog\nbook\nchair\nwater\nbanana\ncar\nshoe\nclock\nphone\nball\nflower\nfish\nbird\nkey\nbag\nshirt\ntable\npen\nlight | lamp\nbank | financial institution\nriver\ntrain\nwindow`;

function starterProject(): VocabularyProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), version: 1, name: 'SEA ACADEMY', createdAt: now, updatedAt: now,
    uiLanguage: 'en', posterLanguage: 'en', visualStyle: 'clean-object', keepVisualConsistency: true,
    outputProfile: 'exact-template',
    template: { level: 'A1', titleTop: 'Everyday', titleMain: 'Vocabulary', category: 'Daily Life', footerText: 'streetenglish.net', accentColor: '#18A674' },
    items: parseVocabulary(demoWords)
  };
}

function initials(word: string) { return word.trim().slice(0, 2).toUpperCase(); }

export default function Studio() {
  const [project, setProject] = useState<VocabularyProject | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'pages' | 'words'>('pages');
  const [zoom, setZoom] = useState(62);
  const [saved, setSaved] = useState(true);
  const [starterOpen, setStarterOpen] = useState(false);
  const [starterInput, setStarterInput] = useState('');
  const [imagePicker, setImagePicker] = useState<VocabularyItem | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerResults, setPickerResults] = useState<SelectedImage[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [exportScale, setExportScale] = useState<1 | 2 | 3>(2);
  const [exportScope, setExportScope] = useState<ExportPageScope>('current');
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');
  const searchQueue = useRef(new Set<string>());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return setProject(starterProject());
    const restored = JSON.parse(stored) as VocabularyProject;
    const updated: VocabularyProject = {
      ...restored,
      name: (restored.name === 'Everyday Vocabulary' || !restored.name) ? 'SEA ACADEMY' : restored.name,
      template: {
        ...restored.template,
        footerText: (restored.template.footerText === 'vocabulary.studio' || !restored.template.footerText)
          ? 'streetenglish.net'
          : restored.template.footerText,
      }
    };
    setProject(updated);
  }, []);

  useEffect(() => {
    if (!project) return;
    setSaved(false);
    const t = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...project, updatedAt: new Date().toISOString() }));
      setSaved(true);
    }, 450);
    return () => clearTimeout(t);
  }, [project]);

  const pages = useMemo(() => paginate(project?.items || [], 21), [project?.items]);
  const selected = project?.items.find((i) => i.id === selectedId) || null;

  useEffect(() => {
    if (!project) return;
    const pending = project.items.filter((i) => i.status === 'queued' && !searchQueue.current.has(i.id)).slice(0, 4);
    pending.forEach((item) => {
      searchQueue.current.add(item.id);
      updateItem(item.id, { status: 'searching' });
      fetch('/api/images/resolve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ word: item.word, sense: item.searchHint }) })
        .then((r) => r.json())
        .then((data) => updateItem(item.id, { status: data.status || 'missing_image', image: data.selected || undefined }))
        .catch(() => updateItem(item.id, { status: 'search_failed' }))
        .finally(() => searchQueue.current.delete(item.id));
    });
  }, [project?.items.map((i) => i.status).join('|')]);

  function updateProject(patch: Partial<VocabularyProject>) { setProject((p) => p ? { ...p, ...patch } : p); }
  function updateItem(id: string, patch: Partial<VocabularyItem>) {
    setProject((p) => p ? { ...p, items: p.items.map((i) => i.id === id ? { ...i, ...patch } : i) } : p);
  }
  function deleteItem(id: string) {
    setProject((p) => p ? { ...p, items: p.items.filter((i) => i.id !== id).map((i, idx) => ({ ...i, order: idx + 1 })) } : p);
    setSelectedId(null);
  }

  function generateFromInput() {
    const items = parseVocabulary(starterInput);
    if (!items.length) return;
    setProject((p) => p ? { ...p, items } : p);
    setActivePage(0); setSelectedId(null); setStarterOpen(false); setStarterInput('');
  }

  async function openPicker(item: VocabularyItem, customQuery?: string) {
    const q = customQuery !== undefined ? customQuery : [item.word, item.searchHint].filter(Boolean).join(' ');
    setImagePicker(item);
    setPickerQuery(q);
    setPickerResults([]);
    setPickerLoading(true);
    try {
      const r = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ word: q, sense: '' })
      });
      const data = await r.json();
      setPickerResults(data.results || []);
    } finally {
      setPickerLoading(false);
    }
  }

  function selectImage(image: SelectedImage) {
    if (!imagePicker) return;
    updateItem(imagePicker.id, { image, status: 'ready', manualImageLock: true });
    setImagePicker(null);
  }

  function handleUpload(file: File | undefined) {
    if (!file || !imagePicker) return;
    const url = URL.createObjectURL(file);
    selectImage({ id: crypto.randomUUID(), provider: 'upload', previewUrl: url, fullUrl: url, width: 1200, height: 1200 });
  }

  async function handleExport() {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-export-page]'));
    setExporting(true);
    try {
      await exportPoster(nodes, { format: exportFormat, scale: exportScale, scope: exportScope, currentPage: activePage, projectName: project?.name || 'vocabulary-poster' });
      setToast(`${exportFormat.toUpperCase()} export ready.`);
      setExportOpen(false);
    } catch (error) {
      console.error(error);
      setToast('Export failed. Check that all poster images can be loaded, then try again.');
    } finally {
      setExporting(false);
    }
  }

  if (!project) return <div className="loading-screen"><LoaderCircle className="spin" /> Loading studio…</div>;
  const rtl = project.uiLanguage === 'ar';
  const current = pages[Math.min(activePage, pages.length - 1)] || [];

  return (
    <div className="app" dir={rtl ? 'rtl' : 'ltr'}>
      <header className="topbar">
        <div className="top-left">
          <div className="brandmark">
            <img src="/poster-assets/brand-logo.png" alt="SEA ACADEMY" className="brand-logo-img" />
          </div>
          <input className="project-name" value={project.name} onChange={(e) => updateProject({ name: e.target.value })} />
          <span className="save-state"><Check size={14} /> {saved ? (rtl ? 'محفوظ محليًا' : 'Saved locally') : (rtl ? 'جارٍ الحفظ…' : 'Saving…')}</span>
        </div>
        <div className="top-center">
          <button className="icon-btn" aria-label="Undo"><Undo2 size={17} /></button>
          <button className="icon-btn" aria-label="Redo"><Redo2 size={17} /></button>
          <span className="divider" />
          <button className="icon-btn" onClick={() => setZoom((z) => Math.max(35, z - 5))}><ZoomOut size={17} /></button>
          <span className="zoom-label">{zoom}%</span>
          <button className="icon-btn" onClick={() => setZoom((z) => Math.min(100, z + 5))}><ZoomIn size={17} /></button>
          <button className="fit-btn" onClick={() => setZoom(62)}>{rtl ? 'ملاءمة' : 'Fit page'}</button>
        </div>
        <div className="top-right">
          <button className="lang-btn" onClick={() => updateProject({ uiLanguage: rtl ? 'en' : 'ar' })}><Languages size={16} /> {rtl ? 'EN' : 'AR'}</button>
          <button className="icon-btn"><Settings2 size={17} /></button>
          <button className="primary-btn" onClick={() => setExportOpen(true)}><Download size={17} /> {rtl ? 'تصدير' : 'Export'}</button>
        </div>
      </header>

      <aside className="leftbar">
        <div className="tabs">
          <button className={leftTab === 'pages' ? 'tab active' : 'tab'} onClick={() => setLeftTab('pages')}><LayoutGrid size={16} /> {rtl ? 'الصفحات' : 'Pages'}</button>
          <button className={leftTab === 'words' ? 'tab active' : 'tab'} onClick={() => setLeftTab('words')}><List size={16} /> {rtl ? 'الكلمات' : 'Words'}</button>
        </div>
        <div className="left-content">
          {leftTab === 'pages' ? pages.map((page, idx) => (
            <button className={idx === activePage ? 'page-row active' : 'page-row'} key={idx} onClick={() => setActivePage(idx)}>
              <div className="thumb-mini"><div className="mini-green" />{Array.from({ length: Math.min(21, page.length) }).map((_, i) => <span key={i} />)}</div>
              <div><strong>{rtl ? 'صفحة' : 'Page'} {idx + 1}</strong><small>{idx * 21 + 1}–{idx * 21 + page.length}</small></div>
            </button>
          )) : project.items.map((item) => (
            <button key={item.id} className={item.id === selectedId ? 'word-row active' : 'word-row'} onClick={() => { setSelectedId(item.id); setActivePage(Math.floor((item.order - 1) / 21)); }}>
              <span className="drag">⋮⋮</span><span className="num">{item.order}</span>
              <span className="tiny-img">{item.image ? <img src={item.image.previewUrl} alt="" /> : initials(item.word)}</span>
              <span className="word-name">{item.word}</span>
              <Status status={item.status} />
            </button>
          ))}
        </div>
        <button className="new-list" onClick={() => setStarterOpen(true)}><Plus size={16} /> {rtl ? 'قائمة كلمات جديدة' : 'New word list'}</button>
      </aside>

      <main className="workspace">
        <div className="canvas-toolbar">
          <span>{rtl ? 'وضع الإخراج:' : 'Output profile:'}</span>
          <button className={project.outputProfile === 'exact-template' ? 'profile active' : 'profile'} onClick={() => updateProject({ outputProfile: 'exact-template' })}>Exact Template</button>
          <button className={project.outputProfile === 'a4-print' ? 'profile active' : 'profile'} onClick={() => updateProject({ outputProfile: 'a4-print' })}>True A4</button>
        </div>
        <div className="canvas-scroll">
          <div className="poster-scale" style={{ transform: `scale(${zoom / 100})` }}>
            <PosterPage project={project} page={current} pageIndex={activePage} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} onImageClick={(i) => openPicker(i)} />
          </div>
        </div>
        <div className="page-nav">
          <button disabled={activePage === 0} onClick={() => setActivePage((p) => p - 1)}><ChevronLeft size={16} /></button>
          <span>{activePage + 1} / {pages.length}</span>
          <button disabled={activePage >= pages.length - 1} onClick={() => setActivePage((p) => p + 1)}><ChevronRight size={16} /></button>
        </div>
      </main>

      <aside className="inspector">
        {selected ? (
          <>
            <div className="inspector-head"><div><span className="eyebrow">{rtl ? 'بطاقة مفردات' : 'Vocabulary card'}</span><h3>{selected.word}</h3></div><button className="icon-btn" onClick={() => setSelectedId(null)}><X size={16}/></button></div>
            <label>{rtl ? 'الكلمة' : 'Word'}<input value={selected.word} onChange={(e) => updateItem(selected.id, { word: e.target.value, displayWord: e.target.value })} /></label>
            <label>{rtl ? 'معنى / تلميح البحث' : 'Meaning / search hint'}<input value={selected.searchHint || ''} onChange={(e) => updateItem(selected.id, { searchHint: e.target.value })} placeholder="e.g. financial institution" /></label>
            <div className="field-block"><span>{rtl ? 'الصورة' : 'Selected image'}</span>
              <div className="inspector-image" onClick={() => openPicker(selected)}>{selected.image ? <img src={selected.image.previewUrl} alt={selected.word} /> : <ImageIcon size={30}/>}</div>
              <button className="secondary-btn wide" onClick={() => openPicker(selected)}><Search size={16}/> {rtl ? 'استبدال الصورة' : 'Replace image'}</button>
            </div>
            <div className="meta-box"><div><span>Status</span><strong>{selected.status.replaceAll('_', ' ')}</strong></div><div><span>Source</span><strong>{selected.image?.provider || '—'}</strong></div><div><span>Manual lock</span><strong>{selected.manualImageLock ? 'On' : 'Off'}</strong></div></div>
            <button className="danger-btn" onClick={() => deleteItem(selected.id)}><Trash2 size={16}/> {rtl ? 'حذف العنصر' : 'Remove item'}</button>
          </>
        ) : (
          <>
            <span className="eyebrow">{rtl ? 'إعدادات المشروع' : 'Project settings'}</span><h3>{rtl ? 'القالب والبحث' : 'Template & search'}</h3>
            <label>Level<input value={project.template.level} onChange={(e) => updateProject({ template: { ...project.template, level: e.target.value } })} /></label>
            <label>{rtl ? 'العنوان العلوي' : 'Title top'}<input value={project.template.titleTop} onChange={(e) => updateProject({ template: { ...project.template, titleTop: e.target.value } })} /></label>
            <label>{rtl ? 'العنوان الرئيسي' : 'Main title'}<input value={project.template.titleMain} onChange={(e) => updateProject({ template: { ...project.template, titleMain: e.target.value } })} /></label>
            <label>{rtl ? 'الفئة' : 'Category'}<input value={project.template.category} onChange={(e) => updateProject({ template: { ...project.template, category: e.target.value } })} /></label>
            <label>{rtl ? 'موقع التذييل' : 'Footer website'}<input value={project.template.footerText} onChange={(e) => updateProject({ template: { ...project.template, footerText: e.target.value } })} /></label>
            <label>{rtl ? 'النمط البصري' : 'Visual style'}<select value={project.visualStyle} onChange={(e) => updateProject({ visualStyle: e.target.value as VocabularyProject['visualStyle'] })}><option value="clean-object">Clean Object</option><option value="photo">Photography</option><option value="illustration">Illustration</option><option value="mixed">Mixed</option></select></label>
            <label className="switch-row"><span><strong>{rtl ? 'اتساق الصور' : 'Keep images consistent'}</strong><small>{rtl ? 'يفضل نتائج ذات أسلوب بصري متقارب.' : 'Prefer a coherent visual family.'}</small></span><input type="checkbox" checked={project.keepVisualConsistency} onChange={(e) => updateProject({ keepVisualConsistency: e.target.checked })}/></label>
            <label>{rtl ? 'اللون الأساسي' : 'Accent color'}<input type="color" value={project.template.accentColor} onChange={(e) => updateProject({ template: { ...project.template, accentColor: e.target.value } })} /></label>
          </>
        )}
      </aside>

      {starterOpen && <Modal onClose={() => setStarterOpen(false)}>
        <div className="modal-head"><div><span className="eyebrow">Bulk input</span><h2>{rtl ? 'أنشئ ملصقات المفردات' : 'Generate vocabulary posters'}</h2></div><button className="icon-btn" onClick={() => setStarterOpen(false)}><X size={18}/></button></div>
        <p className="muted">One word per line, comma-separated, or <code>word | meaning</code>.</p>
        <textarea className="bulk-input" value={starterInput} onChange={(e) => setStarterInput(e.target.value)} placeholder={'cat\nbank | financial institution\nbat | animal'} autoFocus />
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setStarterOpen(false)}>Cancel</button><button className="primary-btn" onClick={generateFromInput}>Generate posters</button></div>
      </Modal>}

      {imagePicker && <Modal wide onClose={() => setImagePicker(null)}>
        <div className="modal-head"><div><span className="eyebrow">Image picker</span><h2>{imagePicker.word}</h2></div><button className="icon-btn" onClick={() => setImagePicker(null)}><X size={18}/></button></div>
        <div className="searchbar">
          <Search size={17}/>
          <input
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') openPicker(imagePicker, pickerQuery); }}
            placeholder="Search images..."
          />
          <button className="secondary-btn" onClick={() => openPicker(imagePicker, pickerQuery)}>Search</button>
        </div>
        <div className="picker-tools"><span>Unsplash (Default) · Pixabay · Openverse · Google</span><label className="upload-btn"><Upload size={15}/> Upload image<input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0])}/></label></div>
        {pickerLoading ? <div className="result-grid">{Array.from({length: 12}).map((_, i) => <div className="result-skeleton" key={i}/>)}</div> : pickerResults.length ? <div className="result-grid">{pickerResults.map((img) => <button key={img.id} className="result-card" onDoubleClick={() => selectImage(img)} onClick={() => selectImage(img)}><img src={img.previewUrl} alt=""/><div><strong>{img.width || '?'} × {img.height || '?'}</strong><span>{img.provider}</span></div></button>)}</div> : <div className="empty-results"><ImageIcon size={38}/><strong>No strong image found</strong><span>Try a clearer meaning or upload your own image.</span></div>}
      </Modal>}

      {exportOpen && <Modal onClose={() => setExportOpen(false)}>
        <div className="modal-head"><div><span className="eyebrow">Export</span><h2>{rtl ? 'تصدير الملصقات' : 'Export posters'}</h2></div><button className="icon-btn" onClick={() => setExportOpen(false)}><X size={18}/></button></div>
        <div className="preflight"><Check size={20}/><div><strong>Ready to export</strong><span>{project.items.length} words · {pages.length} pages · {project.items.filter(i => i.status === 'ready').length} ready</span></div></div>
        <div className="export-options">
          <fieldset><legend>Format</legend><div className="choice-row">{(['pdf', 'png', 'jpeg', 'svg'] as ExportFormat[]).map((format) => <label className={exportFormat === format ? 'choice active' : 'choice'} key={format}><input type="radio" name="format" value={format} checked={exportFormat === format} onChange={() => setExportFormat(format)}/>{format.toUpperCase()}</label>)}</div></fieldset>
          {exportFormat !== 'pdf' && exportFormat !== 'svg' && <fieldset><legend>Resolution</legend><div className="choice-row">{([1, 2, 3] as const).map((scale) => <label className={exportScale === scale ? 'choice active' : 'choice'} key={scale}><input type="radio" name="scale" checked={exportScale === scale} onChange={() => setExportScale(scale)}/>{scale}× <small>{900 * scale}×{1450 * scale}</small></label>)}</div></fieldset>}
          <fieldset><legend>Pages</legend><div className="choice-row"><label className={exportScope === 'current' ? 'choice active' : 'choice'}><input type="radio" name="pages" checked={exportScope === 'current'} onChange={() => setExportScope('current')}/>Current page</label><label className={exportScope === 'all' ? 'choice active' : 'choice'}><input type="radio" name="pages" checked={exportScope === 'all'} onChange={() => setExportScope('all')}/>All pages</label></div></fieldset>
        </div>
        <p className="note">PNG/JPEG use the canonical 900×1450 canvas. Multi-page raster and SVG exports download as a ZIP; PDF downloads as one document.</p>
        <div className="modal-actions"><button className="secondary-btn" disabled={exporting} onClick={() => setExportOpen(false)}>Cancel</button><button className="primary-btn" disabled={exporting} onClick={handleExport}>{exporting ? <LoaderCircle className="spin" size={16}/> : <Download size={16}/>} {exporting ? 'Exporting…' : 'Export'}</button></div>
      </Modal>}

      {exportOpen && <div className="export-stage" aria-hidden="true">{pages.map((page, pageIndex) => <PosterPage key={pageIndex} project={project} page={page} pageIndex={pageIndex} selectedId={null} onSelect={() => {}} onImageClick={() => {}} exportMode />)}</div>}

      {toast && <div className="toast" onAnimationEnd={() => setTimeout(() => setToast(''), 2600)}>{toast}</div>}
    </div>
  );
}

function Status({ status }: { status: VocabularyItem['status'] }) {
  if (status === 'ready') return <Check className="status ready" size={15}/>;
  if (status === 'searching' || status === 'queued') return <LoaderCircle className="status spin" size={15}/>;
  if (status === 'needs_review' || status === 'low_resolution') return <AlertTriangle className="status warn" size={15}/>;
  return <AlertTriangle className="status bad" size={15}/>;
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className={wide ? 'modal wide' : 'modal'} onMouseDown={(e) => e.stopPropagation()}>{children}</div></div>;
}

function PosterPage({ project, page, pageIndex, selectedId, onSelect, onImageClick, exportMode = false }: { project: VocabularyProject; page: VocabularyItem[]; pageIndex: number; selectedId: string | null; onSelect: (id: string) => void; onImageClick: (item: VocabularyItem) => void; exportMode?: boolean }) {
  return <section id={exportMode ? undefined : 'poster-page'} data-export-page={exportMode ? '' : undefined} className="poster-page" style={{ '--accent': project.template.accentColor } as React.CSSProperties} dir={project.posterLanguage === 'ar' ? 'rtl' : 'ltr'}>
    <img className="poster-background" src="/poster-assets/background-waves.svg" alt=""/>
    <img className="poster-corner" src="/poster-assets/header-curve.svg" alt=""/>
    <header className="poster-header">
      <div className="level">{project.template.level}</div>
      <div className="title-top">{project.template.titleTop}</div>
      <div className="title-main">{project.template.titleMain}</div>
      <div className="category" data-long={project.template.category.length > 15 ? '' : undefined}>{project.template.category.toUpperCase()}</div>
      <img className="poster-logo" src="/poster-assets/brand-logo.png" alt="SEA ACADEMY"/>
    </header>
    <div className="poster-grid">{Array.from({ length: 21 }).map((_, idx) => {
      const item = page[idx]; const global = pageIndex * 21 + idx + 1;
      return item ? <button key={item.id} className={item.id === selectedId ? 'vocab-card selected' : 'vocab-card'} onClick={() => onSelect(item.id)}>
        <span className="card-number">{global}</span>
        <span className="card-image" onDoubleClick={(e) => { e.stopPropagation(); onImageClick(item); }}>{item.image ? <img src={exportMode ? (item.image.fullUrl || item.image.previewUrl) : item.image.previewUrl} alt={item.word} onError={exportMode && item.image.fullUrl && item.image.fullUrl !== item.image.previewUrl ? (event) => { event.currentTarget.onerror = null; event.currentTarget.src = item.image!.previewUrl; } : undefined}/> : item.status === 'searching' && !exportMode ? <LoaderCircle className="spin" size={28}/> : <span className="placeholder-initials">{initials(item.word)}</span>}</span>
        <span className="card-word">{item.displayWord}</span>
        {!exportMode && item.status !== 'ready' && item.status !== 'searching' && item.status !== 'queued' && <AlertTriangle size={15} className="card-warning"/>}
      </button> : <div className="vocab-card ghost" key={`ghost-${idx}`} />
    })}</div>
    <footer className="poster-footer"><span className="footer-website">{project.template.footerText}</span><img className="footer-line" src="/poster-assets/footer-line.svg" alt=""/><strong>{pageIndex + 1}</strong></footer>
  </section>;
}
