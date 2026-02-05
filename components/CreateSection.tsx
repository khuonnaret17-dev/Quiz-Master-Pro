
import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Question, TelegramConfig, Feedback } from '../types';
import { DEFAULT_TG_BOT_TOKEN, TG_CHANNELS, ADMIN_CONTACTS } from '../constants';
import html2canvas from 'html2canvas';
import { validateBot, sendQuizPoll, sendTestMessage, sendQuestionImage } from '../services/telegramService';

declare var html2pdf: any;
declare var JSZip: any;

interface CreateSectionProps {
  quizData: Question[];
  feedbackList?: Feedback[];
  onDeleteFeedback?: (id: string) => void;
  onAdd: (q: Question) => void;
  onUpdate: (index: number, q: Question) => void;
  onRemove: (index: number) => void;
  onToggleSubject: (subject: string, type: 'mcq' | 'short', active: boolean) => void;
  onUpdateSubject: (subject: string, type: 'mcq' | 'short', newName: string) => void;
  onRemoveSubject: (subject: string, type: 'mcq' | 'short') => void;
  onReorderSubject: (subject: string, type: 'mcq' | 'short', direction: 'up' | 'down') => void;
  onBatchAdd: (qs: Question[]) => void;
  onLogout: () => void;
}

interface PdfSettings { showAnswerKey: boolean; shuffleQuestions: boolean; schoolName: string; examDate: string; }
interface ImageSettings { style: 'modern' | 'classic' | 'dark' | 'clean'; showSchoolName: boolean; schoolName: string; showWatermark: boolean; }

const SubjectCard: React.FC<{
  sub: { name: string, isActive: boolean, count: number, type: 'mcq' | 'short' };
  isFirst: boolean;
  isLast: boolean;
  onToggleSubject: (subject: string, type: 'mcq' | 'short', active: boolean) => void;
  onEditSubject: (subject: string, type: 'mcq' | 'short') => void;
  onRemoveSubject: (subject: string, type: 'mcq' | 'short') => void;
  onReorderSubject: (subject: string, type: 'mcq' | 'short', direction: 'up' | 'down') => void;
  onOpenPdfSettings: (name: string, type: 'mcq' | 'short') => void;
  onOpenImageSettings: (name: string, type: 'mcq' | 'short') => void;
  onViewQuestions: (name: string, type: 'mcq' | 'short') => void;
}> = ({ sub, isFirst, isLast, onToggleSubject, onEditSubject, onRemoveSubject, onReorderSubject, onOpenPdfSettings, onOpenImageSettings, onViewQuestions }) => (
  <div className={`p-6 rounded-[2.5rem] border transition-all flex flex-col justify-between ${sub.isActive ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-100 border-gray-200 grayscale opacity-60'}`}>
    <div>
      <div className="flex justify-between items-start mb-4">
        <div className="truncate pr-2 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-black heading-kh text-maroon truncate max-w-[150px] cursor-pointer hover:underline" onClick={() => onViewQuestions(sub.name, sub.type)}>{sub.name}</h3>
            <button onClick={() => onEditSubject(sub.name, sub.type)} className="text-xs p-1.5 bg-maroon/5 text-maroon rounded-lg hover:bg-maroon hover:text-white transition-all shadow-sm">✏️</button>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[9px] font-black bg-gray-50 px-3 py-1 rounded-full text-gray-400">{sub.count} សំណួរ</span>
            <div className="flex gap-1">
              <button onClick={() => onOpenPdfSettings(sub.name, sub.type)} className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-600 hover:text-white transition-all shadow-sm">📄 PDF</button>
              <button onClick={() => onOpenImageSettings(sub.name, sub.type)} className="text-[9px] font-black bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full hover:bg-orange-600 hover:text-white transition-all shadow-sm">🖼️ ZIP</button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button disabled={isFirst} onClick={() => onReorderSubject(sub.name, sub.type, 'up')} className={`w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 transition-all ${isFirst ? 'opacity-20 cursor-not-allowed' : 'bg-white hover:bg-maroon hover:text-white shadow-sm'}`}>🔼</button>
          <button disabled={isLast} onClick={() => onReorderSubject(sub.name, sub.type, 'down')} className={`w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 transition-all ${isLast ? 'opacity-20 cursor-not-allowed' : 'bg-white hover:bg-maroon hover:text-white shadow-sm'}`}>🔽</button>
        </div>
      </div>
    </div>
    <div className="flex flex-col gap-2 mt-4">
      <button onClick={() => onViewQuestions(sub.name, sub.type)} className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2">👁️ មើលសំណួរ & ផ្ញើចេញ</button>
      <div className="flex gap-2">
        <button onClick={() => onToggleSubject(sub.name, sub.type, !sub.isActive)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${sub.isActive ? 'bg-maroon/5 text-maroon hover:bg-maroon hover:text-white' : 'bg-green-500 text-white hover:brightness-110'}`}>{sub.isActive ? '❌ បិទ' : '✅ បើក'}</button>
        <button onClick={() => onRemoveSubject(sub.name, sub.type)} className="px-4 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
      </div>
    </div>
  </div>
);

const CreateSection: React.FC<CreateSectionProps> = ({ 
  quizData, feedbackList = [], onDeleteFeedback, onAdd, onUpdate, onRemove, onToggleSubject, onUpdateSubject, onRemoveSubject, onReorderSubject, onBatchAdd
}) => {
  const KHMER_PREFIXES = ['ក', 'ខ', 'គ', 'ឃ'];
  const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  const [entryMode, setEntryMode] = useState<'single' | 'bulk' | 'subjects' | 'feedback'>('single');
  const [qType, setQType] = useState<'mcq' | 'short'>('mcq');
  const [bulkType, setBulkType] = useState<'mcq' | 'short'>('mcq');
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [shortAnswer, setShortAnswer] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });
  const [viewingSubjectQuestions, setViewingSubjectQuestions] = useState<{name: string, type: 'mcq' | 'short'} | null>(null);
  const [tgConfig, setTgConfig] = useState<TelegramConfig>({ botToken: DEFAULT_TG_BOT_TOKEN, chatId: TG_CHANNELS[0].value });
  const [isTestingTg, setIsTestingTg] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<{ name: string, type: 'mcq' | 'short' } | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');

  const toKhmerNumeral = (n: number) => n.toString().split('').map(digit => KHMER_DIGITS[parseInt(digit)] || digit).join('');

  const groupedSubjects = useMemo(() => {
    const getOrderedSubjects = (type: 'mcq' | 'short') => {
      const typeQuestions = quizData.filter(q => q.type === type);
      const subjects: any[] = [];
      const seen = new Set<string>();
      typeQuestions.forEach(q => {
        if (!seen.has(q.subject)) {
          seen.add(q.subject);
          const related = typeQuestions.filter(rq => rq.subject === q.subject);
          subjects.push({ name: q.subject, isActive: related.every(rq => rq.isActive !== false), count: related.length, type });
        }
      });
      return subjects;
    };
    return { mcq: getOrderedSubjects('mcq'), short: getOrderedSubjects('short') };
  }, [quizData]);

  const filteredQuestions = useMemo(() => {
    return quizData
      .map((q, originalIndex) => ({ ...q, originalIndex }))
      .filter(item => {
        if (viewingSubjectQuestions) return item.subject === viewingSubjectQuestions.name && item.type === viewingSubjectQuestions.type;
        return item.question.toLowerCase().includes(searchQuery.toLowerCase()) || item.subject.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [quizData, searchQuery, viewingSubjectQuestions]);

  const handleSubmitSingle = () => {
    if (!subject.trim() || !question.trim()) return alert("សូមបំពេញព័ត៌មានសំណួរឱ្យបានគ្រប់គ្រាន់!");
    let newQ: Question;
    if (qType === 'mcq') {
      if (options.some(o => !o.trim())) return alert("សូមបំពេញជម្រើសចម្លើយឱ្យគ្រប់!");
      newQ = { type: 'mcq', subject: subject.trim(), question: question.trim(), options: options.map(o => o.trim()), correct, isActive: true };
    } else {
      if (!shortAnswer.trim()) return alert("សូមបំពេញចម្លើយត្រឹមត្រូវ!");
      newQ = { type: 'short', subject: subject.trim(), question: question.trim(), answer: shortAnswer.trim(), isActive: true };
    }
    if (editingIndex !== null) onUpdate(editingIndex, newQ); else onAdd(newQ);
    setQuestion(''); setOptions(['', '', '', '']); setShortAnswer(''); setEditingIndex(null);
  };

  const handleBulkSubmit = () => {
    if (!subject.trim() || !bulkText.trim()) return alert("សូមបំពេញព័ត៌មាន!");
    const lines = bulkText.split('\n');
    const parsed: Question[] = [];
    let currentQuestion: any = null;
    let isReadingAnswer = false;

    if (bulkType === 'mcq') {
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const qMatch = trimmed.match(/^[០-៩0-9]+\.\s*(.*)/);
        if (qMatch) {
          if (currentQuestion && currentQuestion.question && currentQuestion.options && currentQuestion.options.length >= 2) parsed.push(currentQuestion);
          currentQuestion = { type: 'mcq', subject: subject.trim(), question: qMatch[1].trim(), options: [], correct: 0, isActive: true };
          return;
        }
        const oMatch = trimmed.match(/^[កខគឃ]\.\s*(.*)/);
        if (oMatch && currentQuestion && currentQuestion.type === 'mcq') {
          let text = oMatch[1].replace('(ចម្លើយត្រឹមត្រូវ)', '').trim();
          currentQuestion.options.push(text);
          if (oMatch[1].includes('(ចម្លើយត្រឹមត្រូវ)')) currentQuestion.correct = currentQuestion.options.length - 1;
        }
      });
      if (currentQuestion && currentQuestion.question && currentQuestion.options && currentQuestion.options.length >= 2) parsed.push(currentQuestion);
    } else {
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine === "" && !isReadingAnswer) return;
        const qMatch = trimmedLine.match(/^[០-៩0-9]+\.\s*(.*)/);
        if (qMatch) {
          if (currentQuestion && currentQuestion.question && currentQuestion.answer) parsed.push(currentQuestion);
          currentQuestion = { type: 'short', subject: subject.trim(), question: qMatch[1].trim(), answer: '', isActive: true };
          isReadingAnswer = false;
          return;
        }
        const aStartMatch = trimmedLine.match(/^ចម្លើយ\s*[៖:]\s*(.*)/);
        if (aStartMatch && currentQuestion) { currentQuestion.answer = aStartMatch[1].trim(); isReadingAnswer = true; return; }
        if (isReadingAnswer && currentQuestion) currentQuestion.answer += (currentQuestion.answer ? '\n' : '') + line;
      });
      if (currentQuestion && currentQuestion.question && currentQuestion.answer) parsed.push(currentQuestion);
    }
    if (parsed.length > 0) { onBatchAdd(parsed); setBulkText(''); alert(`បានបញ្ចូល ${parsed.length} សំណួរដោយជោគជ័យ!`); } else alert("រកមិនឃើញទម្រង់សំណួរត្រឹមត្រូវ!");
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="glass-card rounded-[2.5rem] shadow-xl p-8 border border-white/50">
        <div className="flex border-b border-gray-100 mb-8 -mx-8 px-8 overflow-x-auto custom-scrollbar">
          <button onClick={() => { setEntryMode('single'); setViewingSubjectQuestions(null); }} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 ${entryMode === 'single' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>✍️ បញ្ចូលសំណួរ</button>
          <button onClick={() => { setEntryMode('bulk'); setViewingSubjectQuestions(null); }} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 ${entryMode === 'bulk' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>🚀 បញ្ចូលទាំងអស់</button>
          <button onClick={() => { setEntryMode('subjects'); setViewingSubjectQuestions(null); }} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 ${entryMode === 'subjects' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>📚 គ្រប់គ្រងទិន្នន័យ</button>
          <button onClick={() => { setEntryMode('feedback'); setViewingSubjectQuestions(null); }} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 relative ${entryMode === 'feedback' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            💬 ការបញ្ចេញមតិ 
            {feedbackList.length > 0 && <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[8px] px-2 py-0.5 rounded-full shadow-lg animate-pulse">{feedbackList.length}</span>}
          </button>
        </div>
        
        {entryMode === 'single' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-wrap gap-4 items-center justify-between"><h2 className="text-xl font-black heading-kh text-maroon flex items-center gap-2"><span>{editingIndex !== null ? '✏️' : '🆕'}</span>{editingIndex !== null ? 'កែសម្រួលសំណួរ' : 'បង្កើតសំណួរថ្មី'}</h2><div className="flex bg-gray-100 p-1 rounded-xl"><button onClick={() => setQType('mcq')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${qType === 'mcq' ? 'bg-white text-maroon shadow-sm' : 'text-gray-400'}`}>QCM</button><button onClick={() => setQType('short')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${qType === 'short' ? 'bg-white text-maroon shadow-sm' : 'text-gray-400'}`}>Q & A</button></div></div>
            <div className="grid grid-cols-1 gap-5"><div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">ឈ្មោះមុខវិជ្ជា</label><input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh bg-gray-50/50 text-maroon font-bold" placeholder="ឈ្មោះមុខវិជ្ជា..." /></div><div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">អត្ថបទសំណួរ</label><textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-maroon outline-none min-h-[100px] small-kh bg-gray-50/50" placeholder="សរសេរសំណួរ..." /></div>
              {qType === 'mcq' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm focus-within:border-maroon/30 transition-all"><span className="font-black text-maroon w-10 h-10 flex items-center justify-center bg-maroon/5 rounded-xl">{KHMER_PREFIXES[i]}</span><input type="text" value={opt} onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} className="flex-1 outline-none small-kh py-1 text-sm" placeholder={`ចម្លើយទី ${i+1}`} /><label className="relative flex items-center cursor-pointer"><input type="radio" checked={correct === i} onChange={() => setCorrect(i)} className="hidden peer" /><div className="w-8 h-8 border-2 border-gray-200 rounded-xl peer-checked:bg-green-500 peer-checked:border-green-500 text-white flex items-center justify-center">✓</div></label></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">ចម្លើយដែលត្រូវ</label><textarea value={shortAnswer} onChange={(e) => setShortAnswer(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh bg-gray-50/50 min-h-[100px]" placeholder="បញ្ចូលចម្លើយត្រឹមត្រូវ..." /></div>
              )}
            </div>
            <button onClick={handleSubmitSingle} className="w-full bg-maroon text-white font-black py-5 rounded-[2rem] shadow-xl hover:brightness-110 transition-all heading-kh text-lg">រក្សាទុកសំណួរ</button>
          </div>
        )}

        {entryMode === 'bulk' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-black heading-kh text-maroon flex items-center gap-2">🚀 បញ្ចូលសំណួរទាំងអស់</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">ឈ្មោះមុខវិជ្ជា</label><input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh bg-gray-50/50 text-maroon font-bold" placeholder="ឈ្មោះមុខវិជ្ជា..." /></div><div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">ប្រភេទសំណួរ</label><div className="flex bg-gray-100 p-1 rounded-2xl h-[60px]"><button onClick={() => setBulkType('mcq')} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${bulkType === 'mcq' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-400'}`}>QCM</button><button onClick={() => setBulkType('short')} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${bulkType === 'short' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-400'}`}>Q & A</button></div></div></div>
            <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} className="w-full px-5 py-5 rounded-[2rem] border border-gray-100 min-h-[300px] small-kh text-xs bg-gray-50/50 outline-none focus:ring-2 focus:ring-maroon" placeholder="ចម្លងកម្រងសំណួរដាក់ទីនេះ..." />
            <button onClick={handleBulkSubmit} className="w-full bg-maroon text-white font-black py-5 rounded-[2rem] shadow-xl hover:brightness-110 transition-all heading-kh text-lg">ចាប់ផ្ដើមបញ្ចូលទិន្នន័យ</button>
          </div>
        )}

        {entryMode === 'subjects' && (
          <div className="space-y-12 animate-fadeIn">
            {viewingSubjectQuestions ? (
              <div className="animate-fadeIn space-y-4">
                <div className="bg-white p-6 rounded-[2rem] border-2 border-blue-100 shadow-md flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4"><button onClick={() => setViewingSubjectQuestions(null)} className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">←</button><div><h3 className="text-xl font-black heading-kh text-blue-800 leading-tight">វិញ្ញាសា៖ {viewingSubjectQuestions.name}</h3><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">បញ្ជីសំណួរ ({filteredQuestions.length} សំណួរ)</p></div></div>
                </div>
                <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredQuestions.map((item) => (
                    <div key={item.originalIndex} className="p-5 rounded-3xl border bg-white border-gray-50 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
                      <div className="truncate flex-1 pr-4"><p className="text-sm font-bold text-gray-700 line-clamp-2 small-kh">{item.question}</p></div>
                      <div className="flex gap-2 shrink-0"><button onClick={() => { setQType(item.type); setSubject(item.subject); setQuestion(item.question); if (item.type === 'mcq') { setOptions(item.options || []); setCorrect(item.correct || 0); } else setShortAnswer(item.answer || ''); setEditingIndex(item.originalIndex); setEntryMode('single'); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-3 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-100 transition-colors">✏️</button></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedSubjects.mcq.map((sub, i) => (<SubjectCard key={`mcq-${i}`} sub={sub} isFirst={i === 0} isLast={i === groupedSubjects.mcq.length - 1} onToggleSubject={onToggleSubject} onEditSubject={() => {}} onRemoveSubject={onRemoveSubject} onReorderSubject={onReorderSubject} onOpenPdfSettings={() => {}} onOpenImageSettings={() => {}} onViewQuestions={(name, type) => setViewingSubjectQuestions({name, type})} />))}
                {groupedSubjects.short.map((sub, i) => (<SubjectCard key={`short-${i}`} sub={sub} isFirst={i === 0} isLast={i === groupedSubjects.short.length - 1} onToggleSubject={onToggleSubject} onEditSubject={() => {}} onRemoveSubject={onRemoveSubject} onReorderSubject={onReorderSubject} onOpenPdfSettings={() => {}} onOpenImageSettings={() => {}} onViewQuestions={(name, type) => setViewingSubjectQuestions({name, type})} />))}
              </div>
            )}
          </div>
        )}

        {entryMode === 'feedback' && (
          <div className="animate-fadeIn space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-black heading-kh text-maroon flex items-center gap-3">
                  <span className="text-3xl">💬</span> មតិយោបល់របស់អ្នកប្រើប្រាស់
                </h2>
                <p className="text-xs small-kh text-gray-400 mt-1">អ្នកទទួលបានសារសរុបចំនួន {toKhmerNumeral(feedbackList.length)} សារ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {feedbackList.length > 0 ? (
                feedbackList.map((fb, idx) => (
                  <div key={fb.id} className="relative group animate-fadeIn" style={{ animationDelay: `${idx * 0.1}s` }}>
                    <div className="glass-card rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:border-maroon/20 bg-white/50">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 rounded-3xl bg-maroon/5 border-2 border-maroon/10 text-maroon flex items-center justify-center font-black text-2xl shadow-inner">
                            {(fb.username || 'A')[0].toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xl font-black heading-kh text-maroon leading-tight">{fb.username || 'Anonymous'}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {new Date(fb.createdAt).toLocaleString('km-KH', { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => { navigator.clipboard.writeText(fb.text); alert("ចម្លងអត្ថបទរួចរាល់!"); }}
                            className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                            title="ចម្លងអត្ថបទ"
                          >
                            📋
                          </button>
                          <button 
                            onClick={() => fb.id && onDeleteFeedback && onDeleteFeedback(fb.id)}
                            className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                            title="លុបសារ"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-white/80 backdrop-blur-sm p-8 rounded-[2rem] border border-gray-100/50 shadow-inner relative">
                        <div className="absolute top-4 right-6 text-4xl opacity-5 select-none font-serif">"</div>
                        <p className="text-lg small-kh text-gray-700 leading-[2.2] whitespace-pre-wrap">{fb.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-32 text-center bg-gray-50/50 rounded-[3rem] border-4 border-dashed border-gray-100">
                  <div className="text-8xl mb-6 opacity-20">📭</div>
                  <h3 className="text-2xl font-black heading-kh text-gray-300">មិនទាន់មានមតិយោបល់នៅឡើយទេ</h3>
                  <p className="text-xs small-kh text-gray-400 mt-2">សារដែលសិស្សផ្ញើមក នឹងបង្ហាញនៅទីនេះ</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateSection;
