const LANGUAGES = {
  en:{name:'English',flag:'🇬🇧',dir:'ltr'},
  fr:{name:'Français',flag:'🇫🇷',dir:'ltr'},
  ha:{name:'Hausa',flag:'🇳🇬',dir:'ltr'},
  ig:{name:'Igbo',flag:'🇳🇬',dir:'ltr'},
  yo:{name:'Yorùbá',flag:'🇳🇬',dir:'ltr'}
};

const TRANSLATIONS = {
  en:{
    nav_platform:'Platform',nav_client:'Client',nav_engineer:'Engineer',
    nav_supplier:'Supplier',nav_legal:'Legal',nav_get_started:'Get Started',nav_login:'Login',
    hero_badge:'Remote Construction Supervision — Nigeria',
    hero_title_1:'Build with',hero_title_em:'confidence,',hero_title_2:'from anywhere.',
    hero_sub:"Vistru connects clients, licensed engineers, material suppliers, and legal professionals through one trusted platform — with AI-powered site monitoring and escrow-protected payments, so your project is never out of sight.",
    hero_cta_primary:'Start a Project',hero_cta_outline:'How it Works ↓',
    stat_sections:'Platform Sections',stat_monitoring:'AI + CCTV Monitoring',
    stat_verified:'Verified Professionals',stat_escrow:'Protected Payments',
    how_label:'Process',
    how_title:'From land to handover, fully supervised.',
    how_sub:"Every stage of your building project is managed transparently through Vistru's verified pipeline.",
    step1_title:'Land Document Verification',
    step1_desc:'Upload scanned land ownership documents. A platform lawyer verifies legitimacy and confirms zero dispute before any work begins.',
    step2_title:'Drawing Upload & BOQ Bidding',
    step2_desc:'Upload architectural and structural drawings. Licensed engineers submit competitive Bills of Quantity. You select the best.',
    step3_title:'Contract Preparation',
    step3_desc:'The platform lawyer drafts a binding contract between client and engineer. Arbitration is available at any point.',
    step4_title:'Milestone Escrow Payments',
    step4_desc:'Fund each milestone into escrow. Funds released to the engineer only after you confirm completion via CCTV and AI reports.',
    step5_title:'AI + CCTV Site Monitoring',
    step5_desc:'Vistru agents deploy cameras at strategic positions. AI monitors progress, counts materials, and sends you periodic reports.',
    step6_title:'Final Inspection & Handover',
    step6_desc:'Vistru conducts a final inspection. You confirm completion, escrow releases, and the project is formally handed over.',
    portals_label:'Portals',
    portals_title:'Built for every stakeholder.',
    portals_sub:'Each participant has a dedicated dashboard designed around their specific workflow.',
    role_client:'Client',
    role_client_desc:'Upload land documents, select engineers via BOQ, monitor CCTV feeds, approve escrow payments, and file disputes.',
    role_engineer:'Civil Engineer',
    role_engineer_desc:'Receive project notifications, review drawings, submit BOQs, track milestones, apply for project loans, and manage credentials.',
    role_supplier:'Material Supplier',
    role_supplier_desc:'List your inventory and store location. Receive material orders, manage deliveries, and collect escrow releases.',
    role_lawyer:'Legal Personnel',
    role_lawyer_desc:'Verify land titles, draft client-engineer contracts, and manage arbitration cases for disputes.',
    portal_access:'Access Portal →',
    footer_desc:"Nigeria's remote construction supervision platform — securing projects from land verification to handover.",
    footer_platform:'Platform',footer_portals:'Portals',footer_company:'Company',
    footer_how:'How it Works',footer_overview:'System Overview',footer_cctv:'CCTV & AI',
    footer_escrow:'Escrow System',footer_about:'About Vistru',footer_contact:'Contact',
    footer_privacy:'Privacy Policy',footer_terms:'Terms of Service',
    footer_copy:'© 2025 Vistru Technologies Ltd · All rights reserved'
  },
  fr:{
    nav_platform:'Plateforme',nav_client:'Client',nav_engineer:'Ingénieur',
    nav_supplier:'Fournisseur',nav_legal:'Juridique',
    nav_get_started:'Commencer',nav_login:'Connexion',
    hero_badge:'Supervision de Construction à Distance — Nigeria',
    hero_title_1:'Construisez avec',hero_title_em:'confiance,',hero_title_2:'de partout.',
    hero_sub:"Vistru connecte les clients, ingénieurs agréés, fournisseurs de matériaux et professionnels juridiques via une plateforme de confiance.",
    hero_cta_primary:'Démarrer un Projet',hero_cta_outline:'Comment ça marche ↓',
    stat_sections:'Sections Plateforme',stat_monitoring:'Surveillance IA + CCTV',
    stat_verified:'Professionnels Vérifiés',stat_escrow:'Paiements Protégés',
    portals_label:'Portails',portals_title:'Conçu pour chaque partie prenante.',
    role_client:'Client',role_engineer:'Ingénieur Civil',
    role_supplier:'Fournisseur de Matériaux',role_lawyer:'Personnel Juridique',
    portal_access:'Accéder au Portail →',
    footer_copy:'© 2025 Vistru Technologies Ltd · Tous droits réservés'
  },
  ha:{
    nav_platform:'Dandali',nav_client:'Abokin Ciniki',nav_engineer:'Injiniya',
    nav_supplier:'Mai Kayan Gini',nav_legal:'Shari\'a',nav_get_started:'Fara',nav_login:'Shiga',
    hero_badge:'Kulawa kan Gini daga Nesa — Najeriya',
    hero_title_1:'Gina da',hero_title_em:'kwanciyar hankali,',hero_title_2:'daga ko ina.',
    hero_sub:'Vistru na haɗa abokan ciniki, injiniyoyi, masu kayan gini, da ƙwararrun doka ta hanyar tsarin amincewa guda ɗaya.',
    hero_cta_primary:'Fara Aikin Gini',hero_cta_outline:'Yadda Yake Aiki ↓',
    stat_sections:'Sassan Dandali',stat_monitoring:'Sa Ido na AI + CCTV',
    stat_verified:'Ƙwararrun da aka Tabbatar',stat_escrow:'Biyan Kuɗi Mai Kariya',
    portals_label:'Hanyoyin Shiga',portals_title:'An gina don kowane mai ruwa da tsaki.',
    role_client:'Abokin Ciniki',role_engineer:'Injiniyan Farar Hula',
    role_supplier:'Mai Kayan Gini',role_lawyer:'Ma\'aikacin Doka',
    portal_access:'Shiga Hanya →',
    footer_copy:'© 2025 Vistru Technologies Ltd'
  },
  ig:{
    nav_platform:'Ọdịdị',nav_client:'Onye Ahịa',nav_engineer:'Injinia',
    nav_supplier:'Onye Nnyefe',nav_legal:'Iwu',nav_get_started:'Bido',nav_login:'Banye',
    hero_badge:'Nleba Anya n\'Ọrụ Owuwu site n\'Ebe Ọzọ — Naịjirịa',
    hero_title_1:'Wuo na',hero_title_em:'ntụkwasị obi,',hero_title_2:'site n\'ebe ọ bụla.',
    hero_sub:'Vistru na-ejikọta ndị ahịa, ndị injinia, ndị na-ewere ihe owuwu, na ndị ọkachamara iwu site n\'otu sistemu a na-atụkwasị obi.',
    hero_cta_primary:'Bido Ọrụ Owuwu',hero_cta_outline:'Otu O Si Arụ Ọrụ ↓',
    stat_sections:'Ngalaba Ọdịdị',stat_monitoring:'Nleba Anya AI + CCTV',
    stat_verified:'Ndị Ọkachamara Edoziri',stat_escrow:'Ịkwụ Ụgwọ Na-echebe',
    portals_label:'Ọnụ Ụzọ',portals_title:'Ewulitere maka onye ọ bụla.',
    role_client:'Onye Ahịa',role_engineer:'Injinia Farar Hula',
    role_supplier:'Onye Nnyefe Ihe Owuwu',role_lawyer:'Onye Ọrụ Iwu',
    portal_access:'Banye Ọnụ Ụzọ →',
    footer_copy:'© 2025 Vistru Technologies Ltd'
  },
  yo:{
    nav_platform:'Pẹpẹ',nav_client:'Onibara',nav_engineer:'Ẹnjiniọ',
    nav_supplier:'Oníṣẹ Ohun Elo',nav_legal:'Ofin',nav_get_started:'Bẹrẹ',nav_login:'Wọle',
    hero_badge:'Abojuto Ikọle lati Jijin — Nàìjíríà',
    hero_title_1:'Kọ pẹlu',hero_title_em:'igbẹkẹle,',hero_title_2:'lati ibikibi.',
    hero_sub:'Vistru so awọn onibara, awọn ẹnjiniọ, awọn oníṣẹ ohun elo, ati awọn alamọja ofin pọ nipasẹ eto igbẹkẹle kan.',
    hero_cta_primary:'Bẹrẹ Iṣẹ',hero_cta_outline:'Bí O Ṣe Ń Ṣiṣẹ ↓',
    stat_sections:'Awọn Apakan Pẹpẹ',stat_monitoring:'Abojuto AI + CCTV',
    stat_verified:'Awọn Ọjọgbọn Ti A Fọwọsi',stat_escrow:'Awọn Isanwo Ti A Daabobo',
    portals_label:'Awọn Ẹnu-bode',portals_title:'Ti a kọ fun gbogbo ẹni.',
    role_client:'Onibara',role_engineer:'Ẹnjiniọ Ara Ilu',
    role_supplier:'Oníṣẹ Ohun Elo Ikọle',role_lawyer:'Oṣiṣẹ Ofin',
    portal_access:'Wọle si Ẹnu-bode →',
    footer_copy:'© 2025 Vistru Technologies Ltd'
  }
};

const i18n = {
  currentLang: localStorage.getItem('vistru_lang') || 'en',
  t(key) {
    return (TRANSLATIONS[this.currentLang] && TRANSLATIONS[this.currentLang][key])
      || TRANSLATIONS['en'][key] || key;
  },
  setLang(code) {
    if (!LANGUAGES[code]) return;
    this.currentLang = code;
    localStorage.setItem('vistru_lang', code);
    document.documentElement.lang = code;
    this.applyToPage();
  },
  applyToPage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = this.t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = val;
      } else {
        el.textContent = val;
      }
    });
    const cur = document.getElementById('lang-current');
    if (cur && LANGUAGES[this.currentLang]) {
      cur.textContent = LANGUAGES[this.currentLang].flag + ' ' + LANGUAGES[this.currentLang].name;
    }
  },
  getLangs() { return LANGUAGES; },
  getCurrentLang() { return this.currentLang; }
};

document.addEventListener('DOMContentLoaded', () => i18n.applyToPage());