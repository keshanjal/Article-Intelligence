import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import { 
  FileText, Link as LinkIcon, Upload, Globe, ArrowRight, Copy, Check, Loader2, 
  Volume2, Square, FileDown, Sparkles, CheckCircle2, XCircle, Brain, Activity, BookOpen,
  MessageSquare, Send, Trash2, X, Monitor
} from 'lucide-react';

export default function App() {
  const [inputMode, setInputMode] = useState('text');
  
  // Initialize preferences from LocalStorage
  const [language, setLanguage] = useState(() => localStorage.getItem('ai_pref_lang') || 'English');
  const [summaryLength, setSummaryLength] = useState(() => localStorage.getItem('ai_pref_len') || 'Short');
  const [readingLevel, setReadingLevel] = useState(() => localStorage.getItem('ai_pref_level') || 'General Public');
  
  // Input fields
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // --- UPGRADED: Object-based states to save results independently for each tab ---
  const [summaries, setSummaries] = useState({ text: null, url: null, file: null, tab: null });
  const [fullTexts, setFullTexts] = useState({ text: '', url: '', file: '', tab: '' }); 
  const [chatHistories, setChatHistories] = useState({ text: [], url: [], file: [], tab: [] });
  const [chatInputs, setChatInputs] = useState({ text: '', url: '', file: '', tab: '' });
  
  // Helper variables for the currently active tab
  const currentSummary = summaries[inputMode];
  const currentFullText = fullTexts[inputMode];
  const currentChatHistory = chatHistories[inputMode] || [];
  const currentChatInput = chatInputs[inputMode] || '';

  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  const languages = [
    'Arabic', 'Bengali', 'Chinese (Mandarin)', 'English', 'French', 
    'German', 'Gujarati', 'Hindi', 'Italian', 'Japanese', 
    'Kannada', 'Korean', 'Malayalam', 'Marathi', 'Portuguese', 
    'Punjabi', 'Russian', 'Spanish', 'Tamil', 'Telugu', 'Urdu'
  ];
  
  const lengths = ['Short', 'Detailed', 'Key points'];
  const readingLevels = ['Elementary', 'General Public', 'Academic'];

  // Save preferences to LocalStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ai_pref_lang', language);
    localStorage.setItem('ai_pref_len', summaryLength);
    localStorage.setItem('ai_pref_level', readingLevel);
  }, [language, summaryLength, readingLevel]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentSummary]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const handleCopy = async () => {
    if (!currentSummary?.summary) return;
    try {
      await navigator.clipboard.writeText(currentSummary.summary);
      setCopied(true);
      showToast('Summary copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('Failed to copy text', 'error');
    }
  };

  const handleSpeak = () => {
    if (!currentSummary?.summary) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(currentSummary.summary);
    const langCodeMap = {
      'Arabic': 'ar-SA', 'Bengali': 'bn-IN', 'Chinese (Mandarin)': 'zh-CN',
      'English': 'en-US', 'French': 'fr-FR', 'German': 'de-DE',
      'Gujarati': 'gu-IN', 'Hindi': 'hi-IN', 'Italian': 'it-IT',
      'Japanese': 'ja-JP', 'Kannada': 'kn-IN', 'Korean': 'ko-KR',
      'Malayalam': 'ml-IN', 'Marathi': 'mr-IN', 'Portuguese': 'pt-BR',
      'Punjabi': 'pa-IN', 'Russian': 'ru-RU', 'Spanish': 'es-ES',
      'Tamil': 'ta-IN', 'Telugu': 'te-IN', 'Urdu': 'ur-IN'
    };
    utterance.lang = langCodeMap[language] || 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => { setIsSpeaking(false); showToast('Audio playback interrupted', 'error'); };
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleDownloadTxt = () => {
    if (!currentSummary) return;
    const element = document.createElement("a");
    const file = new Blob([currentSummary.summary], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${language}_Summary.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('TXT file downloaded successfully!');
  };

  const handleDownloadPdf = () => {
    const element = document.getElementById('summary-content');
    const opt = {
      margin: 0.5, filename: `${language}_Dashboard.pdf`,
      image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save().then(() => showToast('PDF downloaded successfully!'));
  };

  const handleDismiss = () => {
    // Clear only the current tab's data
    setSummaries(prev => ({ ...prev, [inputMode]: null }));
    setFullTexts(prev => ({ ...prev, [inputMode]: '' }));
    setChatHistories(prev => ({ ...prev, [inputMode]: [] }));
    setChatInputs(prev => ({ ...prev, [inputMode]: '' }));
    
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (currentSummary && !isLoading) handleSummarize(newLang, summaryLength, readingLevel);
  };

  const handleLengthChange = (newLen) => {
    setSummaryLength(newLen);
    if (currentSummary && !isLoading) handleSummarize(language, newLen, readingLevel);
  };

  const handleLevelChange = (newLevel) => {
    setReadingLevel(newLevel);
    if (currentSummary && !isLoading) handleSummarize(language, summaryLength, newLevel);
  };

  const handleSummarize = async (targetLanguage = language, targetLength = summaryLength, targetLevel = readingLevel) => {
    if (inputMode === 'text' && !textInput.trim()) return;
    if (inputMode === 'url' && !urlInput.trim()) return;
    if (inputMode === 'file' && !selectedFile) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsLoading(true);
    setCopied(false);
    
    // Reset current tab states before fetching
    setSummaries(prev => ({ ...prev, [inputMode]: null }));
    setChatHistories(prev => ({ ...prev, [inputMode]: [] }));

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

    try {
      let response;
      if (inputMode === 'tab') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        const extraction = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_TEXT" }, resolve);
        });
        
        if (!extraction || !extraction.text) throw new Error("Could not read text from this page.");
        
        response = await fetch('https://article-intelligence-api.onrender.com/api/summarize/text', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: extraction.text, target_language: targetLanguage, length_format: targetLength, reading_level: targetLevel })
        });
      } else if (inputMode === 'text') {
        response = await fetch('https://article-intelligence-api.onrender.com/api/summarize/text', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: textInput, target_language: targetLanguage, length_format: targetLength, reading_level: targetLevel })
        });
      } else if (inputMode === 'url') {
        response = await fetch('https://article-intelligence-api.onrender.com/api/summarize/url', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlInput, target_language: targetLanguage, length_format: targetLength, reading_level: targetLevel })
        });
      } else if (inputMode === 'file') {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('target_language', targetLanguage);
        formData.append('length_format', targetLength);
        formData.append('reading_level', targetLevel);
        response = await fetch('https://article-intelligence-api.onrender.com/api/summarize/file', { method: 'POST', body: formData });
      }

      if (!response.ok) throw new Error('Failed to generate summary from backend');
      
      const data = await response.json();
      const cleanJsonStr = data.summary.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJsonStr);
      
      // Save results specifically to the current tab
      setSummaries(prev => ({ ...prev, [inputMode]: parsedData }));
      setFullTexts(prev => ({ ...prev, [inputMode]: data.full_text }));
      showToast('Intelligence Dashboard generated!');

    } catch (error) {
      setSummaries(prev => ({ 
        ...prev, 
        [inputMode]: { summary: "Failed to parse structured AI response. Please try again.", sentiment: "Error", tone: "Error", key_terms: [] } 
      }));
      showToast('Analysis encountered an issue', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!currentChatInput.trim() || !currentFullText) return;

    const userQuestion = currentChatInput.trim();
    
    // Clear the input and add user message to the specific tab's history
    setChatInputs(prev => ({ ...prev, [inputMode]: '' }));
    setChatHistories(prev => ({ 
      ...prev, 
      [inputMode]: [...(prev[inputMode] || []), { role: 'user', content: userQuestion }] 
    }));
    
    setIsChatting(true);

    try {
      const response = await fetch('https://article-intelligence-api.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_text: currentFullText, question: userQuestion, language: language })
      });
      
      const data = await response.json();
      
      if (response.ok && data.answer) {
        setChatHistories(prev => ({ 
          ...prev, 
          [inputMode]: [...(prev[inputMode] || []), { role: 'ai', content: data.answer }] 
        }));
      } else {
        setChatHistories(prev => ({ 
          ...prev, 
          [inputMode]: [...(prev[inputMode] || []), { role: 'ai', content: `Error: ${data.detail || 'Could not fetch answer.'}` }] 
        }));
      }
    } catch (error) {
      setChatHistories(prev => ({ 
        ...prev, 
        [inputMode]: [...(prev[inputMode] || []), { role: 'ai', content: 'Sorry, I encountered a network error while connecting to the AI.' }] 
      }));
      showToast('Chat failed', 'error');
    } finally {
      setIsChatting(false);
    }
  };

  const isSubmitDisabled = isLoading || 
    (inputMode === 'text' && !textInput.trim()) || 
    (inputMode === 'url' && !urlInput.trim()) || 
    (inputMode === 'file' && !selectedFile) ||
    (inputMode === 'tab' && !window.chrome);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800 pb-24 relative">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-blue-600 mb-2 tracking-tight">Article Intelligence</h1>
          <p className="text-slate-500">Multilingual summaries, sentiment analysis, and adaptive complexity.</p>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex space-x-2 mb-6 bg-slate-100 p-1 rounded-xl flex-wrap gap-y-2">
            <button onClick={() => setInputMode('text')} className={`flex-1 min-w-[120px] py-2.5 rounded-lg font-medium flex items-center justify-center transition-all ${inputMode === 'text' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}><FileText className="w-4 h-4 mr-2" /> Paste Text</button>
            <button 
  onClick={() => setInputMode('url')} 
  className={`flex-1 min-w-[120px] py-2.5 rounded-lg font-medium flex items-center justify-center transition-all ${inputMode === 'url' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
>
  <LinkIcon className="w-4 h-4 mr-2" /> Article URL
</button>
            <button onClick={() => setInputMode('file')} className={`flex-1 min-w-[120px] py-2.5 rounded-lg font-medium flex items-center justify-center transition-all ${inputMode === 'file' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}><Upload className="w-4 h-4 mr-2" /> Upload File</button>
            {window.chrome && window.chrome.tabs && (
              <button onClick={() => setInputMode('tab')} className={`flex-1 min-w-[120px] py-2.5 rounded-lg font-medium flex items-center justify-center transition-all ${inputMode === 'tab' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}><Monitor className="w-4 h-4 mr-2" /> Current Tab</button>
            )}
          </div>

          <div className="mb-6">
            {inputMode === 'tab' && (
              <div className="w-full h-40 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center bg-blue-50/50">
                <Monitor className="w-8 h-8 text-blue-500 mb-3" />
                <p className="text-slate-700 font-medium">Ready to analyze the current browser tab</p>
                <p className="text-slate-500 text-sm mt-1">Click Analyze to extract text directly from this page.</p>
              </div>
            )}

            {inputMode === 'text' && (
              <div className="relative">
                <textarea 
                  className="w-full h-40 p-4 pr-12 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" 
                  placeholder="Paste your article text here..." 
                  value={textInput} 
                  onChange={(e) => setTextInput(e.target.value)} 
                />
                {textInput && (
                  <button 
                    onClick={() => setTextInput('')} 
                    className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Clear text"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
            
            {inputMode === 'url' && (
              <div className="relative">
          <input 
  type="url" 
  className="w-full p-4 pr-12 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
  placeholder="https://example.com/article" 
  value={urlInput} 
  onChange={(e) => setUrlInput(e.target.value)} 
/>
                {urlInput && (
                  <button 
                    onClick={() => setUrlInput('')} 
                    className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Clear URL"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
            
            {inputMode === 'file' && (
              <div onClick={() => !selectedFile && fileInputRef.current?.click()} className={`w-full h-40 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-slate-50 transition-colors group ${!selectedFile ? 'cursor-pointer hover:bg-slate-100 hover:border-blue-400' : ''}`}>
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center p-3 bg-white border border-slate-200 shadow-sm rounded-xl mb-2">
                      <FileText className="w-5 h-5 text-blue-500 mr-2" />
                      <span className="text-slate-700 font-medium mr-3">{selectedFile.name}</span>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedFile(null); 
                          if (fileInputRef.current) fileInputRef.current.value = ''; 
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-500">Ready to analyze</p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-slate-600 font-medium">Click to select a file</p>
                  </>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.pdf,.docx,.doc" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-100">
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center text-slate-700"><Globe className="w-4 h-4 mr-2 text-blue-600" /> Language</label>
              <select value={language} onChange={handleLanguageChange} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">Length</label>
              <div className="flex space-x-2">
                {lengths.map(len => <button key={len} onClick={() => handleLengthChange(len)} className={`flex-1 py-3 text-sm rounded-xl border font-medium transition-colors ${summaryLength === len ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{len}</button>)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center text-slate-700"><Brain className="w-4 h-4 mr-2 text-blue-600" /> Reading Level</label>
              <select value={readingLevel} onChange={(e) => handleLevelChange(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                {readingLevels.map(level => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>
          </div>

          <button onClick={() => handleSummarize()} disabled={isSubmitDisabled} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing Document...</> : <>Analyze & Summarize <ArrowRight className="w-5 h-5 ml-2" /></>}
          </button>
        </div>

        <div ref={resultsRef} className="scroll-mt-8">
          {!currentSummary && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white mt-8">
              <div className="bg-blue-50 p-4 rounded-full mb-4"><Sparkles className="w-8 h-8 text-blue-600" /></div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Ready to Analyze</h3>
              <p className="text-slate-500 max-w-md">Submit text above to instantly generate a tailored summary, vocabulary list, and tone analysis.</p>
            </div>
          )}

          {isLoading && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-pulse mt-8">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              </div>
            </div>
          )}

          {currentSummary && !isLoading && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-8 relative overflow-hidden">
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 pb-4 mb-6 border-b border-slate-100 gap-4">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-bold text-slate-800">{language} Analysis</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">{summaryLength} • {readingLevel}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleSpeak} className="flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors">
                    {isSpeaking ? <><Square className="w-4 h-4" /><span>Stop</span></> : <><Volume2 className="w-4 h-4" /><span>Listen</span></>}
                  </button>
                  <button onClick={handleDownloadTxt} className="flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                    <FileText className="w-4 h-4 text-slate-500" /> <span className="hidden sm:inline">TXT</span>
                  </button>
                  <button onClick={handleDownloadPdf} className="flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                    <FileDown className="w-4 h-4 text-slate-500" /> <span className="hidden sm:inline">PDF</span>
                  </button>
                  <button onClick={handleCopy} className="flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                    {copied ? <><Check className="w-4 h-4 text-emerald-600" /><span className="text-emerald-600 font-semibold">Copied</span></> : <><Copy className="w-4 h-4 text-slate-500" /><span>Copy</span></>}
                  </button>
                  <button onClick={handleDismiss} className="flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors ml-2" title="Dismiss Results">
                    <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Clear</span>
                  </button>
                </div>
              </div>
              
              <div id="summary-content">
                <div className="flex space-x-4 mb-8">
                  <div className="flex items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <Activity className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-sm font-semibold text-slate-600 mr-2">Sentiment:</span>
                    <span className="text-sm font-bold text-slate-800">{currentSummary.sentiment}</span>
                  </div>
                  <div className="flex items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <BookOpen className="w-4 h-4 text-purple-500 mr-2" />
                    <span className="text-sm font-semibold text-slate-600 mr-2">Tone:</span>
                    <span className="text-sm font-bold text-slate-800">{currentSummary.tone}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 prose prose-slate max-w-none text-slate-700 leading-relaxed text-lg">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Article Summary</h3>
                    <ReactMarkdown>{currentSummary.summary || ''}</ReactMarkdown>
                  </div>
                  
                  <div className="md:col-span-1">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5">
                      <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4 flex items-center">
                        <Brain className="w-4 h-4 mr-2" /> Key Vocabulary
                      </h3>
                      <ul className="space-y-4">
                        {currentSummary.key_terms && currentSummary.key_terms.map((item, index) => (
                          <li key={index} className="text-sm">
                            <span className="font-bold text-slate-800 block mb-0.5">{item.term}</span>
                            <span className="text-slate-600">{item.definition}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Interface */}
              <div className="mt-12 border-t border-slate-100 pt-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-blue-600" /> Chat with this Article
                </h3>
                
                <div className="bg-slate-50 rounded-xl p-4 mb-4 max-h-80 overflow-y-auto space-y-4">
                  {currentChatHistory.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">Ask a specific question about the text. The AI will find the answer for you.</p>
                  ) : (
                    currentChatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                          <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                            <ReactMarkdown>{String(msg.content || '')}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {isChatting && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-sm flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching article...</span>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={currentChatInput}
                    onChange={(e) => setChatInputs(prev => ({ ...prev, [inputMode]: e.target.value }))}
                    placeholder="Ask a question..."
                    className="flex-1 p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    disabled={isChatting}
                  />
                  <button 
                    type="submit" 
                    disabled={!currentChatInput.trim() || isChatting}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center bg-slate-800 text-white px-5 py-3.5 rounded-xl shadow-xl animate-bounce-in">
          {toast.type === 'error' ? <XCircle className="w-5 h-5 mr-3 text-red-400" /> : <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-400" />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
}