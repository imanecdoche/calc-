import React, { useState, useEffect } from 'react';
import { Menu, Search, ArrowLeft, Heart, Globe, BookOpen, MessageSquare, Edit3, Award, ExternalLink } from 'lucide-react';

interface WikiLockScreenProps {
  onUnlockToCalculator: () => void;
}

interface WikiArticle {
  title: string;
  category: string;
  tagline: string;
  lastUpdated: string;
  summary: string;
  sections: {
    heading: string;
    paragraphs: string[];
  }[];
  infobox?: {
    label: string;
    value: string;
  }[];
}

const WIKI_ARTICLES: WikiArticle[] = [
  {
    title: 'Kucing',
    category: 'Sains & Alam',
    tagline: 'Dari Wikipedia bahasa Indonesia, ensiklopedia bebas',
    lastUpdated: 'Halaman ini terakhir diubah pada 10 Juli 2026, pukul 14.20.',
    summary: 'Kucing (Felis catus), yang juga dikenal sebagai kucing domestik atau kucing rumah, adalah spesies mamalia karnivora kecil yang dijinakkan. Kucing adalah satu-satunya spesies yang dijinakkan dalam keluarga Felidae dan sering disebut sebagai kucing domestik untuk membedakannya dari anggota liar keluarga tersebut.',
    infobox: [
      { label: 'Kerajaan', value: 'Animalia' },
      { label: 'Filum', value: 'Chordata' },
      { label: 'Kelas', value: 'Mammalia' },
      { label: 'Ordo', value: 'Carnivora' },
      { label: 'Famili', value: 'Felidae' },
      { label: 'Genus', value: 'Felis' },
      { label: 'Spesies', value: 'F. catus' },
    ],
    sections: [
      {
        heading: 'Karakteristik',
        paragraphs: [
          'Kucing domestik memiliki anatomi yang mirip dengan felid liar lainnya, dengan tubuh fleksibel yang kuat, refleks cepat, gigi tajam, dan cakar yang dapat ditarik yang disesuaikan untuk membunuh mangsa kecil. Indera penglihatannya di malam hari dan indera penciumannya sangat berkembang.',
          'Sebagai hewan peliharaan, kucing sangat populer di seluruh dunia karena sifatnya yang mandiri, bersih, dan kemampuan mereka berburu hama rumah tangga seperti tikus dan serangga.'
        ]
      },
      {
        heading: 'Perilaku',
        paragraphs: [
          'Kucing adalah hewan soliter namun dapat membentuk koloni sosial. Mereka berkomunikasi menggunakan vokalisasi seperti mengeong, mendengkur (purring), mendesis, dan bahasa tubuh.',
          'Kucing menghabiskan banyak waktu untuk merawat diri (grooming) guna menjaga kebersihan bulu mereka dan mengatur suhu tubuh.'
        ]
      },
      {
        heading: 'Hubungan dengan Manusia',
        paragraphs: [
          'Kucing telah berasosiasi dengan manusia selama setidaknya 9.500 tahun. Di Mesir Kuno, kucing dianggap sebagai hewan suci dan dipuja sebagai lambang perlindungan.',
          'Saat ini, terdapat puluhan ras kucing yang diakui secara resmi, mulai dari kucing persia yang berbulu lebat hingga kucing sphynx yang tidak berbulu sama sekali.'
        ]
      }
    ]
  },
  {
    title: 'Mekanika Kuantum',
    category: 'Fisika',
    tagline: 'Dari Wikipedia bahasa Indonesia, ensiklopedia bebas',
    lastUpdated: 'Halaman ini terakhir diubah pada 28 Juni 2026, pukul 09.45.',
    summary: 'Mekanika kuantum adalah cabang dasar fisika yang menggantikan mekanika klasik pada tataran atom dan subatom. Mekanika kuantum memberikan kerangka matematika untuk menjelaskan sifat dualitas gelombang-partikel, asas ketidakpastian Heisenberg, dan kuantisasi energi.',
    infobox: [
      { label: 'Bidang ilmu', value: 'Fisika Teoretis' },
      { label: 'Tokoh utama', value: 'Max Planck, Albert Einstein, Niels Bohr, Werner Heisenberg, Erwin Schrödinger' },
      { label: 'Konsep dasar', value: 'Kuantisasi energi, Dualisme gelombang-partikel, Superposisi, Keterikatan kuantum' },
    ],
    sections: [
      {
        heading: 'Sejarah Singkat',
        paragraphs: [
          'Teori kuantum bermula pada tahun 1900 ketika Max Planck mengusulkan bahwa energi dipancarkan dalam paket-paket diskret yang disebut "kuanta". Albert Einstein kemudian memperluas konsep ini untuk menjelaskan efek fotolistrik pada tahun 1905.',
          'Pada tahun 1920-an, rumusan matematika mekanika kuantum yang lengkap berhasil disusun oleh fisikawan terkemuka dunia seperti Schrödinger melalui persamaan gelombangnya dan Heisenberg melalui mekanika matriks.'
        ]
      },
      {
        heading: 'Interpretasi Kopenhagen',
        paragraphs: [
          'Interpretasi Kopenhagen, yang dirumuskan oleh Niels Bohr dan Werner Heisenberg, menyatakan bahwa sistem fisik tidak memiliki sifat yang pasti sebelum diukur. Pengukuran memaksa sistem untuk memilih salah satu dari beberapa probabilitas keadaan (runtuhnya fungsi gelombang).',
          'Konsep superposisi ini digambarkan secara populer melalui eksperimen pikiran legendaris yang dikenal sebagai "Kucing Schrödinger".'
        ]
      }
    ]
  },
  {
    title: 'Galaksi Bima Sakti',
    category: 'Astronomi',
    tagline: 'Dari Wikipedia bahasa Indonesia, ensiklopedia bebas',
    lastUpdated: 'Halaman ini terakhir diubah pada 5 Juli 2026, pukul 23.11.',
    summary: 'Bima Sakti adalah galaksi spiral berbatang tempat Tata Surya kita berada. Galaksi ini terdiri dari ratusan miliar bintang, planet, gas, dan debu kosmik yang terikat bersama oleh gaya gravitasi yang sangat masif.',
    infobox: [
      { label: 'Tipe galaksi', value: 'Spiral berbatang (SBbc)' },
      { label: 'Diameter', value: '100.000–200.000 tahun cahaya' },
      { label: 'Jumlah bintang', value: '100–400 miliar' },
      { label: 'Massa', value: '1,5 × 10¹² massa matahari' },
      { label: 'Lokasi Tata Surya', value: 'Lengan Orion' },
    ],
    sections: [
      {
        heading: 'Struktur Galaksi',
        paragraphs: [
          'Bima Sakti berbentuk piringan datar raksasa dengan tonjolan pusat yang padat (central bulge). Dari pusat ini, beberapa lengan spiral utama melengkung keluar, termasuk Lengan Perseus, Lengan Sagittarius, dan Lengan Orion.',
          'Pusat galaksi menampung sebuah lubang hitam supermasif yang dikenal sebagai Sagittarius A*, yang memiliki massa sekitar 4 juta kali lipat massa matahari kita.'
        ]
      },
      {
        heading: 'Etimologi Nama',
        paragraphs: [
          'Nama "Bima Sakti" berasal dari tokoh pewayangan Jawa, Bima. Penampakan pita putih susu di langit malam mengingatkan orang Jawa kuno pada adegan Bima yang dililit naga sakti.',
          'Dalam bahasa Inggris, galaksi ini disebut "Milky Way", berasal dari bahasa Latin "Via Lactea", karena bentuknya yang tampak seperti tumpahan susu di kubah langit malam.'
        ]
      }
    ]
  },
  {
    title: 'Sejarah Internet',
    category: 'Teknologi',
    tagline: 'Dari Wikipedia bahasa Indonesia, ensiklopedia bebas',
    lastUpdated: 'Halaman ini terakhir diubah pada 1 Juli 2026, pukul 11.02.',
    summary: 'Sejarah internet dimulai pada paruh kedua abad ke-20 dengan pengembangan komputer elektronik. Jaringan militer Amerika Serikat, ARPANET, didirikan pada tahun 1969 dan diakui secara luas sebagai fondasi pertama yang melahirkan protokol komunikasi internet modern (TCP/IP).',
    infobox: [
      { label: 'Tahun mulai', value: '1969 (ARPANET)' },
      { label: 'Protokol inti', value: 'TCP/IP' },
      { label: 'Penemu WWW', value: 'Tim Berners-Lee (1989)' },
      { label: 'Layanan awal', value: 'E-mail, FTP, Telnet' },
    ],
    sections: [
      {
        heading: 'Era ARPANET',
        paragraphs: [
          'ARPANET (Advanced Research Projects Agency Network) didanai oleh Departemen Pertahanan AS selama Perang Dingin untuk menciptakan sistem komunikasi yang tangguh dan terdesentralisasi, sehingga tetap berfungsi meskipun sebagian jaringan hancur.',
          'Pesan pertama yang dikirimkan melalui ARPANET adalah kata "LO", yang dimaksudkan sebagai kata "LOGIN", tetapi sistem mengalami crash setelah huruf kedua dikirimkan.'
        ]
      },
      {
        heading: 'Kelahiran World Wide Web (WWW)',
        paragraphs: [
          'Pada tahun 1989, ilmuwan Inggris Tim Berners-Lee yang bekerja di CERN mengusulkan sistem manajemen informasi berbasis dokumen hiperteks yang dapat diakses antar komputer di jaringan. Sistem ini kemudian dikenal sebagai World Wide Web.',
          'WWW membuat internet menjadi sangat mudah digunakan oleh masyarakat umum melalui browser web grafis pertama seperti Mosaic pada tahun 1993, memicu ledakan digital global.'
        ]
      }
    ]
  }
];

export default function WikiLockScreen({ onUnlockToCalculator }: WikiLockScreenProps) {
  const [activeArticle, setActiveArticle] = useState<WikiArticle>(WIKI_ARTICLES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [likes, setLikes] = useState(124);
  const [hasLiked, setHasLiked] = useState(false);
  const [currentIframeUrl, setCurrentIframeUrl] = useState('https://id.m.wikipedia.org/wiki/Istimewa:Acak');
  const [useIframe, setUseIframe] = useState(false);
  const [showSearchFeedback, setShowSearchFeedback] = useState(false);

  // Set random article on mount
  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * WIKI_ARTICLES.length);
    setActiveArticle(WIKI_ARTICLES[randomIdx]);
    setLikes(Math.floor(Math.random() * 200) + 50);
  }, []);

  const handleRandomize = () => {
    if (useIframe) {
      // Reload iframe with a fresh random seed/timestamp to force navigation
      setCurrentIframeUrl(`https://id.m.wikipedia.org/wiki/Istimewa:Acak?t=${Date.now()}`);
    } else {
      const filtered = WIKI_ARTICLES.filter(a => a.title !== activeArticle.title);
      const randomIdx = Math.floor(Math.random() * filtered.length);
      setActiveArticle(filtered[randomIdx]);
      setLikes(Math.floor(Math.random() * 200) + 50);
      setHasLiked(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Search offline articles
    const found = WIKI_ARTICLES.find(
      a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           a.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (found) {
      setActiveArticle(found);
      setSearchQuery('');
      setShowSearchFeedback(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setShowSearchFeedback(true);
      setTimeout(() => setShowSearchFeedback(false), 3000);
    }
  };

  const toggleLike = () => {
    if (hasLiked) {
      setLikes(likes - 1);
      setHasLiked(false);
    } else {
      setLikes(likes + 1);
      setHasLiked(true);
    }
  };

  return (
    <div className="w-full h-full bg-white text-neutral-800 flex flex-col overflow-hidden relative selection:bg-blue-100 select-text">
      
      {/* Real Mobile Wikipedia Header layout */}
      <header className="sticky top-0 bg-white border-b border-neutral-200 z-50 flex items-center justify-between px-3 h-12 flex-none select-none">
        <div className="flex items-center space-x-2">
          {/* SECURE ESCAPE HAMBURGER BUTTON (Looks 100% like Wikipedia mobile menu) */}
          <button
            onClick={onUnlockToCalculator}
            title="Menu Utama"
            aria-label="Menu Utama"
            className="p-2 text-neutral-700 hover:bg-neutral-100 rounded-lg active:scale-95 transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <Menu size={20} className="text-neutral-600 stroke-[2.2]" />
          </button>
          
          <div className="flex flex-col justify-center">
            <span className="font-serif text-[17px] font-semibold tracking-tight text-neutral-850 flex items-center space-x-1">
              <span className="font-extrabold text-neutral-900">W</span>
              <span className="text-[13px] font-sans tracking-widest text-neutral-500 uppercase font-bold ml-1">WIKIPEDIA</span>
            </span>
          </div>
        </div>

        {/* Top-Right action items */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setUseIframe(!useIframe)}
            className="px-2.5 py-1 text-[10px] font-sans font-bold uppercase tracking-wider rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-50 active:scale-95 transition cursor-pointer mr-1"
          >
            {useIframe ? 'MOCK VIEW' : 'LIVE WIKI'}
          </button>
          <button 
            onClick={handleRandomize}
            title="Artikel Acak"
            className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition active:scale-95 cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
          >
            <Globe size={16} />
          </button>
        </div>
      </header>

      {/* Wikipedia Search Bar */}
      <div className="bg-[#f8f9fa] border-b border-neutral-200 py-2.5 px-4 flex-none select-none">
        <form onSubmit={handleSearchSubmit} className="relative max-w-lg mx-auto">
          <input
            type="text"
            placeholder="Cari di Wikipedia bahasa Indonesia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-neutral-300 focus:border-blue-600 text-[13px] text-neutral-800 rounded focus:outline-none placeholder-neutral-400 shadow-sm"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        </form>
        {showSearchFeedback && (
          <p className="text-[10px] text-red-500 text-center mt-1 font-sans">
            Artikel tidak ditemukan di laci luring. Mencoba mencari...
          </p>
        )}
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto bg-white">
        {useIframe ? (
          /* Live mobile random Wikipedia page */
          <div className="w-full h-full relative">
            <iframe
              src={currentIframeUrl}
              className="w-full h-full border-none"
              title="Wikipedia Live Frame"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        ) : (
          /* Beautiful offline high-fidelity Wikipedia simulator */
          <div className="px-5 py-5 max-w-xl mx-auto font-sans leading-relaxed text-neutral-800">
            {/* Category / Banner */}
            <div className="flex items-center space-x-1.5 mb-1.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider font-mono">
              <BookOpen size={11} />
              <span>{activeArticle.category}</span>
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl font-normal text-neutral-900 border-b border-neutral-200 pb-2 mb-2 leading-tight">
              {activeArticle.title}
            </h1>

            {/* Tagline */}
            <p className="text-xs text-neutral-400 italic mb-4 font-sans">
              {activeArticle.tagline}
            </p>

            {/* Infobox & Summary Grid */}
            <div className="flex flex-col md:flex-row gap-5 mb-5 items-start">
              {/* Infobox (Left/Right depending on space, stack in mobile) */}
              {activeArticle.infobox && (
                <div className="w-full sm:w-64 border border-neutral-200 bg-[#f8f9fa] rounded p-3 text-xs shadow-xs flex-shrink-0 font-sans">
                  <h3 className="font-bold border-b border-neutral-200 pb-1.5 text-center mb-2 uppercase text-neutral-700 tracking-wider">
                    Informasi Spesies
                  </h3>
                  <table className="w-full">
                    <tbody>
                      {activeArticle.infobox.map((row, idx) => (
                        <tr key={idx} className="border-b border-neutral-100 last:border-none">
                          <td className="py-1.5 font-bold text-neutral-500 w-24 align-top">{row.label}</td>
                          <td className="py-1.5 text-neutral-800 font-medium">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Main Summary */}
              <div className="flex-1 text-[14px] leading-relaxed text-neutral-800 font-sans">
                <p className="mb-4">{activeArticle.summary}</p>
              </div>
            </div>

            {/* Sections */}
            {activeArticle.sections.map((sec, idx) => (
              <section key={idx} className="mb-6 font-sans">
                <h2 className="font-serif text-lg font-bold border-b border-neutral-200 pb-1.5 mb-3 text-neutral-900 flex items-center space-x-2">
                  <span className="text-neutral-300 text-sm font-mono mr-1">0{idx + 1}</span>
                  <span>{sec.heading}</span>
                </h2>
                {sec.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="mb-3 text-[13.5px] leading-relaxed text-neutral-750">
                    {p}
                  </p>
                ))}
              </section>
            ))}

            {/* Interactive Article Footer actions */}
            <div className="border-t border-neutral-200 pt-4 mt-8 flex flex-wrap items-center justify-between text-xs text-neutral-500 gap-3">
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleLike}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border transition cursor-pointer font-sans ${
                    hasLiked 
                      ? 'bg-rose-50 border-rose-200 text-rose-600 font-semibold' 
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Heart size={12} className={hasLiked ? 'fill-rose-500 stroke-rose-600' : ''} />
                  <span>Sukai ({likes})</span>
                </button>
                <button 
                  onClick={handleRandomize}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition cursor-pointer font-sans"
                >
                  <Globe size={12} />
                  <span>Artikel Lainnya</span>
                </button>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">{activeArticle.lastUpdated}</span>
            </div>

            {/* Educational Disclaimer banner */}
            <div className="mt-10 p-4 bg-blue-50/50 border border-blue-100 rounded-lg text-[11px] text-neutral-500 leading-normal font-sans">
              <div className="flex items-center space-x-2 mb-1.5 font-bold text-blue-800">
                <Award size={13} className="text-blue-700" />
                <span>Rekomendasi Edukasi Hari Ini</span>
              </div>
              Mari dukung penyebaran ilmu pengetahuan bebas dengan membaca dan berkontribusi secara berkala di ensiklopedia daring global terbesar.
            </div>
          </div>
        )}
      </div>

      {/* Mini Wikipedia Mobile Footer */}
      <footer className="h-10 bg-[#f8f9fa] border-t border-neutral-200 flex items-center justify-between px-4 text-[10px] text-neutral-400 font-sans flex-none select-none">
        <span>© Wikipedia ® Konten tersedia di bawah lisensi CC BY-SA 4.0</span>
        <a 
          href="https://id.wikipedia.org" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:underline flex items-center space-x-0.5"
        >
          <span>Buka di Browser</span>
          <ExternalLink size={8} />
        </a>
      </footer>

    </div>
  );
}
