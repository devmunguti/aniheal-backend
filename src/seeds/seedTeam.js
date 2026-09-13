const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { mongoUri } = require('../config/environment');
const TeamMember = require('../models/TeamMember');

const teamMembers = [
  {
    slug: 'dr-eleanor-vance',
    name: 'Dr. Eleanor Vance',
    title: 'BVM, MSc Large Animal Medicine, Fellow KVB',
    category: ['leadership'],
    roleTag: 'Clinical Director',
    specialtyTag: 'Lead Large-Herd Clinician',
    kvbLicense: 'KVB: 0842-VS',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC6uHQ0mK1vEbJJ7r5iSwnI6VManp47wrpdFR4a4mQLfZ0VYyHuIioZ1ZYRruHuVt8eQqLj__ff8hRhsBEr-q4e0TFGggcPtmt_aNgCSXUDsUPTESJ-lz7tlx2NYVgwg6QjXgdPDrLPBcksTPOcwTzk6nkcojhVyDG4W113V_weBBx5fonyW9aVoVIvNUYfPMkloDK2TY204SXrKlpf5ZFX9CqcoTK9u1KGJZiQFMFov3KNI1vK564J',
    bio: 'Serving as Senior Veterinary Director at AniHeal, Dr. Vance steers commercial herd health programs across Kenya, specializing in bovine metabolic integrity, epidemic containment, and intensive dairy health protocols. She oversees our regional clinical hubs and acts as principal advisor for One Health livestock biosecurity.',
    location: 'Naivasha & Central Rift Diagnostic Core',
    experience: '18+ Years Field Experience',
    actionLabel: 'Request Specialist Consult',
    isDirector: true,
    directorSpecialty: 'Herd Theriogenology & Metabolic Care',
    directorAccreditation: 'Licensed Surgeon (KVB/SRG/2006)',
    directorDutyHub: 'Naivasha & Central Rift Diagnostic Core',
    email: 'e.vance@aniheal.co.ke',
    sortOrder: 1,
    isPublished: true,
  },
  {
    slug: 'dr-dennis-kipchumba',
    name: 'Dr. Dennis Kipchumba',
    title: 'BVM, MSc Veterinary Surgery (UoN)',
    category: ['field-surgery'],
    roleTag: 'Surgical Lead',
    specialtyTag: 'Field Surgery',
    kvbLicense: 'KVB: 1248-VS',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAwEQECb8OurVoi2GFDxSPomx5mCzT1SPE2x6JKkK4uwMPyk36iit-a7RG1-Qt28yyNu-iiQqN-C7zWmf3jnNf0ERgucQupyrUKISH80Ov4HXHZIZ1n_zBZ-92rZqr7TzQ8xM7i9pZ5pwvilXPSndralMnY9aBrtKJpQj5YltnY8A1pq5x4ghVeQtwzFyr516MZ_UDD5uXEpxDhp_g8eq4EK23Ye7UCLLacU8LqbbPAq2La-_VWujuo',
    bio: 'Chief Field Surgeon and Emergency Triage Lead. Directs rapid response ambulatory interventions for equine abdominal crises, cesarean livestock emergencies, and orthopedic stabilization.',
    location: 'Eldoret Mobile Lab',
    experience: '12 Yrs Active',
    actionLabel: 'Dispatch Surgical Unit',
    isDirector: false,
    email: 'd.kipchumba@aniheal.co.ke',
    sortOrder: 2,
    isPublished: true,
  },
  {
    slug: 'dr-grace-wanjiku',
    name: 'Dr. Grace Wanjiku',
    title: 'BVM, PhD Vet Epidemiology (Edinburgh)',
    category: ['one-health', 'leadership'],
    roleTag: 'Biosecurity',
    specialtyTag: 'One Health Surveillance',
    kvbLicense: 'KVB: 0917-EP',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDJS382Pd1JFmwtNrnYPt2c6NXrHF5v5CpMpmMi9PSnogKWH-XPwzspoKM-mM0xLeZYdh1U8PT0rEeYzTOLomHEHKTDTe_LEXaGfxrnSB_-eehc5w_VtsdlOrTCV8bDVvVV9FTh8uNcaTPTD4edOyoeiJslLn8YB6H8gTOKhWLmKWNCmWjgC_X-Nc3-WJBPgFPozvcLubGhggI5xxv3LJqLSq3k7GcjVz837Da_zXlEMDgEaNRFiYA0',
    bio: 'One Health & Biosecurity Director. Specialist in zoonotic spillover control, antimicrobial resistance (AMR) mitigation, and cross-border disease surveillance in commercial herds.',
    location: 'Nairobi Central HQ',
    experience: 'WOAH Contributor',
    actionLabel: 'Epidemiology Audit',
    isDirector: false,
    email: 'g.wanjiku@aniheal.co.ke',
    sortOrder: 3,
    isPublished: true,
  },
  {
    slug: 'dr-tariq-al-mansoor',
    name: 'Dr. Tariq Al-Mansoor',
    title: 'MVSc Theriogenology',
    category: ['theriogenology'],
    roleTag: 'Genomics',
    specialtyTag: 'Reproductive Health',
    kvbLicense: 'KVB: 1512-TR',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB7CgHXSSzQIsuq94XF-7j_g3-QLLNmYJ2NKq4Azzia2cQBlVIzPlW296KfRAWaOUZP6R0_HzmN_1NR_E2DRbrRPIB2jkFoSmkcSLb-bsA-BM1OFyZndFWT4QQq0J03vsR8z4dO6ZZFLY81K7cjqaa1iaTUNl76QLsOzQ7ZbxzEDR97avPRl_hT53YHs3mB04SMd7QF3vAYpbKnrNjydV7jkqudpq0-P__rhQs3SNzQaa8KNOhxen8s',
    bio: 'Reproductive Biology & Embryo Transfer Specialist. Leads AniHeal advanced assisted reproduction protocols, artificial insemination synchronization, and genomics yield mapping.',
    location: 'Nakuru Cryo-Station',
    experience: 'IVF / ET Lead',
    actionLabel: 'Schedule Breeding Plan',
    isDirector: false,
    email: 't.mansoor@aniheal.co.ke',
    sortOrder: 4,
    isPublished: true,
  },
  {
    slug: 'dr-mercy-chebet',
    name: 'Dr. Mercy Chebet',
    title: 'BVM, MSc Veterinary Pathology',
    category: ['one-health'],
    roleTag: 'Diagnostics',
    specialtyTag: 'Pathology & Toxicology',
    kvbLicense: 'KVB: 1804-PT',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBt5Ugp7zvHZCSUK9UgBJh9A7OHl0kRC-tnyY_eapNi8WqYNANRXJPe3pdjAQgFD-ZkBOChDomWhrhJzsc4yIUBSxhI8UQCqoV4W9TTRm35WNmslpBhOrkNIdVzNhqrdLg6hA05R-TrmnK1_ZRJhYHyxgEnVLTABbvfqeajQGCX7oDTwGRaleyl4qHjYp0_iBchEYjU2YzpWtkTSER2JzGzCjzhPLARP0_e0-ElWk4iPxUm1jyrzJUn',
    bio: 'Diagnostic Laboratory & Toxicology Lead. Manages biosafety PCR tests, hematological profiling, post-mortem histopathology, and pasture toxicology verification assays.',
    location: 'Kabete Reference Lab',
    experience: '24h Turnaround',
    actionLabel: 'Submit Lab Sample',
    isDirector: false,
    email: 'm.chebet@aniheal.co.ke',
    sortOrder: 5,
    isPublished: true,
  },
];

const seed = async () => {
  try {
    console.log('Connecting to MongoURI...');
    await mongoose.connect(mongoUri);
    console.log('Connected! Deleting old team members...');
    await TeamMember.deleteMany({});
    console.log('Inserting 5 team members...');
    const res = await TeamMember.insertMany(teamMembers);
    console.log(`Successfully seeded ${res.length} team members!`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed team members:', err);
    process.exit(1);
  }
};

seed();
