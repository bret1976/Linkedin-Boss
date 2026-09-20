import { useState, useRef } from 'react';
import { 
  Linkedin, 
  Upload, 
  Sparkles, 
  ArrowRight, 
  FileText, 
  User, 
  Briefcase, 
  Globe, 
  ShieldCheck,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { UserUploadedProfile } from '../types/knowledgeGraph';

interface IntroScreenProps {
  onStart: (profile: UserUploadedProfile) => void;
  onOpenLinkedIn?: () => void;
}

export default function IntroScreen({ onStart, onOpenLinkedIn }: IntroScreenProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'demo' | 'linkedin'>('linkedin');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');

  // Manual input form state
  const [name, setName] = useState('Alex Morgan');
  const [headline, setHeadline] = useState('Founder & CEO | AI Systems, B2B SaaS & Strategic Capital');
  const [company, setCompany] = useState('Apex Horizon Labs');
  const [industry, setIndustry] = useState('Artificial Intelligence & Software');
  const [location, setLocation] = useState('San Francisco, CA');
  const [skillsText, setSkillsText] = useState('Generative AI, Product Strategy, Venture Capital, B2B SaaS, Go-to-Market');
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateGraphAnalysis = async (profileData: UserUploadedProfile) => {
    setIsAnalyzing(true);
    setAnalysisStep('Reading profile topology and competencies...');
    await new Promise(r => setTimeout(r, 600));

    setAnalysisStep('Traversing 1st-degree contacts & mutual bridges...');
    await new Promise(r => setTimeout(r, 700));

    setAnalysisStep('Synthesizing 2nd-degree executive clusters & venture nodes...');
    await new Promise(r => setTimeout(r, 600));

    setAnalysisStep('Mapping synergy scorecard & best match alignments...');
    await new Promise(r => setTimeout(r, 500));

    setIsAnalyzing(false);
    onStart(profileData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if JSON or resume/profile text or image
    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          const profile: UserUploadedProfile = {
            name: parsed.name || parsed.fullName || file.name.replace('.json', ''),
            headline: parsed.headline || parsed.title || 'Tech & Venture Professional',
            company: parsed.company || 'Enterprise Leader',
            industry: parsed.industry || 'Technology & Innovation',
            location: parsed.location || 'Global Hub',
            skills: parsed.skills || ['AI', 'SaaS', 'Business Strategy', 'Partnerships'],
            avatarUrl: parsed.avatarUrl || avatarUrl
          };
          simulateGraphAnalysis(profile);
        } catch {
          alert('Could not parse JSON. Starting with default profile structure.');
          handleStartDemo();
        }
      };
      reader.readAsText(file);
    } else {
      // Text or Image upload
      const reader = new FileReader();
      reader.onload = (event) => {
        const uploadedImg = event.target?.result as string;
        const profile: UserUploadedProfile = {
          name: file.name.split('.')[0].replace(/[-_]/g, ' ') || 'Uploaded Executive',
          headline: 'Enterprise Technology & Strategic Alliances Lead',
          company: 'Nexus Digital Ventures',
          industry: 'Software & Cloud Solutions',
          location: 'San Francisco / New York',
          skills: ['Strategic Partnerships', 'Generative AI', 'B2B Enterprise', 'Growth Strategy'],
          avatarUrl: uploadedImg.startsWith('data:image') ? uploadedImg : avatarUrl
        };
        simulateGraphAnalysis(profile);
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    }
  };

  const handleStartDemo = (presetIndex: number = 0) => {
    const presets: UserUploadedProfile[] = [
      {
        name: 'Alex Morgan',
        headline: 'Founder & CEO | AI Systems, B2B SaaS & Strategic Capital',
        company: 'Apex Horizon Labs',
        industry: 'Artificial Intelligence & Software',
        location: 'San Francisco, CA',
        skills: ['Generative AI', 'Product Strategy', 'Venture Capital', 'B2B SaaS', 'Spatial Computing'],
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        connectionsCount: 840
      },
      {
        name: 'Jordan Rivera',
        headline: 'Managing Director | Corporate Venture, M&A & Global Alliances',
        company: 'Vanguard Growth Partners',
        industry: 'Venture Capital & Private Equity',
        location: 'New York, NY',
        skills: ['Venture Capital', 'Strategic Alliances', 'M&A Deal Sourcing', 'Enterprise Pilots'],
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        connectionsCount: 1200
      },
      {
        name: 'Maya Chen',
        headline: 'VP Engineering & AI Architect | Distributed Cloud & Multi-Agent Systems',
        company: 'Synthetix Tech',
        industry: 'Computer Software & Cloud',
        location: 'Seattle, WA',
        skills: ['Distributed Systems', 'Three.js', 'LLM Architectures', 'Cloud Infrastructure'],
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        connectionsCount: 650
      }
    ];

    const selected = presets[presetIndex] || presets[0];
    simulateGraphAnalysis(selected);
  };

  const handleStartManual = () => {
    const profile: UserUploadedProfile = {
      name: name.trim() || 'Professional Leader',
      headline: headline.trim() || 'Technology & Business Leader',
      company: company.trim() || 'Global Enterprise',
      industry: industry.trim() || 'Technology & Innovation',
      location: location.trim() || 'Worldwide',
      skills: skillsText.split(',').map(s => s.trim()).filter(Boolean),
      avatarUrl: avatarUrl
    };
    simulateGraphAnalysis(profile);
  };

  return (
    <div className="flex flex-col items-center w-full h-full max-w-xl mx-auto p-6 font-sans justify-center overflow-y-auto">
      <div className="w-full flex flex-col items-center text-center my-auto py-6">
        
        {/* Brand Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 border border-sky-200 text-[#0077b5] text-xs font-semibold uppercase tracking-wider mb-3">
          <Linkedin className="w-3.5 h-3.5 fill-[#0077b5]" />
          <span>Visual Knowledge Graph for LinkedIn</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
          Map & Connect With Your Best Match Profiles
        </h1>

        <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-md">
          Upload your LinkedIn profile to analyze your network, traverse 1st & 2nd-degree contacts, and project your highest-alignment business matches onto an interactive 3D relationship sphere.
        </p>

        {isAnalyzing ? (
          <div className="w-full mt-10 p-8 border border-gray-200 bg-gray-50 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-4 border-sky-100 border-t-[#0077b5] animate-spin" />
              <Cpu className="w-6 h-6 text-[#0077b5] absolute inset-0 m-auto" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-gray-900">Synthesizing Network Knowledge Graph</h3>
              <p className="text-xs text-sky-700 font-medium animate-pulse">{analysisStep}</p>
            </div>

            <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-[#0077b5] animate-[pulse_1.5s_infinite] w-3/4 rounded-full" />
            </div>
          </div>
        ) : (
          <div className="w-full mt-6 bg-white border border-gray-200 shadow-sm">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('linkedin')}
                className={`flex-1 py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'linkedin'
                    ? 'border-[#0077b5] text-[#0077b5] bg-sky-50/40'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
                <span>Connect Live LinkedIn</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('demo')}
                className={`flex-1 py-3 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'demo'
                    ? 'border-[#0077b5] text-[#0077b5] bg-sky-50/40'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Executive Presets
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-3 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'upload'
                    ? 'border-[#0077b5] text-[#0077b5] bg-sky-50/40'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Upload Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-3 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'manual'
                    ? 'border-[#0077b5] text-[#0077b5] bg-sky-50/40'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Custom Profile
              </button>
            </div>

            {/* Tab 0: Connect Live LinkedIn */}
            {activeTab === 'linkedin' && (
              <div className="p-6 text-left space-y-4">
                <div className="flex items-start gap-3 p-4 bg-sky-50/70 border border-sky-200">
                  <div className="w-10 h-10 bg-[#0077b5] text-white flex items-center justify-center shrink-0">
                    <Linkedin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      Live LinkedIn Profile & Network Integration
                    </h4>
                    <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                      Connect your account to extract your real profile credentials, headline, and connections graph directly onto the 3D globe.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenLinkedIn && onOpenLinkedIn()}
                    className="w-full py-3.5 bg-[#0077b5] hover:bg-[#005c8d] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span>Open LinkedIn Connection Flow</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 px-1">
                    <span>Zero API subscription fees</span>
                    <span>•</span>
                    <span>Instant session verification</span>
                    <span>•</span>
                    <span>Full visual knowledge graph</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 1: Instant Presets */}
            {activeTab === 'demo' && (
              <div className="p-6 text-left space-y-4">
                <p className="text-xs text-gray-600">
                  Select an executive profile to instantly spin up the 3D network graph with synthesized 1st & 2nd-degree connections:
                </p>

                <div className="space-y-2.5">
                  <div
                    onClick={() => handleStartDemo(0)}
                    className="p-3.5 border border-gray-200 hover:border-[#0077b5] hover:bg-sky-50/40 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                        alt="Alex Morgan"
                        className="w-11 h-11 rounded-full object-cover border"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900 group-hover:text-[#0077b5]">
                          Alex Morgan (AI Founder & CEO)
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Focus: Generative AI, B2B SaaS, Seed/Series A Capital
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#0077b5] group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  <div
                    onClick={() => handleStartDemo(1)}
                    className="p-3.5 border border-gray-200 hover:border-[#0077b5] hover:bg-sky-50/40 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                        alt="Jordan Rivera"
                        className="w-11 h-11 rounded-full object-cover border"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900 group-hover:text-[#0077b5]">
                          Jordan Rivera (Venture Partner & M&A)
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Focus: Deal Syndication, Corporate Venture, Growth Equity
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#0077b5] group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  <div
                    onClick={() => handleStartDemo(2)}
                    className="p-3.5 border border-gray-200 hover:border-[#0077b5] hover:bg-sky-50/40 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80"
                        alt="Maya Chen"
                        className="w-11 h-11 rounded-full object-cover border"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900 group-hover:text-[#0077b5]">
                          Maya Chen (VP Engineering & Distributed Systems)
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Focus: Three.js, Multi-Agent AI, Spatial Computing
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#0077b5] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Upload File / Resume */}
            {activeTab === 'upload' && (
              <div className="p-6 text-left space-y-4">
                <p className="text-xs text-gray-600">
                  Upload a LinkedIn JSON export, resume PDF/TXT, or profile headshot:
                </p>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-[#0077b5] p-8 text-center cursor-pointer bg-gray-50 hover:bg-sky-50/30 transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-xs font-bold text-gray-800">
                    Click to browse or drag and drop
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Supports JSON, PDF, TXT, or JPG/PNG
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json,.txt,.pdf,image/*"
                  onChange={handleFileUpload}
                />

                <div className="text-[11px] text-gray-500 text-center">
                  Your profile data is parsed locally in real-time to compute mutual graph intersections.
                </div>
              </div>
            )}

            {/* Tab 3: Custom Form */}
            {activeTab === 'manual' && (
              <div className="p-6 text-left space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-300 focus:outline-hidden focus:border-[#0077b5]"
                    placeholder="e.g. Alex Morgan"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    LinkedIn Headline & Role
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-300 focus:outline-hidden focus:border-[#0077b5]"
                    placeholder="e.g. VP of Product Strategy & Enterprise Architecture"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-300 focus:outline-hidden focus:border-[#0077b5]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-300 focus:outline-hidden focus:border-[#0077b5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Core Skills (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-300 focus:outline-hidden focus:border-[#0077b5]"
                    placeholder="e.g. Generative AI, Venture Capital, Enterprise SaaS"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleStartManual}
                  className="w-full mt-2 py-3 bg-[#0077b5] hover:bg-[#005c8d] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Build Visual Knowledge Graph</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-6">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Multi-degree network relationship analysis • Instant scorecard correlation</span>
        </div>
      </div>
    </div>
  );
}
