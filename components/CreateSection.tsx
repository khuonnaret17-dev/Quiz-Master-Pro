
import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Question, TelegramConfig } from '../types';
import { DEFAULT_TG_BOT_TOKEN, TG_CHANNELS, ADMIN_CONTACTS } from '../constants';
import html2canvas from 'html2canvas';
import { validateBot, sendQuizPoll, sendTestMessage, sendQuestionImage } from '../services/telegramService';

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
  onEditSubject: (subject: string, type: 'mcq' | 'short') => void;
  onRemoveSubject: (subject: string, type: 'mcq' | 'short') => void;
  onReorderSubject: (subject: string, type: 'mcq' | 'short', direction: 'up' | 'down') => void;
  onOpenPdfSettings: (name: string, type: 'mcq' | 'short') => void;
  onOpenImageSettings: (name: string, type: 'mcq' | 'short') => void;
  onViewQuestions: (name: string, type: 'mcq' | 'short') => void;
}> = ({ sub, isFirst, isLast, onToggleSubject, onEditSubject, onRemoveSubject, onReorderSubject, onOpenPdfSettings, onOpenImageSettings, onViewQuestions }) => (
  <div className={`p-6 rounded-[2rem] border transition-all flex flex-col justify-between ${sub.isActive ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-100 border-gray-200 grayscale opacity-60'}`}>
    <div>
      <div className="flex justify-between items-start mb-4">
        <div className="truncate pr-2 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-black heading-kh text-maroon truncate max-w-[150px] cursor-pointer hover:underline" onClick={() => onViewQuestions(sub.name, sub.type)}>{sub.name}</h3>
            <button 
              onClick={() => onEditSubject(sub.name, sub.type)} 
              className="text-xs p-1.5 bg-maroon/5 text-maroon rounded-lg hover:bg-maroon hover:text-white transition-all shadow-sm" 
              title="កែសម្រួលឈ្មោះមុខវិជ្ជា"
            >
              ✏️
            </button>
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
      <button 
        onClick={() => onViewQuestions(sub.name, sub.type)} 
        className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
      >
        👁️ មើលសំណួរ & ផ្ញើចេញ
      </button>
      <div className="flex gap-2">
        <button onClick={() => onToggleSubject(sub.name, sub.type, !sub.isActive)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${sub.isActive ? 'bg-maroon/5 text-maroon hover:bg-maroon hover:text-white' : 'bg-green-500 text-white hover:brightness-110'}`}>{sub.isActive ? '❌ បិទ' : '✅ បើក'}</button>
        <button onClick={() => onRemoveSubject(sub.name, sub.type)} className="px-4 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
      </div>
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
  
  // New state to focus on a subject's questions
  const [viewingSubjectQuestions, setViewingSubjectQuestions] = useState<{name: string, type: 'mcq' | 'short'} | null>(null);

  // Telegram Bot States
  const [tgConfig, setTgConfig] = useState<TelegramConfig>({ 
    botToken: DEFAULT_TG_BOT_TOKEN, 
    chatId: TG_CHANNELS[0].value 
  });
  const [isSendingToTg, setIsSendingToTg] = useState<number | null>(null);
  const [isSendingImageToTg, setIsSendingImageToTg] = useState<number | null>(null);
  const [isTestingTg, setIsTestingTg] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('tg_config');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        setTgConfig({ 
          botToken: DEFAULT_TG_BOT_TOKEN, 
          chatId: parsed.chatId || TG_CHANNELS[0].value 
        });
      } catch (e) {}
    }
  }, []);

  const saveTgConfig = (cfg: TelegramConfig) => {
    setTgConfig(cfg);
    localStorage.setItem('tg_config', JSON.stringify(cfg));
  };

  const handleTestTg = async () => {
    if (!tgConfig.botToken) return alert("សូមបញ្ចូល Bot Token!");
    setIsTestingTg(true);
    const botInfo = await validateBot(tgConfig.botToken);
    if (!botInfo.ok) {
      alert(`Bot Token មិនត្រឹមត្រូវ៖ ${botInfo.error}`);
      setIsTestingTg(false);
      return;
    }
    
    if (tgConfig.chatId) {
      const msgResult = await sendTestMessage(tgConfig);
      if (msgResult.ok) alert(`ជោគជ័យ! Bot ឈ្មោះ "${botInfo.name}" បានផ្ញើសារសាកល្បងទៅកាន់ Channel "${tgConfig.chatId}" រួចរាល់។`);
      else alert(`Bot Token ត្រូវ ប៉ុន្តែផ្ញើសារមិនចេញ៖ ${msgResult.error}`);
    } else {
      alert(`Bot Token ត្រឹមត្រូវ (ឈ្មោះ៖ ${botInfo.name})! សូមជ្រើសរើស Channel ដើម្បីតេស្តការផ្ញើសារ។`);
    }
    setIsTestingTg(false);
  };

  const handleSendToTelegram = async (q: Question, index: number) => {
    if (!tgConfig.botToken || !tgConfig.chatId) return alert("សូមរៀបចំ Telegram ក្នុងផ្នែក 'គ្រប់គ្រងទិន្នន័យ' ជាមុនសិន!");
    setIsSendingToTg(index);
    const result = await sendQuizPoll(tgConfig, q);
    if (result.ok) alert("សំណួរត្រូវបានផ្ញើទៅ Telegram រួចរាល់!");
    else alert(`ការផ្ញើបរាជ័យ៖ ${result.error}`);
    setIsSendingToTg(null);
  };

  const handleSendImageToTelegram = async (q: Question, index: number) => {
    if (!tgConfig.botToken || !tgConfig.chatId) return alert("សូមរៀបចំ Telegram ក្នុងផ្នែក 'គ្រប់គ្រងទិន្នន័យ' ជាមុនសិន!");
    
    setIsSendingImageToTg(index);
    setExportQuestion(q);
    setIsExporting(true);

    setTimeout(async () => {
      if (exportRef.current) {
        try {
          const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
          
          canvas.toBlob(async (blob) => {
            if (blob) {
              const caption = `❓ សំណួរ៖ ${q.question}\n\n📲កម្មវិធីត្រៀមប្រឡងក្របខ័ណ្ឌ https://t.me/qiuzs_bot\n━━✥━━✥◈✥━━✥━━\nTelegram Channel​ : 👇🏻\n🔗 https://t.me/khmerfamilyoflaw\n🔗 https://t.me/Naret26\nTelegram Group : 👇🏻\n🔗 https://t.me/familyoflaw\n🔗 https://t.me/theAdvisor26`;
              const result = await sendQuestionImage(tgConfig, blob, caption);
              
              if (result.ok) alert("រូបភាពត្រូវបានផ្ញើទៅ Telegram រួចរាល់!");
              else alert(`ការផ្ញើរូបភាពបរាជ័យ៖ ${result.error}`);
            }
            setIsSendingImageToTg(null);
            setIsExporting(false);
            setExportQuestion(null);
          }, 'image/png');
        } catch (err) {
          console.error(err);
          alert("មានបញ្ហាក្នុងការបង្កើតរូបភាព!");
          setIsSendingImageToTg(null);
          setIsExporting(false);
          setExportQuestion(null);
        }
      }
    }, 500);
  };

  // Modal and Settings States
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<{ name: string, type: 'mcq' | 'short' } | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPdfInfo, setSelectedPdfInfo] = useState<{name: string, type: 'mcq' | 'short'} | null>(null);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings>({
    showAnswerKey: true,
    shuffleQuestions: true,
    schoolName: 'សាលាភូមិន្ទរដ្ឋបាល',
    examDate: new Date().toLocaleDateString('km-KH')
  });

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
        if (viewingSubjectQuestions) {
          return item.subject === viewingSubjectQuestions.name && item.type === viewingSubjectQuestions.type;
        }
        return item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
               item.subject.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [quizData, searchQuery, viewingSubjectQuestions]);

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

  const handleEditSubjectTrigger = (name: string, type: 'mcq' | 'short') => {
    setSubjectToEdit({ name, type });
    setNewSubjectName(name);
    setShowEditSubjectModal(true);
  };

  const handleSaveSubjectName = () => {
    if (subjectToEdit && newSubjectName.trim() && newSubjectName.trim() !== subjectToEdit.name) {
      onUpdateSubject(subjectToEdit.name, subjectToEdit.type, newSubjectName.trim());
    }
    setShowEditSubjectModal(false);
    setSubjectToEdit(null);
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
        const newCorrectIndex = (shuffledOptions as any[]).findIndex((o: any) => o.isCorrect);
        return { ...q, options: (shuffledOptions as any[]).map((o: any) => o.text), correct: newCorrectIndex };
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
    
    const zip = new JSZip();
    const folderName = `Quiz_Images_${name.replace(/\s+/g, '_')}_${type.toUpperCase()}`;
    const folder = zip.folder(folderName);
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      setZipProgress({ current: i + 1, total: questions.length });
      
      let processedQ = { ...q };
      if (q.type === 'mcq' && q.options) {
        const optionsWithMeta = q.options.map((opt, oIdx) => ({ text: opt, isCorrect: oIdx === q.correct }));
        const shuffledOptions = shuffleArray(optionsWithMeta);
        const newCorrectIndex = (shuffledOptions as any[]).findIndex((o: any) => o.isCorrect);
        processedQ.options = (shuffledOptions as any[]).map((o: any) => o.text);
        processedQ.correct = newCorrectIndex;
      }

      setExportQuestion(processedQ);
      setIsExporting(true);
      
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
          folder.file(`Question_${i + 1}.png`, base64Data, { base64: true });
        } catch (err) { 
          console.error("Error capturing question:", i, err); 
        }
      }
    }
    
    try {
      const content = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Quiz_Pack_${name.replace(/\s+/g, '_')}_${type.toUpperCase()}_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      
    } catch (err) { 
      console.error("ZIP Generation Error:", err);
      alert("មានបញ្ហាក្នុងការបង្កើត ZIP!"); 
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
      {/* Subject Edit Modal */}
      {showEditSubjectModal && subjectToEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border-2 border-white animate-fadeIn">
            <h3 className="text-xl font-black heading-kh text-maroon mb-6 flex items-center gap-2">✏️ កែសម្រួលឈ្មោះមុខវិជ្ជា</h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">ឈ្មោះមុខវិជ្ជាថ្មី</label>
                <input type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} className="w-full px-5 py-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh" placeholder="បញ្ចូលឈ្មោះថ្មី..." />
              </div>
              <div className="flex gap-3 pt-6">
                <button onClick={() => setShowEditSubjectModal(false)} className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-bold small-kh hover:bg-gray-200">បោះបង់</button>
                <button onClick={handleSaveSubjectName} className="flex-2 px-8 py-4 rounded-2xl bg-maroon text-white font-black heading-kh shadow-lg hover:brightness-110">រក្សាទុក</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Settings Modal */}
      {showPdfModal && selectedPdfInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border-2 border-white animate-fadeIn">
            <h3 className="text-xl font-black heading-kh text-maroon mb-6 flex items-center gap-2">⚙️ កំណត់សម្គាល់ PDF</h3>
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
            <h3 className="text-xl font-black heading-kh text-maroon mb-6 flex items-center gap-2">🖼️ កំណត់រចនាប័ទ្មរូបភាព</h3>
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
                    <button key={style.id} onClick={() => setImageSettings(prev => ({ ...prev, style: style.id as any }))} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${imageSettings.style === style.id ? 'border-maroon ring-4 ring-maroon/10 scale-105 bg-white shadow-lg' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
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
                    <input type="text" value={imageSettings.schoolName} onChange={e => setImageSettings(prev => ({...prev, schoolName: e.target.value}))} className="flex-1 px-5 py-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh text-sm" />
                    <button onClick={() => setImageSettings(prev => ({...prev, showSchoolName: !prev.showSchoolName}))} className={`px-4 rounded-xl font-bold text-xs ${imageSettings.showSchoolName ? 'bg-maroon text-white' : 'bg-gray-100 text-gray-400'}`}>{imageSettings.showSchoolName ? 'បើក' : 'បិទ'}</button>
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

      {/* Hidden PDF and Export Components */}
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
                        <div key={idx} className="flex gap-5 items-start text-[12pt] leading-[1.8]">
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
                      {(Array.from({ length: Math.ceil(pdfSubjectData.questions.length / 2) }) as any[]).map((_, i) => {
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
                <div className="mt-20 text-center italic text-gray-500 text-[10pt]">--- រៀបរៀងដោយ Quiz Master KH - រក្សាសិទ្ធិគ្រប់យ៉ាង ---</div>
              </div>
            )}
          </div>
        </div>
      )}

      {isExporting && exportQuestion && (
        <div className="fixed -left-[2000px] top-0">
          <div ref={exportRef} className={`w-[800px] p-12 rounded-[4rem] relative overflow-hidden transition-all duration-300 shadow-2xl ${imageSettings.style === 'dark' ? 'bg-[#1a1a1a] text-white border-[16px] border-[#2a2a2a]' : imageSettings.style === 'classic' ? 'bg-[#fffdf5] text-[#3e2723] border-[16px] border-[#8d6e63]' : imageSettings.style === 'clean' ? 'bg-white text-gray-800 border-[16px] border-gray-100' : 'bg-white text-gray-800 border-[16px] border-maroon'}`}>
            <div className={`flex justify-between items-center mb-10 pb-6 border-b-4 border-dashed ${imageSettings.style === 'dark' ? 'border-white/10' : imageSettings.style === 'classic' ? 'border-[#8d6e63]/20' : 'border-maroon/20'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${imageSettings.style === 'dark' ? 'bg-white text-black' : 'bg-maroon text-white'}`}>🇰🇭</div>
                <div>
                  <h1 className={`text-3xl font-black heading-kh ${imageSettings.style === 'dark' ? 'text-white' : imageSettings.style === 'classic' ? 'text-[#3e2723]' : 'text-maroon'}`}>{imageSettings.schoolName}</h1>
                  <p className="text-sm font-bold text-gray-400">Khmer Educational Quiz</p>
                </div>
              </div>
              <div className="text-right"><span className={`text-sm font-black px-5 py-2 rounded-full uppercase shadow-sm ${imageSettings.style === 'dark' ? 'bg-white/10 text-white' : 'bg-maroon text-white'}`}>{exportQuestion.subject}</span></div>
            </div>
            <div className="mb-12"><h2 className={`text-4xl font-black heading-kh leading-[1.6] ${imageSettings.style === 'dark' ? 'text-white' : imageSettings.style === 'classic' ? 'text-[#3e2723]' : 'text-maroon'}`}>{exportQuestion.question}</h2></div>
            {exportQuestion.type === 'mcq' ? (
              <div className="grid grid-cols-1 gap-4">
                {exportQuestion.options?.map((opt, i) => (
                  <div key={i} className={`flex items-center gap-6 p-6 rounded-3xl border-4 transition-all ${i === exportQuestion.correct ? (imageSettings.style === 'dark' ? 'bg-green-900/30 border-green-500' : 'bg-green-50 border-green-500') : (imageSettings.style === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-transparent')}`}>
                    <span className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-md ${i === exportQuestion.correct ? 'bg-green-500 text-white' : 'bg-white text-maroon'}`}>{KHMER_PREFIXES[i]}</span>
                    <span className={`text-2xl font-bold small-kh ${i === exportQuestion.correct ? 'text-green-800' : 'text-gray-600'}`}>{opt}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-r-[3rem] p-10 border-l-[12px] bg-green-50 border-green-500">
                <p className="text-3xl font-bold small-kh leading-relaxed whitespace-pre-wrap">{exportQuestion.answer}</p>
              </div>
            )}
            {imageSettings.showWatermark && <div className="mt-12 flex justify-center opacity-30"><p className="text-xs font-black tracking-[10px] uppercase">Quiz Master KH</p></div>}
          </div>
        </div>
      )}

      {/* Entry UI Tabs */}
      <div className="glass-card rounded-[2.5rem] shadow-xl p-8 border border-white/50">
        <div className="flex border-b border-gray-100 mb-8 -mx-8 px-8 overflow-x-auto custom-scrollbar">
          <button onClick={() => { setEntryMode('single'); setViewingSubjectQuestions(null); }} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 ${entryMode === 'single' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>✍️ បញ្ចូលសំណួរ</button>
          <button onClick={() => { setEntryMode('bulk'); setViewingSubjectQuestions(null); }} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 ${entryMode === 'bulk' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>🚀 បញ្ចូលទាំងអស់</button>
          <button onClick={() => setEntryMode('subjects')} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 ${entryMode === 'subjects' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>📚 គ្រប់គ្រងទិន្នន័យ</button>
        </div>
        
        {entryMode === 'single' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <h2 className="text-xl font-black heading-kh text-maroon flex items-center gap-2"><span>{editingIndex !== null ? '✏️' : '🆕'}</span>{editingIndex !== null ? 'កែសម្រួលសំណួរ' : 'បង្កើតសំណួរថ្មី'}</h2>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setQType('mcq')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${qType === 'mcq' ? 'bg-white text-maroon shadow-sm' : 'text-gray-400'}`}>QCM</button>
                <button onClick={() => setQType('short')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${qType === 'short' ? 'bg-white text-maroon shadow-sm' : 'text-gray-400'}`}>Q & A</button>
              </div>
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
            {/* Subject Questions Focused View Header */}
            {viewingSubjectQuestions && (
              <div className="bg-white p-6 rounded-[2rem] border-2 border-blue-100 shadow-md animate-fadeIn flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => setViewingSubjectQuestions(null)} className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">←</button>
                  <div>
                    <h3 className="text-xl font-black heading-kh text-blue-800 leading-tight">វិញ្ញាសា៖ {viewingSubjectQuestions.name}</h3>
                    <p className="text-[10px] font-black text-blue-400 uppercase">បញ្ជីសំណួរសម្រាប់ផ្ញើចេញ ({filteredQuestions.length} សំណួរ)</p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${viewingSubjectQuestions.type === 'mcq' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'}`}>
                    {viewingSubjectQuestions.type === 'mcq' ? 'ពហុចម្លើយ' : 'សំណួរ-ចម្លើយ'}
                  </span>
                </div>
              </div>
            )}

            {!viewingSubjectQuestions && (
              <>
                <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-lg">
                  <h3 className="text-xl font-black heading-kh text-indigo-900 mb-2 flex items-center gap-2">✈️ ការកំណត់ Telegram Bot</h3>
                  <p className="text-xs small-kh text-indigo-600/70 mb-6">ភ្ជាប់កម្មវិធីទៅកាន់ Telegram Channel ដើម្បីផ្ញើសំណួរ QCM ដោយស្វ័យប្រវត្តិ។</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Bot API Token (Default)</label>
                      <input type="password" readOnly value={tgConfig.botToken} className="w-full px-6 py-3 rounded-xl border border-gray-100 outline-none bg-gray-100 text-xs shadow-inner opacity-60" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Channel Chat ID</label>
                      <select value={tgConfig.chatId} onChange={(e) => saveTgConfig({ ...tgConfig, chatId: e.target.value })} className="w-full px-6 py-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-xs shadow-md font-bold small-kh">
                        {TG_CHANNELS.map((chan, idx) => (
                          <option key={idx} value={chan.value}>{chan.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-indigo-100 pt-6">
                    <div className="text-[10px] small-kh text-indigo-400 italic">* Token ត្រូវបានកំណត់ជាអចិន្ត្រៃយ៍។ សូមជ្រើសរើស Channel ដើម្បីផ្ញើសំណួរ Tune In។</div>
                    <button onClick={handleTestTg} disabled={isTestingTg} className={`px-8 py-3 rounded-xl font-black text-xs transition-all shadow-md flex items-center gap-2 ${isTestingTg ? 'bg-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                      {isTestingTg ? "កំពុងតេស្ត..." : "តេស្តសាកល្បង Bot 🧪"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-maroon/5 p-8 rounded-[2rem] border border-maroon/10 flex flex-col justify-between gap-6">
                    <div className="text-center md:text-left"><h3 className="text-lg font-black heading-kh text-maroon mb-1">រក្សាទុកទិន្នន័យ (Backup)</h3><p className="text-xs small-kh text-gray-500">អ្នកអាចទាញយក ឬបញ្ចូលសំណួរទាំងអស់ជាហ្វាយ JSON</p></div>
                    <div className="flex gap-4 flex-wrap"><button onClick={handleExportData} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md hover:bg-blue-700 transition-all">📥 ទាញយក Backup</button><label className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md hover:bg-orange-700 transition-all cursor-pointer text-center">📤 បញ្ចូល Backup<input type="file" accept=".json" onChange={handleImportData} className="hidden" /></label></div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-blue-500 pl-4"><h2 className="text-xl font-black heading-kh text-blue-800">🔘 ផ្នែកសំណួរពហុចម្លើយ</h2><span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{groupedSubjects.mcq.length} មុខវិជ្ជា</span></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {groupedSubjects.mcq.map((sub, i) => (
                      <SubjectCard key={`mcq-${i}`} sub={sub} isFirst={i === 0} isLast={i === groupedSubjects.mcq.length - 1} onToggleSubject={onToggleSubject} onEditSubject={handleEditSubjectTrigger} onRemoveSubject={onRemoveSubject} onReorderSubject={onReorderSubject} onOpenPdfSettings={handleOpenPdfSettings} onOpenImageSettings={handleOpenImageSettings} onViewQuestions={(name, type) => setViewingSubjectQuestions({name, type})} />
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-orange-500 pl-4"><h2 className="text-xl font-black heading-kh text-orange-800">✍️ ផ្នែកសំណួរចម្លើយខ្លីៗ</h2><span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black">{groupedSubjects.short.length} មុខវិជ្ជា</span></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {groupedSubjects.short.map((sub, i) => (
                      <SubjectCard key={`short-${i}`} sub={sub} isFirst={i === 0} isLast={i === groupedSubjects.short.length - 1} onToggleSubject={onToggleSubject} onEditSubject={handleEditSubjectTrigger} onRemoveSubject={onRemoveSubject} onReorderSubject={onReorderSubject} onOpenPdfSettings={handleOpenPdfSettings} onOpenImageSettings={handleOpenImageSettings} onViewQuestions={(name, type) => setViewingSubjectQuestions({name, type})} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* List section focused on a subject's questions */}
            {viewingSubjectQuestions && (
              <div className="animate-fadeIn space-y-4">
                <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredQuestions.length > 0 ? filteredQuestions.map((item) => (
                    <div key={item.originalIndex} className={`p-5 rounded-3xl border flex justify-between items-center transition-all ${item.isActive === false ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-50 shadow-sm hover:shadow-md'}`}>
                      <div className="truncate flex-1 pr-4">
                        <p className="text-sm font-bold text-gray-700 line-clamp-2 small-kh">{item.question}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <div className="flex gap-1">
                          {item.type === 'mcq' && (
                            <button title="ផ្ញើជា Poll ទៅ Telegram" disabled={isSendingToTg !== null || isSendingImageToTg !== null} onClick={() => handleSendToTelegram(item, item.originalIndex)} className={`p-3 rounded-xl transition-all shadow-md ${isSendingToTg === item.originalIndex ? 'bg-blue-100 animate-pulse' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}>
                              {isSendingToTg === item.originalIndex ? '⏳' : '✈️'}
                            </button>
                          )}
                          <button title="ផ្ញើជារូបភាពទៅ Telegram" disabled={isSendingToTg !== null || isSendingImageToTg !== null} onClick={() => handleSendImageToTelegram(item, item.originalIndex)} className={`p-3 rounded-xl transition-all shadow-md ${isSendingImageToTg === item.originalIndex ? 'bg-indigo-100 animate-pulse' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}>
                            {isSendingImageToTg === item.originalIndex ? '⏳' : '📸✈️'}
                          </button>
                        </div>
                        <button title="ទាញយករូបភាព" disabled={isExporting} onClick={() => handleDownloadSingleImage(item)} className="p-3 bg-indigo-50 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-colors">🖼️</button>
                        <button onClick={() => { setQType(item.type); setSubject(item.subject); setQuestion(item.question); if (item.type === 'mcq') { setOptions(item.options || []); setCorrect(item.correct || 0); } else setShortAnswer(item.answer || ''); setEditingIndex(item.originalIndex); setEntryMode('single'); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-3 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-100 transition-colors">✏️</button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                      <p className="text-gray-400 small-kh italic">មិនទាន់មានសំណួរក្នុងមុខវិជ្ជានេះឡើយ</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-center pt-4">
                  <button onClick={() => setViewingSubjectQuestions(null)} className="px-10 py-4 bg-maroon text-white font-black rounded-full shadow-lg hover:brightness-110 transition-all heading-kh">ត្រឡប់ទៅមើលមុខវិជ្ជាវិញ</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* General List section (Shown when not in focus mode) */}
      {!viewingSubjectQuestions && entryMode !== 'subjects' && (
        <div className="glass-card rounded-[2.5rem] shadow-lg p-8 border border-white/50 mt-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-black heading-kh text-maroon">📚 បញ្ជីសំណួរទាំងអស់ ({quizData.length})</h3>
            <div className="relative w-full md:w-64">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ស្វែងរក..." className="w-full px-6 py-3 rounded-full border border-gray-100 outline-none small-kh text-sm focus:ring-2 focus:ring-maroon" />
              <span className="absolute right-4 top-3 opacity-30">🔍</span>
            </div>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredQuestions.length > 0 ? filteredQuestions.map((item) => (
              <div key={item.originalIndex} className={`p-5 rounded-3xl border flex justify-between items-center transition-all ${item.isActive === false ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-50 shadow-sm hover:shadow-md'}`}>
                <div className="truncate flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${item.isActive === false ? 'bg-gray-200 text-gray-500' : 'bg-maroon text-white'}`}>{item.subject}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${item.type === 'mcq' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{item.type === 'mcq' ? 'QCM' : 'Q & A'}</span>
                  </div>
                  <p className="text-xs font-bold text-gray-700 truncate small-kh">{item.question}</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex gap-1">
                    {item.type === 'mcq' && (
                      <button title="ផ្ញើជា Poll (QCM)ទៅ Telegram" disabled={isSendingToTg !== null || isSendingImageToTg !== null} onClick={() => handleSendToTelegram(item, item.originalIndex)} className={`p-3 rounded-xl transition-all shadow-md ${isSendingToTg === item.originalIndex ? 'bg-blue-100 animate-pulse' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}>
                        {isSendingToTg === item.originalIndex ? '⏳' : '✈️'}
                      </button>
                    )}
                    <button title={`ផ្ញើជារូបភាព (${item.type === 'mcq' ? 'QCM' : 'Q&A'}) ទៅ Telegram`} disabled={isSendingToTg !== null || isSendingImageToTg !== null} onClick={() => handleSendImageToTelegram(item, item.originalIndex)} className={`p-3 rounded-xl transition-all shadow-md ${isSendingImageToTg === item.originalIndex ? 'bg-indigo-100 animate-pulse' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}>
                      {isSendingImageToTg === item.originalIndex ? '⏳' : '📸✈️'}
                    </button>
                  </div>
                  <button title="ទាញយករូបភាព" disabled={isExporting} onClick={() => handleDownloadSingleImage(item)} className="p-3 bg-indigo-50 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-colors">🖼️</button>
                  <button title={item.isActive === false ? "បើកសំណួរ" : "បិទសំណួរ"} onClick={() => onUpdate(item.originalIndex, { ...item, isActive: item.isActive === false })} className={`p-3 rounded-xl transition-colors ${item.isActive === false ? 'bg-green-50 text-green-500 hover:bg-green-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{item.isActive === false ? '🔓' : '🔒'}</button>
                  <button onClick={() => { setQType(item.type); setSubject(item.subject); setQuestion(item.question); if (item.type === 'mcq') { setOptions(item.options || []); setCorrect(item.correct || 0); } else setShortAnswer(item.answer || ''); setEditingIndex(item.originalIndex); setEntryMode('single'); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-3 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-100 transition-colors">✏️</button>
                  <button onClick={() => { if(confirm("តើអ្នកប្រាកដថាចង់លុបសំណួរនេះ?")) onRemove(item.originalIndex); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">🗑️</button>
                </div>
              </div>
            )) : (<div className="text-center py-10 text-gray-400 small-kh italic">មិនមានទិន្នន័យស្វែងរកឡើយ</div>)}
          </div>
        </div>
      )}

      {/* Footer Contact for Admins */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <p className="text-[10px] font-black uppercase text-gray-400">ជំនួយបច្ចេកទេស ៖</p>
        <div className="flex gap-4">
          <a href={ADMIN_CONTACTS.admin1} target="_blank" className="text-[10px] font-bold text-blue-600 underline small-kh animate-breathing">អ្នកគ្រប់គ្រង</a>
          <a href={ADMIN_CONTACTS.admin2} target="_blank" className="text-[10px] font-bold text-blue-500 underline small-kh animate-breathing" style={{ animationDelay: '1s' }}>Master Quiz KH</a>
        </div>
      </div>
    </div>
  );
};

export default CreateSection;
