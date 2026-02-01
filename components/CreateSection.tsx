
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

const SubjectCard: React.FC<{
  sub: { name: string, isActive: boolean, count: number, type: 'mcq' | 'short' };
  isFirst: boolean;
  isLast: boolean;
  onToggleSubject: (subject: string, type: 'mcq' | 'short', active: boolean) => void;
  onUpdateSubject: (subject: string, type: 'mcq' | 'short') => void;
  onRemoveSubject: (subject: string, type: 'mcq' | 'short') => void;
  onReorderSubject: (subject: string, type: 'mcq' | 'short', direction: 'up' | 'down') => void;
  onDownloadPDF: (name: string, type: 'mcq' | 'short') => void;
  onDownloadZip: (name: string, type: 'mcq' | 'short') => void;
}> = ({ sub, isFirst, isLast, onToggleSubject, onUpdateSubject, onRemoveSubject, onReorderSubject, onDownloadPDF, onDownloadZip }) => (
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
              <button onClick={() => onDownloadPDF(sub.name, sub.type)} className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-600 hover:text-white transition-all shadow-sm">📄 PDF</button>
              <button onClick={() => onDownloadZip(sub.name, sub.type)} className="text-[9px] font-black bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full hover:bg-orange-600 hover:text-white transition-all shadow-sm">🖼️ ZIP</button>
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
  
  const exportRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [exportQuestion, setExportQuestion] = useState<Question | null>(null);
  const [pdfSubjectData, setPdfSubjectData] = useState<{name: string, type: string, questions: Question[]} | null>(null);

  // States for renaming subject modal
  const [renamingSubject, setRenamingSubject] = useState<{ name: string, type: 'mcq' | 'short' } | null>(null);
  const [newNameInput, setNewNameInput] = useState('');

  const handleSaveSubjectName = () => {
    if (renamingSubject && newNameInput.trim()) {
      onUpdateSubject(renamingSubject.name, renamingSubject.type, newNameInput.trim());
      setRenamingSubject(null);
      setNewNameInput('');
    }
  };

  const toKhmerNumeral = (n: number) => {
    return n.toString().split('').map(digit => KHMER_DIGITS[parseInt(digit)] || digit).join('');
  };

  // Helper to shuffle array
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

  // Function to download single image
  const handleDownloadImage = async (q: Question) => {
    setIsExporting(true);
    setExportQuestion(q);
    setTimeout(async () => {
      if (exportRef.current) {
        try {
          const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
          const link = document.createElement('a');
          link.download = `quiz_${q.subject}_${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        } catch (err) { console.error(err); }
      }
      setIsExporting(false);
      setExportQuestion(null);
    }, 100);
  };

  // NEW: Function to download all questions of a subject as ZIP of images
  const handleDownloadSubjectImagesZip = async (name: string, type: 'mcq' | 'short') => {
    let questions = quizData.filter(q => q.subject === name && q.type === type);
    if (questions.length === 0) return alert("មិនមានសំណួរក្នុងមុខវិជ្ជានេះឡើយ!");

    setIsExportingZip(true);
    setZipProgress({ current: 0, total: questions.length });

    const zip = new JSZip();
    const folder = zip.folder(`Images_${name}_${type}`);

    // Loop through questions and capture them
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      setZipProgress({ current: i + 1, total: questions.length });
      
      // Automatic shuffling for variety even in images
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

      // Wait for React to render the export template
      await new Promise(resolve => setTimeout(resolve, 200));

      if (exportRef.current) {
        try {
          const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
          const base64Data = canvas.toDataURL('image/png').split(',')[1];
          folder.file(`Question_${i + 1}.png`, base64Data, { base64: true });
        } catch (err) {
          console.error("Error capturing question:", i, err);
        }
      }
    }

    // Finalize ZIP
    try {
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `សំណួរ_${name}_${type === 'mcq' ? 'QCM' : 'QA'}_${Date.now()}.zip`;
      link.click();
    } catch (err) {
      console.error("ZIP Generation Error:", err);
      alert("មានបញ្ហាក្នុងការបង្កើត ZIP!");
    }

    setIsExportingZip(false);
    setIsExporting(false);
    setExportQuestion(null);
  };

  const handleDownloadPDF = (name: string, type: 'mcq' | 'short') => {
    let questions = quizData.filter(q => q.subject === name && q.type === type);
    
    // Automatic Shuffling for Professional Exam Variety
    const processedQuestions = questions.map(q => {
      if (q.type === 'mcq' && q.options) {
        const optionsWithMeta = q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correct }));
        const shuffledOptions = shuffleArray(optionsWithMeta);
        const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);
        return { ...q, options: shuffledOptions.map(o => o.text), correct: newCorrectIndex };
      }
      return q;
    });

    const finalQuestions = shuffleArray(processedQuestions);

    setPdfSubjectData({ name, type, questions: finalQuestions });
    setIsExportingPDF(true);

    // Increased timeout to 2.5s for massive question lists to render fully
    setTimeout(() => {
      if (pdfRef.current) {
        const opt = {
          margin: [15, 15, 15, 15],
          filename: `វិញ្ញាសា_${name}_${type === 'mcq' ? 'QCM' : 'QA'}_${Date.now()}.pdf`,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: { 
            scale: 2.5, // Optimized scale for long documents to prevent memory overflow
            useCORS: true,
            logging: false,
            letterRendering: true,
            scrollX: 0,
            scrollY: 0,
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
          alert("ការទាញយកមានបញ្ហា សូមព្យាយាមម្តងទៀត!");
          setIsExportingPDF(false);
        });
      }
    }, 2500);
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

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      {/* Hidden PDF Template - Professional A4 with Scrambled Logic */}
      {isExportingPDF && pdfSubjectData && (
        <div className="fixed -left-[4000px] top-0 bg-white">
          <div ref={pdfRef} style={{ width: '210mm', minHeight: '297mm', padding: '15mm 20mm', background: 'white', color: 'black' }} className="small-kh">
            {/* National Header - Optimized for clipping prevention */}
            <div className="flex justify-between items-start mb-12 border-b-2 border-black pb-8 pt-4">
              <div className="text-center w-1/2">
                <h1 className="text-[14pt] font-bold heading-kh mb-1 leading-[2.5]">ព្រះរាជាណាចក្រកម្ពុជា</h1>
                <h2 className="text-[12pt] font-bold heading-kh mb-1 leading-[2.2]">ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
                <div className="flex justify-center mt-1 mb-2"><div className="w-16 h-[1.2px] bg-black"></div></div>
                <h3 className="text-[11pt] font-bold heading-kh text-maroon leading-[2.2]">កម្មវិធីត្រៀមប្រឡងក្របខ័ណ្ឌ</h3>
                <p className="text-[10pt] font-bold mt-2">រៀបរៀងដោយ៖ ឃួន ណារ៉េត</p>
              </div>
              <div className="text-left w-1/2 pt-4 pl-12 border-l border-gray-100">
                <h3 className="text-[14pt] font-bold heading-kh mb-2 leading-[2.5]">វិញ្ញាសា៖ {pdfSubjectData.name}</h3>
                <p className="text-[10pt] font-bold leading-[2.0]">Type៖ {pdfSubjectData.type === 'mcq' ? 'ពហុចម្លើយ (QCM)' : 'សំណួរចម្លើយ (Q&A)'}</p>
                <p className="text-[10pt] font-bold leading-[2.0]">ចំនួនសំណួរ៖ {toKhmerNumeral(pdfSubjectData.questions.length)} សំណួរ</p>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-12">
              {pdfSubjectData.questions.map((q, idx) => (
                <div key={idx} style={{ pageBreakInside: 'avoid', marginBottom: '40px' }} className="pb-6">
                  <div className="flex gap-5 mb-4 items-start">
                    <span className="font-bold text-[13pt] pt-1">{toKhmerNumeral(idx + 1)}.</span>
                    <h4 className="text-[14pt] font-bold heading-kh leading-[2.4] flex-1 text-justify">
                      {q.question}
                    </h4>
                  </div>
                  
                  {q.type === 'mcq' ? (
                    <div className="grid grid-cols-1 gap-4 ml-14">
                      {q.options?.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-5 items-start text-[12pt] leading-[2.0] mb-2">
                          <span className="font-bold">{KHMER_PREFIXES[oIdx]}.</span>
                          <span className="flex-1">{opt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ml-14 mt-6 p-6 border-l-4 border-black/30 bg-gray-50/50">
                      <p className="text-[9pt] font-bold mb-3 uppercase opacity-60 tracking-widest">ចម្លើយ៖</p>
                      <p className="text-[12pt] leading-[2.4] text-justify whitespace-pre-wrap">{q.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Answer Key Table (For MCQ only) - Always on a new page */}
            {pdfSubjectData.type === 'mcq' && (
              <div style={{ marginTop: '60px', borderTop: '2px dashed #000', paddingTop: '40px', pageBreakBefore: 'always' }}>
                <h3 className="text-[15pt] font-bold heading-kh text-center mb-8 leading-[2.5]">តារាងចម្លើយត្រឹមត្រូវ (Answer Key)</h3>
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
                            <td className="border border-black p-4 text-center text-[13pt] font-bold">{q1 ? KHMER_PREFIXES[q1.correct || 0] : ''}</td>
                            <td className="border border-black p-4 text-center text-[11pt]">{q2 ? toKhmerNumeral(i * 2 + 2) : ''}</td>
                            <td className="border border-black p-4 text-center text-[13pt] font-bold">{q2 ? KHMER_PREFIXES[q2.correct || 0] : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Signature Footer */}
            <div className="mt-24 pt-12 border-t border-black flex justify-between items-start" style={{ pageBreakInside: 'avoid' }}>
              <div className="text-center w-56">
                <p className="text-[11pt] font-bold heading-kh mb-20 leading-[2.2]">ហត្ថលេខាអនុរក្ស</p>
                <div className="border-b border-black w-full mb-2"></div>
                <p className="text-[9pt] italic opacity-60">ឈ្មោះ៖ .............................</p>
              </div>
              <div className="text-center w-72">
                <p className="text-[10pt] italic mb-6">ធ្វើនៅភ្នំពេញ, ថ្ងៃទី ........ ខែ ........ ឆ្នាំ ............</p>
                <p className="text-[11pt] font-bold heading-kh mb-20 leading-[2.2]">គ្រូបង្គោល / អ្នករៀបចំវិញ្ញាសា</p>
                <div className="border-b border-black w-full mb-2"></div>
                <p className="text-[9pt] italic opacity-60">ឈ្មោះ៖ .............................</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Export Template - Image (Used for both single and zip) */}
      {isExporting && exportQuestion && (
        <div className="fixed -left-[2000px] top-0">
          <div ref={exportRef} className="w-[800px] bg-white p-12 border-[16px] border-maroon rounded-[4rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-maroon/5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-maroon/5 rounded-full -ml-32 -mb-32"></div>
            <div className="flex justify-between items-center mb-10 pb-6 border-b-4 border-dashed border-maroon/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-maroon rounded-2xl flex items-center justify-center text-3xl text-white shadow-lg">🇰🇭</div>
                <div><h1 className="text-3xl font-black heading-kh text-maroon">Quiz Master KH</h1><p className="text-sm font-black heading-kh text-gray-400 uppercase tracking-widest">ជូនពរជោគជ័យ!</p></div>
              </div>
              <div className="text-right"><span className="text-sm font-black bg-maroon text-white px-5 py-2 rounded-full uppercase">{exportQuestion.subject}</span><p className="text-[10px] font-black heading-kh text-gray-400 mt-2 uppercase tracking-tighter">Type៖ {exportQuestion.type === 'mcq' ? 'QCM' : 'Q & A'}</p></div>
            </div>
            <div className="mb-12"><h2 className="text-4xl font-black heading-kh text-maroon leading-[1.6]">{exportQuestion.question}</h2></div>
            {exportQuestion.type === 'mcq' ? (
              <div className="grid grid-cols-1 gap-4">
                {exportQuestion.options?.map((opt, i) => (
                  <div key={i} className={`flex items-center gap-6 p-6 rounded-3xl border-4 ${i === exportQuestion.correct ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-transparent'}`}>
                    <span className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black ${i === exportQuestion.correct ? 'bg-green-500 text-white shadow-md' : 'bg-white text-maroon'}`}>{KHMER_PREFIXES[i]}</span>
                    <span className={`text-2xl font-bold small-kh ${i === exportQuestion.correct ? 'text-green-800' : 'text-gray-600'}`}>{opt}</span>
                    {i === exportQuestion.correct && <span className="ml-auto text-3xl">✅</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-green-50 border-l-[12px] border-green-500 rounded-r-[3rem] p-10">
                <p className="text-2xl font-black heading-kh text-green-700 mb-4">ចម្លើយដែលត្រឹមត្រូវ ៖</p>
                <p className="text-3xl font-bold small-kh text-gray-800 leading-relaxed whitespace-pre-wrap">{exportQuestion.answer}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading PDF/ZIP Indicator */}
      {(isExportingPDF || isExportingZip) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
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
                <p className="text-[10px] font-bold text-maroon mt-2">
                  រៀបចំបាន {toKhmerNumeral(zipProgress.current)} / {toKhmerNumeral(zipProgress.total)} រូបភាព
                </p>
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
            <div className="grid grid-cols-1 gap-5"><div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">ឈ្មោះមុខវិជ្ជា</label><input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh bg-gray-50/50 text-maroon font-bold" placeholder="ឧទាហរណ៍៖ សេដ្ឋកិច្ច" /></div><div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">អត្ថបទសំណួរ</label><textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-maroon outline-none min-h-[100px] small-kh bg-gray-50/50" placeholder="សរសេរសំណួរ..." /></div>{qType === 'mcq' ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{options.map((opt, i) => (<div key={i} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all focus-within:border-maroon/30"><span className="font-black text-maroon w-10 h-10 flex items-center justify-center bg-maroon/5 rounded-xl">{KHMER_PREFIXES[i]}</span><input type="text" value={opt} onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} className="flex-1 outline-none small-kh py-1 text-sm" placeholder={`ចម្លើយទី ${i+1}`} /><label className="relative flex items-center cursor-pointer"><input type="radio" checked={correct === i} onChange={() => setCorrect(i)} className="hidden peer" /><div className="w-8 h-8 border-2 border-gray-200 rounded-xl peer-checked:bg-green-500 peer-checked:border-green-500 text-white flex items-center justify-center">✓</div></label></div>))}</div>) : (<div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">ចម្លើយដែលត្រូវ</label><textarea value={shortAnswer} onChange={(e) => setShortAnswer(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh bg-gray-50/50 min-h-[100px]" placeholder="បញ្ចូលចម្លើយត្រឹមត្រូវ..." /></div>)}</div><button onClick={handleSubmitSingle} className="w-full bg-maroon text-white font-black py-5 rounded-[2rem] shadow-xl hover:brightness-110 transition-all heading-kh text-lg">រក្សាទុកសំណួរ</button>
          </div>
        )}

        {entryMode === 'bulk' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-black heading-kh text-maroon flex items-center gap-2">🚀 បញ្ចូលសំណួរទាំងអស់</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">ឈ្មោះមុខវិជ្ជា</label><input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh bg-gray-50/50 text-maroon font-bold" placeholder="ឈ្មោះមុខវិជ្ជា..." /></div><div className="space-y-2"><label className="text-[10px] font-black heading-kh text-gray-400 ml-2">Type</label><div className="flex bg-gray-100 p-1 rounded-2xl h-[60px]"><button onClick={() => setBulkType('mcq')} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${bulkType === 'mcq' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-400'}`}>QCM</button><button onClick={() => setBulkType('short')} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${bulkType === 'short' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-400'}`}>Q & A</button></div></div></div>
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
                  <SubjectCard key={`mcq-${i}`} sub={sub} isFirst={i === 0} isLast={i === groupedSubjects.mcq.length - 1} onToggleSubject={onToggleSubject} onUpdateSubject={(name, type) => { setRenamingSubject({ name, type }); setNewNameInput(name); }} onRemoveSubject={onRemoveSubject} onReorderSubject={onReorderSubject} onDownloadPDF={handleDownloadPDF} onDownloadZip={handleDownloadSubjectImagesZip} />
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 border-l-4 border-orange-500 pl-4"><h2 className="text-xl font-black heading-kh text-orange-800">✍️ ផ្នែកសំណួរចម្លើយខ្លីៗ</h2><span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black">{groupedSubjects.short.length} មុខវិជ្ជា</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groupedSubjects.short.map((sub, i) => (
                  <SubjectCard key={`short-${i}`} sub={sub} isFirst={i === 0} isLast={i === groupedSubjects.short.length - 1} onToggleSubject={onToggleSubject} onUpdateSubject={(name, type) => { setRenamingSubject({ name, type }); setNewNameInput(name); }} onRemoveSubject={onRemoveSubject} onReorderSubject={onReorderSubject} onDownloadPDF={handleDownloadPDF} onDownloadZip={handleDownloadSubjectImagesZip} />
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
                <button title="ទាញយករូបភាព" disabled={isExporting} onClick={() => handleDownloadImage(item)} className="p-3 bg-indigo-50 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-colors">🖼️</button>
                <button title={item.isActive === false ? "បើកសំណួរ" : "បិទសំណួរ"} onClick={() => onUpdate(item.originalIndex, { ...item, isActive: item.isActive === false })} className={`p-3 rounded-xl transition-colors ${item.isActive === false ? 'bg-green-50 text-green-500 hover:bg-green-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{item.isActive === false ? '🔓' : '🔒'}</button>
                <button onClick={() => { setQType(item.type); setSubject(item.subject); setQuestion(item.question); if (item.type === 'mcq') { setOptions(item.options || []); setCorrect(item.correct || 0); } else setShortAnswer(item.answer || ''); setEditingIndex(item.originalIndex); setEntryMode('single'); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-3 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-100 transition-colors">✏️</button>
                <button onClick={() => { if(confirm("តើអ្នកប្រាកដថាចង់លុបសំណួរនេះ?")) onRemove(item.originalIndex); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">🗑️</button>
              </div>
            </div>
          )) : (<div className="text-center py-10 text-gray-400 small-kh italic">មិនមានទិន្នន័យស្វែងរកឡើយ</div>)}
        </div>
      </div>

      {/* Rename Subject Modal */}
      {renamingSubject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fadeIn">
          <div className="glass-card rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border-2 border-white">
            <h3 className="text-xl font-black heading-kh text-maroon mb-4 text-center">កែសម្រួលឈ្មោះមុខវិជ្ជា</h3>
            <p className="text-xs text-gray-400 mb-6 text-center">ការប្តូរឈ្មោះនេះនឹងអនុវត្តលើគ្រប់សំណួរទាំងអស់ក្នុងមុខវិជ្ជានេះ។</p>
            <input 
              type="text" 
              autoFocus 
              value={newNameInput} 
              onChange={(e) => setNewNameInput(e.target.value)} 
              className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon bg-gray-50/50 text-maroon font-bold mb-6 small-kh" 
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSubjectName()}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setRenamingSubject(null)} 
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 font-bold text-xs uppercase hover:bg-gray-200 transition-all"
              >
                បោះបង់
              </button>
              <button 
                onClick={handleSaveSubjectName} 
                className="flex-1 py-3 rounded-xl bg-maroon text-white font-black text-xs uppercase shadow-md hover:brightness-110 transition-all"
              >
                រក្សាទុក
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateSection;
