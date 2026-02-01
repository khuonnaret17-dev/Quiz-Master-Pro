
import * as React from 'react';
import { useState, useMemo, useRef } from 'react';
import { Question } from '../types';
import html2canvas from 'html2canvas';

// បញ្ជាក់៖ បណ្ណាល័យទាំងនេះត្រូវបាន Load តាមរយៈ index.html
declare var html2pdf: any;
declare var JSZip: any;

interface CreateSectionProps {
  quizData: Question[];
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

interface PdfSettings {
  showAnswerKey: boolean;
  shuffleQuestions: boolean;
  schoolName: string;
  examDate: string;
}

interface ImageSettings {
  style: 'modern' | 'classic' | 'dark' | 'clean';
  showSchoolName: boolean;
  schoolName: string;
  showWatermark: boolean;
}

const SubjectCard: React.FC<{
  sub: { name: string, isActive: boolean, count: number, type: 'mcq' | 'short' };
  isFirst: boolean;
  isLast: boolean;
  onToggleSubject: (subject: string, type: 'mcq' | 'short', active: boolean) => void;
  onUpdateSubject: (subject: string, type: 'mcq' | 'short') => void;
  onRemoveSubject: (subject: string, type: 'mcq' | 'short') => void;
  onReorderSubject: (subject: string, type: 'mcq' | 'short', direction: 'up' | 'down') => void;
  onOpenPdfSettings: (name: string, type: 'mcq' | 'short') => void;
  onOpenImageSettings: (name: string, type: 'mcq' | 'short') => void;
}> = ({ sub, isFirst, isLast, onToggleSubject, onUpdateSubject, onRemoveSubject, onReorderSubject, onOpenPdfSettings, onOpenImageSettings }) => (
  <div className={`p-6 rounded-[2rem] border transition-all flex flex-col justify-between ${sub.isActive ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-100 border-gray-200 grayscale opacity-60'}`}>
    <div>
      <div className="flex justify-between items-start mb-4">
        <div className="truncate pr-2 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-black heading-kh text-maroon truncate max-w-[150px]">{sub.name}</h3>
            <button onClick={() => onUpdateSubject(sub.name, sub.type)} className="text-xs p-1 bg-maroon/5 text-maroon rounded hover:bg-maroon hover:text-white transition-all shadow-sm" title="កែសម្រួលឈ្មោះមុខវិជ្ជា">✏️</button>
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
    <div className="flex gap-2 mt-4">
      <button onClick={() => onToggleSubject(sub.name, sub.type, !sub.isActive)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${sub.isActive ? 'bg-maroon/5 text-maroon hover:bg-maroon hover:text-white' : 'bg-green-500 text-white hover:brightness-110'}`}>{sub.isActive ? '❌ បិទមុខវិជ្ជា' : '✅ បើកមុខវិជ្ជា'}</button>
      <button onClick={() => onRemoveSubject(sub.name, sub.type)} className="px-4 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
    </div>
  </div>
);

const CreateSection: React.FC<CreateSectionProps> = ({ 
  quizData, onAdd, onUpdate, onRemove, onToggleSubject, onUpdateSubject, onRemoveSubject, onReorderSubject, onBatchAdd
}) => {
  const KHMER_PREFIXES = ['ក', 'ខ', 'គ', 'ឃ'];
  const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  const [entryMode, setEntryMode] = useState<'single' | 'bulk' | 'subjects'>('single');
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
  
  // PDF Settings States
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPdfInfo, setSelectedPdfInfo] = useState<{name: string, type: 'mcq' | 'short'} | null>(null);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings>({
    showAnswerKey: true,
    shuffleQuestions: true,
    schoolName: 'សាលាភូមិន្ទរដ្ឋបាល',
    examDate: new Date().toLocaleDateString('km-KH')
  });

  // Image Settings States
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageInfo, setSelectedImageInfo] = useState<{name: string, type: 'mcq' | 'short'} | null>(null);
  const [imageSettings, setImageSettings] = useState<ImageSettings>({
    style: 'modern',
    showSchoolName: true,
    schoolName: 'Quiz Master KH',
    showWatermark: true
  });

  const exportRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [exportQuestion, setExportQuestion] = useState<Question | null>(null);
  const [pdfSubjectData, setPdfSubjectData] = useState<{name: string, type: string, questions: Question[]} | null>(null);

  const toKhmerNumeral = (n: number) => {
    return n.toString().split('').map(digit => KHMER_DIGITS[parseInt(digit)] || digit).join('');
  };

  function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const filteredQuestions = useMemo(() => {
    return quizData
      .map((q, originalIndex) => ({ ...q, originalIndex }))
      .filter(item => {
        return item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
               item.subject.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [quizData, searchQuery]);

  const groupedSubjects = useMemo(() => {
    const getOrderedSubjects = (type: 'mcq' | 'short') => {
      const typeQuestions = quizData.filter(q => q.type === type);
      const subjects: { name: string, isActive: boolean, count: number, type: 'mcq' | 'short' }[] = [];
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

  const handleOpenPdfSettings = (name: string, type: 'mcq' | 'short') => {
    setSelectedPdfInfo({ name, type });
    setShowPdfModal(true);
  };

  const handleOpenImageSettings = (name: string, type: 'mcq' | 'short') => {
    setSelectedImageInfo({ name, type });
    setShowImageModal(true);
  };

  const handleDownloadPDF = () => {
    if (!selectedPdfInfo) return;
    const { name, type } = selectedPdfInfo;
    let questions = quizData.filter(q => q.subject === name && q.type === type);
    
    if (questions.length === 0) return alert("មិនមានសំណួរក្នុងមុខវិជ្ជានេះឡើយ!");
    
    setShowPdfModal(false);
    
    let finalQuestions = questions.map(q => {
      if (q.type === 'mcq' && q.options) {
        const optionsWithMeta = q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correct }));
        const shuffledOptions = pdfSettings.shuffleQuestions ? shuffleArray(optionsWithMeta) : optionsWithMeta;
        const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);
        return { ...q, options: shuffledOptions.map(o => o.text), correct: newCorrectIndex };
      }
      return q;
    });

    if (pdfSettings.shuffleQuestions) {
      finalQuestions = shuffleArray(finalQuestions);
    }

    setPdfSubjectData({ name, type, questions: finalQuestions });
    setIsExportingPDF(true);

    const isVeryLong = finalQuestions.length > 50;
    setTimeout(() => {
      if (pdfRef.current) {
        const opt = {
          margin: [10, 10, 10, 10],
          filename: `Quiz_${name.replace(/\s+/g, '_')}_${type.toUpperCase()}_${Date.now()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: isVeryLong ? 1.5 : 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().from(pdfRef.current).set(opt).save().then(() => {
          setIsExportingPDF(false);
          setPdfSubjectData(null);
        }).catch((err: any) => {
          console.error("PDF Generation Error:", err);
          alert("ការទាញយកមានបញ្ហា!");
          setIsExportingPDF(false);
        });
      }
    }, isVeryLong ? 3000 : 1500);
  };

  const handleDownloadSingleImage = (q: Question) => {
    setIsExporting(true);
    setExportQuestion(q);
    setTimeout(async () => {
      if (exportRef.current) {
        try {
          const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
          const link = document.createElement('a');
          link.download = `Quiz_${q.subject.replace(/\s+/g, '_')}_${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        } catch (err) { console.error(err); }
      }
      setIsExporting(false);
      setExportQuestion(null);
    }, 300);
  };

  const handleDownloadSubjectImagesZip = async () => {
    if (!selectedImageInfo) return;
    const { name, type } = selectedImageInfo;
    let questions = quizData.filter(q => q.subject === name && q.type === type);
    
    if (questions.length === 0) return alert("មិនមានសំណួរក្នុងមុខវិជ្ជានេះឡើយ!");
    
    setShowImageModal(false);
    setIsExportingZip(true);
    setZipProgress({ current: 0, total: questions.length });
    
    // បង្កើត JSZip instance ថ្មី
    const zip = new JSZip();
    // ប្រើឈ្មោះជាអក្សរឡាតាំងសម្រាប់ Folders ដើម្បីការពារបញ្ហា Extraction
    const folderName = `Quiz_Images_${name.replace(/\s+/g, '_')}_${type.toUpperCase()}`;
    const folder = zip.folder(folderName);
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      setZipProgress({ current: i + 1, total: questions.length });
      
      let processedQ = { ...q };
      if (q.type === 'mcq' && q.options) {
        const optionsWithMeta = q.options.map((opt, oIdx) => ({ text: opt, isCorrect: oIdx === q.correct }));
        const shuffledOptions = shuffleArray(optionsWithMeta);
        const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);
        processedQ.options = shuffledOptions.map(o => o.text);
        processedQ.correct = newCorrectIndex;
      }

      setExportQuestion(processedQ);
      setIsExporting(true);
      
      // រង់ចាំឱ្យ Canvas Render បានសព្វគ្រប់
      await new Promise(resolve => setTimeout(resolve, 400));
      
      if (exportRef.current) {
        try {
          const canvas = await html2canvas(exportRef.current, { 
            scale: 2, 
            backgroundColor: '#ffffff', 
            useCORS: true,
            logging: false
          });
          const base64Data = canvas.toDataURL('image/png').split(',')[1];
          // ឈ្មោះហ្វាយជាលេខរៀង ដើម្បីកុំឱ្យជាន់គ្នា
          folder.file(`Question_${i + 1}.png`, base64Data, { base64: true });
        } catch (err) { 
          console.error("Error capturing question:", i, err); 
        }
      }
    }
    
    try {
      // បង្កើត ZIP file
      const content = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      // ប្រើឈ្មោះអក្សរឡាតាំងសម្រាប់ហ្វាយ ZIP ដើម្បីឱ្យប្រព័ន្ធប្រតិបត្តិការទាំងអស់បើកបាន
      link.download = `Quiz_Pack_${name.replace(/\s+/g, '_')}_${type.toUpperCase()}_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // សម្អាត URL បន្ទាប់ពីប្រើរួច
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      
    } catch (err) { 
      console.error("ZIP Generation Error:", err);
      alert("មានបញ្ហាក្នុងការបង្កើត ZIP! សូមព្យាយាមម្ដងទៀត។"); 
    }
    
    setIsExportingZip(false);
    setIsExporting(false);
    setExportQuestion(null);
  };

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
    if (editingIndex !== null) onUpdate(editingIndex, newQ);
    else onAdd(newQ);
    setQuestion(''); setOptions(['', '', '', '']); setShortAnswer(''); setEditingIndex(null);
  };

  const handleBulkSubmit = () => {
    if (!subject.trim() || !bulkText.trim()) return alert("សូមបំពេញព័ត៌មាន!");
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsed: Question[] = [];
    let cur: Partial<Question> | null = null;
    if (bulkType === 'mcq') {
      lines.forEach(line => {
        const qMatch = line.match(/^[០-៩0-9]+\.\s*(.*)/);
        if (qMatch) {
          if (cur && cur.question && cur.options && cur.options.length >= 2) parsed.push(cur as Question);
          cur = { type: 'mcq', subject: subject.trim(), question: qMatch[1].trim(), options: [], correct: 0, isActive: true };
          return;
        }
        const oMatch = line.match(/^[កខគឃ]\.\s*(.*)/);
        if (oMatch && cur && cur.type === 'mcq') {
          let text = oMatch[1].replace('(ចម្លើយត្រឹមត្រូវ)', '').trim();
          if (!cur.options) cur.options = [];
          cur.options.push(text);
          if (oMatch[1].includes('(ចម្លើយត្រឹមត្រូវ)')) cur.correct = cur.options.length - 1;
        }
      });
      if (cur && cur.question && cur.options && cur.options.length >= 2) parsed.push(cur as Question);
    } else {
      lines.forEach(line => {
        const qMatch = line.match(/^[០-៩0-9]+\.\s*(.*)/);
        if (qMatch) {
          if (cur && cur.question && cur.answer) parsed.push(cur as Question);
          cur = { type: 'short', subject: subject.trim(), question: qMatch[1].trim(), answer: '', isActive: true };
          return;
        }
        const aMatch = line.match(/^ចម្លើយ\s*[៖:]\s*(.*)/);
        if (aMatch && cur && cur.type === 'short') cur.answer = aMatch[1].trim();
      });
      if (cur && cur.question && cur.answer) parsed.push(cur as Question);
    }
    if (parsed.length > 0) { onBatchAdd(parsed); setBulkText(''); alert(`បានបញ្ចូល ${parsed.length} សំណួរដោយជោគជ័យ!`); } 
    else alert("រកមិនឃើញទម្រង់សំណួរត្រឹមត្រូវ!");
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(quizData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quiz_backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          if (confirm(`តើអ្នកចង់បញ្ចូលសំណួរចំនួន ${imported.length} នេះទៅក្នុងប្រព័ន្ធមែនទេ?`)) onBatchAdd(imported);
        }
      } catch (err) { alert("ហ្វាយមិនត្រឹមត្រូវឡើយ!"); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      {/* PDF Settings Modal */}
      {showPdfModal && selectedPdfInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border-2 border-white animate-fadeIn">
            <h3 className="text-xl font-black heading-kh text-maroon mb-6 flex items-center gap-2">
              ⚙️ កំណត់សម្គាល់ PDF
            </h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">ឈ្មោះស្ថាប័ន/សាលា</label>
                <input type="text" value={pdfSettings.schoolName} onChange={e => setPdfSettings(prev => ({...prev, schoolName: e.target.value}))} className="w-full px-5 py-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">សម័យប្រឡង/កាលបរិច្ឆេទ</label>
                <input type="text" value={pdfSettings.examDate} onChange={e => setPdfSettings(prev => ({...prev, examDate: e.target.value}))} className="w-full px-5 py-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh" />
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={pdfSettings.showAnswerKey} onChange={e => setPdfSettings(prev => ({...prev, showAnswerKey: e.target.checked}))} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-maroon transition-all"></div>
                    <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-5"></div>
                  </div>
                  <span className="text-sm font-bold small-kh group-hover:text-maroon">បង្ហាញតារាងចម្លើយ (Answer Key)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={pdfSettings.shuffleQuestions} onChange={e => setPdfSettings(prev => ({...prev, shuffleQuestions: e.target.checked}))} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-maroon transition-all"></div>
                    <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-5"></div>
                  </div>
                  <span className="text-sm font-bold small-kh group-hover:text-maroon">លាយសំណួរដោយចៃដន្យ (Shuffle)</span>
                </label>
              </div>
              <div className="flex gap-3 pt-6">
                <button onClick={() => setShowPdfModal(false)} className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-bold small-kh hover:bg-gray-200">បោះបង់</button>
                <button onClick={handleDownloadPDF} className="flex-2 px-8 py-4 rounded-2xl bg-maroon text-white font-black heading-kh shadow-lg hover:brightness-110">បង្កើត PDF 📄</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Settings Modal */}
      {showImageModal && selectedImageInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border-2 border-white animate-fadeIn overflow-y-auto max-h-[90vh] custom-scrollbar">
            <h3 className="text-xl font-black heading-kh text-maroon mb-6 flex items-center gap-2">
              🖼️ កំណត់រចនាប័ទ្មរូបភាព
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-gray-400">ជ្រើសរើស Style</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'modern', label: 'Modern ✨', color: 'from-blue-50 to-indigo-50' },
                    { id: 'classic', label: 'Classic 📜', color: 'from-orange-50 to-yellow-50' },
                    { id: 'dark', label: 'Dark 🌙', color: 'from-gray-800 to-gray-900' },
                    { id: 'clean', label: 'Clean ⚪', color: 'bg-gray-50' }
                  ].map(style => (
                    <button 
                      key={style.id}
                      onClick={() => setImageSettings(prev => ({ ...prev, style: style.id as any }))}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${imageSettings.style === style.id ? 'border-maroon ring-4 ring-maroon/10 scale-105 bg-white shadow-lg' : 'border-gray-100 bg-white hover:border-gray-300'}`}
                    >
                      <div className={`w-full h-12 rounded-lg bg-gradient-to-r ${style.color}`}></div>
                      <span className="text-[11px] font-black small-kh">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400">ឈ្មោះសាលា / Branding</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={imageSettings.schoolName} 
                      onChange={e => setImageSettings(prev => ({...prev, schoolName: e.target.value}))} 
                      className="flex-1 px-5 py-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh text-sm" 
                    />
                    <button onClick={() => setImageSettings(prev => ({...prev, showSchoolName: !prev.showSchoolName}))} className={`px-4 rounded-xl font-bold text-xs ${imageSettings.showSchoolName ? 'bg-maroon text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {imageSettings.showSchoolName ? 'បើក' : 'បិទ'}
                    </button>
                  </div>
                </div>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={imageSettings.showWatermark} onChange={e => setImageSettings(prev => ({...prev, showWatermark: e.target.checked}))} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-maroon transition-all"></div>
                    <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-5"></div>
                  </div>
                  <span className="text-sm font-bold small-kh group-hover:text-maroon">បង្ហាញ Watermark (Quiz Master)</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowImageModal(false)} className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-bold small-kh hover:bg-gray-200">បោះបង់</button>
                <button onClick={handleDownloadSubjectImagesZip} className="flex-2 px-8 py-4 rounded-2xl bg-maroon text-white font-black heading-kh shadow-lg hover:brightness-110">ទាញយក ZIP 🖼️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Template */}
      {isExportingPDF && pdfSubjectData && (
        <div className="fixed -left-[4000px] top-0 bg-white">
          <div ref={pdfRef} style={{ width: '210mm', minHeight: '297mm', padding: '15mm 20mm', background: 'white', color: 'black' }} className="small-kh">
            <div className="border-[1.5pt] border-black p-6 mb-10">
              <div className="flex justify-between items-start">
                <div className="text-center w-[45%]">
                  <h1 className="text-[15pt] font-bold heading-kh mb-1 leading-[2.2]">ព្រះរាជាណាចក្រកម្ពុជា</h1>
                  <h2 className="text-[13pt] font-bold heading-kh mb-2 leading-[2.0]">ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
                  <div className="flex justify-center mb-4"><div className="w-16 h-[1.2px] bg-black"></div></div>
                  <h3 className="text-[11pt] font-bold heading-kh text-maroon/80">{pdfSettings.schoolName}</h3>
                </div>
                <div className="text-center w-[50%] pt-2">
                  <h3 className="text-[16pt] font-bold heading-kh mb-3 leading-[2.2] border-b-2 border-black pb-2">វិញ្ញាសា៖ {pdfSubjectData.name}</h3>
                  <div className="text-left space-y-1 mt-4 ml-4">
                    <p className="text-[10pt] font-bold">ប្រភេទ៖ {pdfSubjectData.type === 'mcq' ? 'ពហុចម្លើយ (QCM)' : 'សំណួរចម្លើយ (Q&A)'}</p>
                    <p className="text-[10pt] font-bold">ចំនួន៖ {toKhmerNumeral(pdfSubjectData.questions.length)} សំណួរ</p>
                    <p className="text-[10pt] font-bold">កាលបរិច្ឆេទ៖ {pdfSettings.examDate}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-10">
              {pdfSubjectData.questions.map((q, idx) => (
                <div key={idx} style={{ pageBreakInside: 'avoid' }} className="pb-4">
                  <div className="flex gap-4 mb-4 items-start">
                    <span className="font-bold text-[13pt] pt-1">{toKhmerNumeral(idx + 1)}.</span>
                    <h4 className="text-[14pt] font-bold heading-kh leading-[2.2] flex-1 text-justify">{q.question}</h4>
                  </div>
                  {q.type === 'mcq' ? (
                    <div className="grid grid-cols-1 gap-4 ml-12">
                      {q.options?.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-5 items-start text-[12pt] leading-[1.8]">
                          <span className="font-bold">{KHMER_PREFIXES[oIdx]}.</span>
                          <span className="flex-1">{opt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ml-12 mt-4 p-5 border-l-4 border-black/10 bg-gray-50/30">
                      <p className="text-[9pt] font-black mb-2 uppercase opacity-40">ចម្លើយគំរូ៖</p>
                      <p className="text-[12pt] leading-[2.2] text-justify whitespace-pre-wrap">{q.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {pdfSettings.showAnswerKey && pdfSubjectData.type === 'mcq' && (
              <div style={{ marginTop: '60px', borderTop: '2pt solid #000', paddingTop: '40px', pageBreakBefore: 'always' }}>
                <h3 className="text-[16pt] font-bold heading-kh text-center mb-8">តារាងចម្លើយត្រឹមត្រូវ (Answer Key)</h3>
                <div className="flex justify-center">
                  <table className="border-collapse border-2 border-black w-full max-w-2xl">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border-2 border-black p-4 text-[12pt] font-bold">ល.រ</th>
                        <th className="border-2 border-black p-4 text-[12pt] font-bold">ចម្លើយ</th>
                        <th className="border-2 border-black p-4 text-[12pt] font-bold">ល.រ</th>
                        <th className="border-2 border-black p-4 text-[12pt] font-bold">ចម្លើយ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.ceil(pdfSubjectData.questions.length / 2) }).map((_, i) => {
                        const q1 = pdfSubjectData.questions[i * 2];
                        const q2 = pdfSubjectData.questions[i * 2 + 1];
                        return (
                          <tr key={i}>
                            <td className="border border-black p-4 text-center text-[11pt]">{toKhmerNumeral(i * 2 + 1)}</td>
                            <td className="border border-black p-4 text-center text-[14pt] font-bold">{q1 ? KHMER_PREFIXES[q1.correct || 0] : ''}</td>
                            <td className="border border-black p-4 text-center text-[11pt]">{q2 ? toKhmerNumeral(i * 2 + 2) : ''}</td>
                            <td className="border border-black p-4 text-center text-[14pt] font-bold">{q2 ? KHMER_PREFIXES[q2.correct || 0] : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-20 text-center italic text-gray-500 text-[10pt]">
                  --- រៀបរៀងដោយ Quiz Master KH - រក្សាសិទ្ធិគ្រប់យ៉ាង ---
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Export Template - Dynamic Image Styles */}
      {isExporting && exportQuestion && (
        <div className="fixed -left-[2000px] top-0">
          <div ref={exportRef} className={`w-[800px] p-12 rounded-[4rem] relative overflow-hidden transition-all duration-300 shadow-2xl ${
            imageSettings.style === 'dark' ? 'bg-[#1a1a1a] text-white border-[16px] border-[#2a2a2a]' :
            imageSettings.style === 'classic' ? 'bg-[#fffdf5] text-[#3e2723] border-[16px] border-[#8d6e63]' :
            imageSettings.style === 'clean' ? 'bg-white text-gray-800 border-[16px] border-gray-100' :
            'bg-white text-gray-800 border-[16px] border-maroon'
          }`}>
            
            {/* Background elements */}
            {imageSettings.style === 'modern' && (
              <>
                <div className="absolute top-0 right-0 w-80 h-80 bg-maroon/5 rounded-full -mr-40 -mt-40 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-maroon/5 rounded-full -ml-40 -mb-40 blur-3xl"></div>
              </>
            )}
            {imageSettings.style === 'classic' && (
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/parchment.png')" }}></div>
            )}

            {/* Header */}
            <div className={`flex justify-between items-center mb-10 pb-6 border-b-4 border-dashed ${
              imageSettings.style === 'dark' ? 'border-white/10' :
              imageSettings.style === 'classic' ? 'border-[#8d6e63]/20' :
              'border-maroon/20'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${
                  imageSettings.style === 'dark' ? 'bg-white text-black' : 'bg-maroon text-white'
                }`}>🇰🇭</div>
                <div>
                  <h1 className={`text-3xl font-black heading-kh ${
                    imageSettings.style === 'dark' ? 'text-white' : 
                    imageSettings.style === 'classic' ? 'text-[#3e2723]' : 'text-maroon'
                  }`}>{imageSettings.schoolName}</h1>
                  <p className="text-sm font-khmer os siemreap text-gray-400 uppercase tracking-widest">Khoun Naret</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-black px-5 py-2 rounded-full uppercase shadow-sm ${
                  imageSettings.style === 'dark' ? 'bg-white/10 text-white' : 'bg-maroon text-white'
                }`}>{exportQuestion.subject}</span>
                <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-tighter">
                  {exportQuestion.type === 'mcq' ? 'QCM' : 'Q & A'}
                </p>
              </div>
            </div>

            {/* Question Body */}
            <div className="mb-12">
              <h2 className={`text-4xl font-black heading-kh leading-[1.6] ${
                imageSettings.style === 'dark' ? 'text-white' : 
                imageSettings.style === 'classic' ? 'text-[#3e2723]' : 'text-maroon'
              }`}>{exportQuestion.question}</h2>
            </div>

            {/* Answers */}
            {exportQuestion.type === 'mcq' ? (
              <div className="grid grid-cols-1 gap-4">
                {exportQuestion.options?.map((opt, i) => (
                  <div key={i} className={`flex items-center gap-6 p-6 rounded-3xl border-4 transition-all ${
                    i === exportQuestion.correct 
                      ? (imageSettings.style === 'dark' ? 'bg-green-900/30 border-green-500' : 'bg-green-50 border-green-500') 
                      : (imageSettings.style === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-transparent')
                  }`}>
                    <span className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-md ${
                      i === exportQuestion.correct 
                        ? 'bg-green-500 text-white' 
                        : (imageSettings.style === 'dark' ? 'bg-white/10 text-white' : 'bg-white text-maroon')
                    }`}>{KHMER_PREFIXES[i]}</span>
                    <span className={`text-2xl font-bold small-kh ${
                      i === exportQuestion.correct 
                        ? (imageSettings.style === 'dark' ? 'text-green-300' : 'text-green-800') 
                        : (imageSettings.style === 'dark' ? 'text-gray-300' : 'text-gray-600')
                    }`}>{opt}</span>
                    {i === exportQuestion.correct && <span className="ml-auto text-3xl">✅</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`rounded-r-[3rem] p-10 border-l-[12px] ${
                imageSettings.style === 'dark' ? 'bg-white/5 border-white/40' : 
                imageSettings.style === 'classic' ? 'bg-[#8d6e63]/10 border-[#8d6e63]' : 'bg-green-50 border-green-500'
              }`}>
                <p className={`text-2xl font-black heading-kh mb-4 ${
                  imageSettings.style === 'dark' ? 'text-white' : 
                  imageSettings.style === 'classic' ? 'text-[#3e2723]' : 'text-green-700'
                }`}>ចម្លើយដែលត្រឹមត្រូវ ៖</p>
                <p className={`text-3xl font-bold small-kh leading-relaxed whitespace-pre-wrap ${
                  imageSettings.style === 'dark' ? 'text-gray-200' : 'text-gray-800'
                }`}>{exportQuestion.answer}</p>
              </div>
            )}

            {/* Footer Watermark */}
            {imageSettings.showWatermark && (
              <div className="mt-12 flex justify-center opacity-30">
                <p className="text-xs font-black tracking-[10px] uppercase">Quiz Master KH</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading PDF/ZIP Indicator */}
      {(isExportingPDF || isExportingZip) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-10 text-center shadow-2xl animate-fadeIn max-w-xs w-full">
            <div className="w-16 h-16 border-4 border-maroon border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-black heading-kh text-maroon">
              {isExportingZip ? `កំពុងរៀបចំរូបភាព ZIP...` : `កំពុងរៀបចំឯកសារ PDF...`}
            </h3>
            {isExportingZip && (
              <div className="mt-4">
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-maroon h-full transition-all duration-300" style={{ width: `${(zipProgress.current / zipProgress.total) * 100}%` }}></div>
                </div>
                <p className="text-[10px] font-bold text-maroon mt-2">រៀបចំបាន {toKhmerNumeral(zipProgress.current)} / {toKhmerNumeral(zipProgress.total)} រូបភាព</p>
              </div>
            )}
            <p className="text-[10px] small-kh text-gray-500 mt-4 leading-relaxed">សូមកុំបិទផ្ទាំងនេះ រហូតដល់ដំណើរការចប់សព្វគ្រប់!</p>
          </div>
        </div>
      )}

      {/* Main UI Tabs */}
      <div className="glass-card rounded-[2.5rem] shadow-xl p-8 border border-white/50">
        <div className="flex border-b border-gray-100 mb-8 -mx-8 px-8 overflow-x-auto custom-scrollbar">
          <button onClick={() => setEntryMode('single')} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 ${entryMode === 'single' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>✍️ បញ្ចូលសំណួរ</button>
          <button onClick={() => setEntryMode('bulk')} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 ${entryMode === 'bulk' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>🚀 បញ្ចូលទាំងអស់</button>
          <button onClick={() => setEntryMode('subjects')} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 ${entryMode === 'subjects' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>📚 គ្រប់គ្រងទិន្នន័យ</button>
        </div>
        
        {entryMode === 'single' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <h2 className="text-xl font-black heading-kh text-maroon flex items-center gap-2"><span>{editingIndex !== null ? '✏️' : '🆕'}</span>{editingIndex !== null ? 'កែសម្រួលសំណួរ' : 'បង្កើតសំណួរថ្មី'}</h2>
              <div className="flex bg-gray-100 p-1 rounded-xl"><button onClick={() => setQType('mcq')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${qType === 'mcq' ? 'bg-white text-maroon shadow-sm' : 'text-gray-400'}`}>QCM</button><button onClick={() => setQType('short')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${qType === 'short' ? 'bg-white text-maroon shadow-sm' : 'text-gray-400'}`}>Q & A</button></div>
            </div>
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">ឈ្មោះមុខវិជ្ជា</label><input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh bg-gray-50/50 text-maroon font-bold" placeholder="ឧទាហរណ៍៖ សេដ្ឋកិច្ច" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">អត្ថបទសំណួរ</label><textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-maroon outline-none min-h-[100px] small-kh bg-gray-50/50" placeholder="សរសេរសំណួរ..." /></div>
              {qType === 'mcq' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all focus-within:border-maroon/30">
                      <span className="font-black text-maroon w-10 h-10 flex items-center justify-center bg-maroon/5 rounded-xl">{KHMER_PREFIXES[i]}</span>
                      <input type="text" value={opt} onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} className="flex-1 outline-none small-kh py-1 text-sm" placeholder={`ចម្លើយទី ${i+1}`} />
                      <label className="relative flex items-center cursor-pointer">
                        <input type="radio" checked={correct === i} onChange={() => setCorrect(i)} className="hidden peer" />
                        <div className="w-8 h-8 border-2 border-gray-200 rounded-xl peer-checked:bg-green-500 peer-checked:border-green-500 text-white flex items-center justify-center">✓</div>
                      </label>
                    </div>
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
            <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} className="w-full px-5 py-5 rounded-[2rem] border border-gray-100 min-h-[300px] small-kh text-xs bg-gray-50/50 outline-none focus:ring-2 focus:ring-maroon" placeholder={bulkType === 'mcq' ? "ចម្លងកម្រងសំណួរពហុចម្លើយដាក់ទីនេះ..." : "ចម្លងកម្រងសំណួរចម្លើយខ្លីៗដាក់ទីនេះ..."} />
            <button onClick={handleBulkSubmit} className="w-full bg-maroon text-white font-black py-5 rounded-[2rem] shadow-xl hover:brightness-110 transition-all heading-kh text-lg">ចាប់ផ្ដើមបញ្ចូលទិន្នន័យ</button>
          </div>
        )}

        {entryMode === 'subjects' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="bg-maroon/5 p-8 rounded-[2rem] border border-maroon/10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left"><h3 className="text-lg font-black heading-kh text-maroon mb-1">រក្សាទុកទិន្នន័យ (Backup)</h3><p className="text-xs small-kh text-gray-500">អ្នកអាចទាញយក ឬបញ្ចូលសំណួរទាំងអស់ជាហ្វាយ JSON</p></div>
              <div className="flex gap-4"><button onClick={handleExportData} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md hover:bg-blue-700 transition-all">📥 ទាញយក Backup</button><label className="px-6 py-3 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md hover:bg-orange-700 transition-all cursor-pointer">📤 បញ្ចូល Backup<input type="file" accept=".json" onChange={handleImportData} className="hidden" /></label></div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-l-4 border-blue-500 pl-4"><h2 className="text-xl font-black heading-kh text-blue-800">🔘 ផ្នែកសំណួរពហុចម្លើយ</h2><span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{groupedSubjects.mcq.length} មុខវិជ្ជា</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groupedSubjects.mcq.map((sub, i) => (
                  <SubjectCard key={`mcq-${i}`} sub={sub} isFirst={i === 0} isLast={i === groupedSubjects.mcq.length - 1} onToggleSubject={onToggleSubject} onUpdateSubject={(name, type) => { onUpdateSubject(name, type, name); }} onRemoveSubject={onRemoveSubject} onReorderSubject={onReorderSubject} onOpenPdfSettings={handleOpenPdfSettings} onOpenImageSettings={handleOpenImageSettings} />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-l-4 border-orange-500 pl-4"><h2 className="text-xl font-black heading-kh text-orange-800">✍️ ផ្នែកសំណួរចម្លើយខ្លីៗ</h2><span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black">{groupedSubjects.short.length} មុខវិជ្ជា</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groupedSubjects.short.map((sub, i) => (
                  <SubjectCard key={`short-${i}`} sub={sub} isFirst={i === 0} isLast={i === groupedSubjects.short.length - 1} onToggleSubject={onToggleSubject} onUpdateSubject={(name, type) => { onUpdateSubject(name, type, name); }} onRemoveSubject={onRemoveSubject} onReorderSubject={onReorderSubject} onOpenPdfSettings={handleOpenPdfSettings} onOpenImageSettings={handleOpenImageSettings} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* List section */}
      <div className="glass-card rounded-[2.5rem] shadow-lg p-8 border border-white/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"><h3 className="text-lg font-black heading-kh text-maroon">📚 បញ្ជីសំណួរទាំងអស់ ({quizData.length})</h3><div className="relative w-full md:w-64"><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ស្វែងរក..." className="w-full px-6 py-3 rounded-full border border-gray-100 outline-none small-kh text-sm focus:ring-2 focus:ring-maroon" /><span className="absolute right-4 top-3 opacity-30">🔍</span></div></div>
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredQuestions.length > 0 ? filteredQuestions.map((item) => (
            <div key={item.originalIndex} className={`p-5 rounded-3xl border flex justify-between items-center transition-all ${item.isActive === false ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-50 shadow-sm hover:shadow-md'}`}>
              <div className="truncate flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1 flex-wrap"><span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${item.isActive === false ? 'bg-gray-200 text-gray-500' : 'bg-maroon text-white'}`}>{item.subject}</span><span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${item.type === 'mcq' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{item.type === 'mcq' ? 'QCM' : 'Q & A'}</span></div>
                <p className="text-xs font-bold text-gray-700 truncate small-kh">{item.question}</p>
              </div>
              <div className="flex gap-2">
                <button title="ទាញយករូបភាព" disabled={isExporting} onClick={() => handleDownloadSingleImage(item)} className="p-3 bg-indigo-50 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-colors">🖼️</button>
                <button title={item.isActive === false ? "បើកសំណួរ" : "បិទសំណួរ"} onClick={() => onUpdate(item.originalIndex, { ...item, isActive: item.isActive === false })} className={`p-3 rounded-xl transition-colors ${item.isActive === false ? 'bg-green-50 text-green-500 hover:bg-green-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{item.isActive === false ? '🔓' : '🔒'}</button>
                <button onClick={() => { setQType(item.type); setSubject(item.subject); setQuestion(item.question); if (item.type === 'mcq') { setOptions(item.options || []); setCorrect(item.correct || 0); } else setShortAnswer(item.answer || ''); setEditingIndex(item.originalIndex); setEntryMode('single'); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-3 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-100 transition-colors">✏️</button>
                <button onClick={() => { if(confirm("តើអ្នកប្រាកដថាចង់លុបសំណួរនេះ?")) onRemove(item.originalIndex); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">🗑️</button>
              </div>
            </div>
          )) : (<div className="text-center py-10 text-gray-400 small-kh italic">មិនមានទិន្នន័យស្វែងរកឡើយ</div>)}
        </div>
      </div>
    </div>
  );
};

export default CreateSection;
