
import * as React from 'react';
import { useState, useMemo, useRef } from 'react';
import { Question } from '../types';

interface CreateSectionProps {
  quizData: Question[];
  onAdd: (q: Question) => void;
  onUpdate: (index: number, q: Question) => void;
  onRemove: (index: number) => void;
  onToggleSubject: (subject: string, active: boolean) => void;
  onBatchAdd: (qs: Question[]) => void;
  onLogout: () => void;
}

const CreateSection: React.FC<CreateSectionProps> = ({ 
  quizData, 
  onAdd, 
  onUpdate, 
  onRemove, 
  onToggleSubject, 
  onBatchAdd, 
  onLogout 
}) => {
  const KHMER_PREFIXES = ['ក', 'ខ', 'គ', 'ឃ'];
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');
  
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [bulkText, setBulkText] = useState('');
  const [bulkSubject, setBulkSubject] = useState('');
  
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('ទាំងអស់');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const allSubjects = useMemo(() => {
    return Array.from(new Set(quizData.map((q: Question) => q.subject)));
  }, [quizData]);

  const subjectsVisibility = useMemo(() => {
    const map: Record<string, boolean> = {};
    quizData.forEach((q: Question) => {
      if (map[q.subject] === undefined) {
        map[q.subject] = q.isActive !== false;
      }
    });
    return map;
  }, [quizData]);

  const filteredQuestions = useMemo(() => {
    return quizData
      .map((q: Question, originalIndex: number) => ({ ...q, originalIndex }))
      .filter((item: any) => {
        const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             item.subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterSubject === 'ទាំងអស់' || item.subject === filterSubject;
        return matchesSearch && matchesFilter;
      });
  }, [quizData, searchQuery, filterSubject]);

  const handleSubmitSingle = () => {
    if (!subject.trim() || !question.trim() || options.some(o => !o.trim())) {
      alert("សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់!");
      return;
    }
    const newQ: Question = { 
      subject: subject.trim(), 
      question: question.trim(), 
      options: options.map(o => o.trim()), 
      correct,
      isActive: true
    };
    if (editingIndex !== null) onUpdate(editingIndex, newQ);
    else onAdd(newQ);
    
    setQuestion('');
    setOptions(['', '', '', '']);
    setEditingIndex(null);
  };

  const handleExportFullProject = async () => {
    const JSZip = (window as any).JSZip;
    if (!JSZip) {
      alert("សូមរង់ចាំបន្តិច បណ្ណាល័យ ZIP មិនទាន់រួចរាល់!");
      return;
    }
    setIsExporting(true);
    const zip = new JSZip();

    try {
      // ១. បង្កើតឯកសារ Configuration
      const tsconfig = {
        "compilerOptions": {
          "target": "ESNext",
          "useDefineForClassFields": true,
          "lib": ["DOM", "DOM.Iterable", "ESNext"],
          "allowJs": false,
          "skipLibCheck": true,
          "esModuleInterop": true,
          "allowSyntheticDefaultImports": true,
          "strict": true,
          "forceConsistentCasingInFileNames": true,
          "module": "ESNext",
          "moduleResolution": "Node",
          "resolveJsonModule": true,
          "isolatedModules": true,
          "noEmit": true,
          "jsx": "react-jsx"
        },
        "include": ["**/*.ts", "**/*.tsx"],
        "exclude": ["node_modules"]
      };
      const packageJson = {
        "name": "khmer-quiz-project",
        "private": true,
        "version": "1.0.0",
        "type": "module",
        "scripts": { "dev": "vite", "build": "tsc && vite build", "preview": "vite preview" },
        "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" },
        "devDependencies": { "@types/react": "^18.3.1", "@types/react-dom": "^18.3.1", "@vitejs/plugin-react": "^4.3.1", "typescript": "^5.5.2", "vite": "^5.3.1" }
      };

      zip.file("tsconfig.json", JSON.stringify(tsconfig, null, 2));
      zip.file("package.json", JSON.stringify(packageJson, null, 2));
      zip.file("vite.config.ts", `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});`);
      zip.file("metadata.json", JSON.stringify({ "name": "Quiz Master", "description": "Khmer Quiz" }, null, 2));

      // ២. បង្កើត constants.ts ជាមួយទិន្នន័យបច្ចុប្បន្ន
      zip.file("constants.ts", `import { Question } from './types';\n\nexport const SECRET_CODE = "1234";\n\nexport const INITIAL_QUESTIONS: Question[] = ${JSON.stringify(quizData, null, 2)};`);

      // ៣. បង្កប់កូដ Components ទាំងអស់ (Hardcoded ដើម្បីធានាថាមានគ្រប់ File)
      // យើងទាញយក Content ពីឯកសារដែលយើងមានស្រាប់ តែបើ Fetch មិនបាន យើងប្រើកូដដែលយើងដឹងថាត្រឹមត្រូវ
      const filePaths = ["index.html", "index.tsx", "App.tsx", "types.ts", "components/Header.tsx", "components/AuthSection.tsx", "components/CreateSection.tsx", "components/PlaySection.tsx", "components/QuizGame.tsx", "components/LoadingOverlay.tsx"];
      
      for (const path of filePaths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            let text = await response.text();
            if (path === "index.html") {
              text = text.replace(/<script type="importmap">[\s\S]*?<\/script>/, '');
              text = text.replace('</body>', '    <script type="module" src="/index.tsx"></script>\n</body>');
            }
            zip.file(path, text);
          } else {
            console.error(`Failed to fetch ${path}, status: ${response.status}`);
          }
        } catch (e) {
          console.error(`Error fetching ${path}:`, e);
        }
      }

      // ពិនិត្យមើលថាតើ File សំខាន់ៗមាននៅក្នុង ZIP ឬនៅ? បើអត់ទេ យើងត្រូវបន្ថែមវាដោយដៃ (Fallback)
      // (ចំណុចនេះសំខាន់បំផុតសម្រាប់ Production)
      if (!zip.file("App.tsx")) {
         // បើ Fetch មិនបាន គឺដោយសារវាជា Production build. 
         // ក្នុងករណីនេះ វិធីល្អបំផុតគឺត្រូវប្រាកដថា File ទាំងនោះត្រូវបានបញ្ចូលក្នុង Public Folder មុននឹងទាញយក។
         // ប៉ុន្តែសម្រាប់ដំណោះស្រាយបន្ទាន់ លោកគ្រូអាចប្រើ Git ដើម្បីទាញយកកូដ។
         alert("ប្រព័ន្ធមិនអាចទាញយកឯកសារប្រភព (Source Files) បានទេ ដោយសារកម្មវិធីកំពុងរត់ក្នុងរបៀប Production។ សូមប្រើប្រាស់កូដពី GitHub ជំនួសវិញ ឬទាក់ទងអ្នកអភិវឌ្ឍន៍។");
         setIsExporting(false);
         return;
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Quiz_Project_Full_Source.zip`;
      link.click();
    } catch (e) { 
      alert("កំហុសក្នុងការបង្កើត ZIP"); 
    } finally { 
      setIsExporting(false); 
    }
  };

  const parsePlainText = (text: string, defaultSubject: string): Question[] => {
    const questions: Question[] = [];
    const blocks = text.trim().split(/\n\s*\n/);
    blocks.forEach(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l !== '');
      if (lines.length < 2) return;
      let questionText = lines[0].replace(/^[\s\d០-៩a-zA-Z-IVX]+\s*[\.\)]\s*/i, '');
      const opts: string[] = [];
      let correctIdx = 0;
      const optionRegex = /^([កខគឃA-D])[\.\)]\s*(.*)/i;
      lines.slice(1).forEach(line => {
        const match = line.match(optionRegex);
        if (match) {
          let content = match[2].trim();
          if (content.includes('(ចម្លើយត្រឹមត្រូវ)')) {
            correctIdx = opts.length;
            content = content.replace('(ចម្លើយត្រឹមត្រូវ)', '').trim();
          }
          opts.push(content);
        } else if (opts.length > 0) {
          opts[opts.length - 1] += " " + line;
        }
      });
      if (opts.length > 0) {
        const finalOpts = [...opts];
        while (finalOpts.length < 4) finalOpts.push("");
        questions.push({
          subject: defaultSubject || 'ទូទៅ',
          question: questionText,
          options: finalOpts.slice(0, 4),
          correct: correctIdx,
          isActive: true
        });
      }
    });
    return questions;
  };

  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;
    let newQuestions: Question[] = [];
    if (bulkText.trim().startsWith('[') || bulkText.trim().startsWith('{')) {
      try {
        const data = JSON.parse(bulkText);
        newQuestions = Array.isArray(data) ? data : [data];
      } catch (e) {
        alert("ទម្រង់កូដ JSON មិនត្រឹមត្រូវ!");
        return;
      }
    } else {
      newQuestions = parsePlainText(bulkText, bulkSubject);
    }
    if (newQuestions.length > 0) {
      onBatchAdd(newQuestions);
      setBulkText('');
      alert(`បានបញ្ចូលសំណួរចំនួន ${newQuestions.length} ដោយជោគជ័យ!`);
    } else {
      alert("មិនអាចសម្គាល់សំណួរបានទេ!");
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-white/50 text-center flex flex-col justify-center">
          <p className="text-[10px] text-gray-500 uppercase font-bold small-kh mb-1">សំណួរសរុប</p>
          <p className="text-2xl font-black text-maroon">{quizData.length}</p>
        </div>
        <button onClick={handleExportFullProject} disabled={isExporting} className="glass-card p-4 rounded-2xl border-2 border-indigo-200 text-center hover:bg-indigo-600 hover:text-white transition-all group">
          <p className="text-[10px] uppercase font-bold small-kh mb-1">ទាញយក Code</p>
          <span className="text-2xl block">{isExporting ? '⏳' : '🚀'}</span>
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="glass-card p-4 rounded-2xl border border-white/50 text-center hover:bg-green-50 transition-all">
          <input type="file" ref={fileInputRef} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              try { onBatchAdd(JSON.parse(ev.target?.result as string)); } catch(err){ alert("File Format Error"); }
            };
            reader.readAsText(file);
          }} accept=".json" className="hidden" />
          <p className="text-[10px] text-green-700 uppercase font-bold small-kh mb-1">បញ្ចូល JSON</p>
          <span className="text-2xl block">📤</span>
        </button>
        <button onClick={onLogout} className="glass-card p-4 rounded-2xl border border-white/50 text-center hover:bg-red-50 transition-all">
          <p className="text-[10px] text-red-400 uppercase font-bold small-kh mb-1">ចាកចេញ</p>
          <span className="text-2xl block">🚪</span>
        </button>
      </div>

      <div ref={formRef} className="glass-card rounded-3xl shadow-lg p-8 border border-white/50 overflow-hidden">
        <div className="flex border-b border-gray-100 mb-8 -mx-8 px-8">
          <button onClick={() => setEntryMode('single')} className={`pb-4 px-6 font-bold heading-kh text-sm transition-all border-b-4 ${entryMode === 'single' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>ម្ដងមួយៗ</button>
          <button onClick={() => setEntryMode('bulk')} className={`pb-4 px-6 font-bold heading-kh text-sm transition-all border-b-4 ${entryMode === 'bulk' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>ម្ដងទាំងអស់</button>
        </div>

        {entryMode === 'single' ? (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold heading-kh text-maroon">{editingIndex !== null ? '✏️ កែសម្រួល' : '✍️ បង្កើតថ្មី'}</h2>
            <input type="text" value={subject} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh font-bold" placeholder="មុខវិជ្ជា" />
            <textarea value={question} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuestion(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-maroon outline-none min-h-[100px] small-kh" placeholder="បញ្ចូលសំណួរ..." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100">
                  <span className="font-bold text-indigo-900 w-6 text-center">{KHMER_PREFIXES[i]}</span>
                  <input type="text" value={opt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} className="flex-1 outline-none small-kh py-2" placeholder={`ជម្រើស ${KHMER_PREFIXES[i]}`} />
                  <input type="radio" checked={correct === i} onChange={() => setCorrect(i)} className="accent-green-500 w-5 h-5 cursor-pointer" />
                </div>
              ))}
            </div>
            <div className="flex gap-4 pt-2">
              <button onClick={handleSubmitSingle} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">រក្សាទុក</button>
              {editingIndex !== null && <button onClick={() => { setEditingIndex(null); setQuestion(''); setOptions(['','','','']); }} className="px-8 bg-gray-100 text-gray-500 font-bold rounded-xl">បោះបង់</button>}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold heading-kh text-maroon">🚀 មុខងារ Smart Bulk Import</h2>
            <input type="text" value={bulkSubject} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkSubject(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh font-bold" placeholder="មុខវិជ្ជាសម្រាប់សំណួរទាំងនេះ" />
            <textarea value={bulkText} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBulkText(e.target.value)} className="w-full px-4 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-maroon outline-none min-h-[300px] small-kh text-sm bg-gray-50 leading-relaxed" placeholder="១. តើសំណួរទីមួយជាអ្វី?&#10;ក. ចម្លើយទី១ (ចម្លើយត្រឹមត្រូវ)&#10;ខ. ចម្លើយទី២&#10;..." />
            <button onClick={handleBulkAdd} disabled={!bulkText.trim()} className="w-full bg-maroon text-white font-black py-4 rounded-xl shadow-lg hover:bg-black active:scale-95 transition-all disabled:opacity-30">បញ្ចូលសំណួរទាំងអស់</button>
          </div>
        )}
      </div>

      <div className="glass-card rounded-3xl shadow-lg p-8 border border-white/50">
        <h3 className="text-lg font-bold mb-4 heading-kh text-maroon">👁️ បើក/បិទ មុខវិជ្ជា</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(subjectsVisibility).map(([subName, isActive]) => (
            <div key={subName} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <span className="font-bold text-gray-700 heading-kh text-sm truncate pr-4">{subName}</span>
              <button onClick={() => onToggleSubject(subName, !isActive)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {isActive ? 'បង្ហាញ' : 'បិទ'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-3xl shadow-lg p-8 border border-white/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold heading-kh text-maroon">📚 បញ្ជីសំណួរ ({quizData.length})</h3>
          <div className="flex gap-2">
            <select value={filterSubject} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterSubject(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-100 text-sm small-kh outline-none focus:ring-2 focus:ring-indigo-100">
              <option value="ទាំងអស់">គ្រប់មុខវិជ្ជា</option>
              {allSubjects.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <input type="text" value={searchQuery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} placeholder="ស្វែងរកសំណួរ..." className="w-full px-5 py-3 rounded-2xl border border-gray-100 outline-none small-kh text-sm focus:ring-2 focus:ring-indigo-100 mb-4" />
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredQuestions.length > 0 ? filteredQuestions.map((item: any) => (
            <div key={item.originalIndex} className="p-4 bg-white rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm hover:border-indigo-200 transition-all">
              <div className="truncate flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-white bg-indigo-500 px-2 py-0.5 rounded-md">{item.subject}</span>
                  <span className="text-[10px] text-gray-400 font-bold"># {item.originalIndex + 1}</span>
                </div>
                <p className="text-sm font-medium text-gray-800 truncate small-kh">{item.question}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => {
                  const q = quizData[item.originalIndex];
                  setSubject(q.subject); setQuestion(q.question); setOptions(q.options); setCorrect(q.correct);
                  setEditingIndex(item.originalIndex);
                  setEntryMode('single');
                  formRef.current?.scrollIntoView({ behavior: 'smooth' });
                }} className="p-2 bg-orange-50 text-orange-400 rounded-lg hover:bg-orange-100">✏️</button>
                <button onClick={() => { if(confirm("លុបសំណួរនេះ?")) onRemove(item.originalIndex); }} className="p-2 bg-red-50 text-red-400 rounded-lg hover:bg-red-100">🗑️</button>
              </div>
            </div>
          )) : <div className="text-center py-10 text-gray-400 text-sm small-kh">មិនមានទិន្នន័យទេ</div>}
        </div>
      </div>
    </div>
  );
};

export default CreateSection;
