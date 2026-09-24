const User = require('../models/User');
const WebsiteSettings = require('../models/WebsiteSettings');
const ContentBlock = require('../models/ContentBlock');
const Service = require('../models/Service');
const PricingPlan = require('../models/PricingPlan');
const TeamMember = require('../models/TeamMember');
const Hub = require('../models/Hub');
const FAQ = require('../models/FAQ');
const ResearchItem = require('../models/ResearchItem');
const Collaboration = require('../models/Collaboration');

const runSeed = async () => {
  try {
    // 1. SuperAdmin User
    let superAdmin = await User.findOne({ email: 'hello.aniheal@gmail.com' });
    if (!superAdmin) {
      await User.create({
        name: 'AniHeal SuperAdmin',
        email: 'hello.aniheal@gmail.com',
        password: 'password123',
        role: 'superadmin',
        isActive: true,
        mustChangePassword: true,
      });
      console.log('✔ SuperAdmin created: hello.aniheal@gmail.com / password123 (Temporary - Must Change Password)');
    } else {
      superAdmin.password = 'password123';
      superAdmin.role = 'superadmin';
      superAdmin.isActive = true;
      superAdmin.mustChangePassword = true;
      await superAdmin.save();
      console.log('✔ SuperAdmin updated: hello.aniheal@gmail.com / password123 (Temporary - Must Change Password)');
    }

    // 2. Settings
    const existingSettings = await WebsiteSettings.findOne();
    if (!existingSettings) {
      await WebsiteSettings.create({
        siteName: 'AniHeal Vetspace solutions',
        tagline: 'Veterinary Solutions',
        licenseNumber: 'KVB/PR/2025/0842',
        licenseDescription:
          'Authorized for Mobile & Ambulatory Field Procedures, Clinical Diagnostics, and Veterinary Pharmacy.',
        primaryPhone: '+254 700 264 432',
        hotlinePhone: '+254 700 ANIHEAL',
        emergencyPhone: '+254 700 264 432',
        primaryEmail: 'clinical@aniheal.co.ke',
        infoEmail: 'info@aniheal.co.ke',
        careersEmail: 'careers@aniheal.co.ke',
        mpesaTill: '894022',
        mpesaTillName: 'AniHeal Agro-Vet Ltd',
        whatsappNumber: '254700264432',
        headquartersAddress: 'Veterinary Complex, Kabete Rd, Nairobi, Kenya',
        regionalHubsSummary: 'Nakuru • Eldoret • Nyeri • Kilifi',
        socialLinks: {
          facebook: '#',
          twitter: '#',
          instagram: '#',
          whatsapp: 'https://wa.me/254700264432',
        },
        operatingHours: {
          weekday: 'Mon–Sat 07:00–18:00',
          emergency: '24/7 Emergency Response',
        },
        metaTitle: 'AniHeal Vetspace solutions',
        metaDescription:
          'AniHeal is an accredited agro-veterinary enterprise advancing clinical diagnostics, preventative medicine, and precision livestock production across Kenya under One Health.',
      });
    }

    // 3. Content Blocks
    const blockCount = await ContentBlock.countDocuments();
    if (blockCount === 0) {
      await ContentBlock.insertMany([
        {
          key: 'home_hero',
          section: 'homepage',
          title: 'Professional Consultancy You Can Trust',
          subtitle: 'ACCREDITED KENYA VETERINARY CONSULTANCY',
          badge: 'ANIHEAL VETSPACE SLTNS LTD',
          body: 'AniHeal veterinary consultancy works on providing sustainable animal related solutions in fields of veterinary medicine, One Health, animal husbandry and animal welfare.',
          metadata: {
            metrics: [
              { label: 'Accredited Practice', value: 'KVB' },
              { label: 'One Health Focused', value: '100%' },
              { label: 'Field Triage Units', value: '24/7' },
              { label: 'Counties Covered', value: '14+' },
            ],
            primaryCtaText: 'Get Help from Us',
            primaryCtaLink: '#booking-dispatch',
            secondaryCtaText: 'Explore Services & Solutions',
            secondaryCtaLink: '#clinical-services',
          },
        },
        {
          key: 'home_why_choose_us',
          section: 'homepage',
          title: 'Why Choose us',
          subtitle: 'Core Practice Pillars',
          body: 'Built on surgical rigor, preventive epidemiological discipline, and certified regulatory compliance.',
          metadata: {
            pillars: [
              {
                icon: 'stethoscope',
                title: 'Experienced Veterinary Team',
                subtitle: 'Accredited By The KVB',
                desc: 'Licensed veterinary surgeons, livestock epidemiologists, and reproduction technicians adhering to the highest standards of the Kenya Veterinary Board.',
                badge: 'KVB Verified',
              },
              {
                icon: 'biotech',
                title: 'Science-Driven solutions',
                subtitle: 'Evidence-Based Diagnostics',
                desc: 'We combine diagnostics, research, and practical veterinary care for accurate decision-making.',
                badge: 'Rapid Panels',
              },
              {
                icon: 'verified',
                title: 'Trusted Across the Animal Health Chain',
                subtitle: 'Holistic Value Network',
                desc: 'Supporting farmers, pet owners, and livestock enterprises with dependable care.',
                badge: 'Nationwide',
              },
            ],
          },
        },
        {
          key: 'home_mission_vision',
          section: 'homepage',
          title: 'Purpose & Vision',
          metadata: {
            mission:
              'To deliver long-lasting, affordable and sustainable animal health solutions that empower farmers, veterinarians and communities across Africa - integrating one-health principles, climate smart practices and innovation to combat diseases, strengthen food systems and advance animal welfare.',
            vision:
              'A world where animal life matters, every farmer thrives and every community is protected.',
          },
        },
        {
          key: 'home_partnerships',
          section: 'homepage',
          title: 'Collaborations & Partnerships',
          subtitle: 'Institutional Network',
          body: 'Partnering across government entities, pharmaceutical manufacturers, and research bodies to advance One Health across East Africa.',
        },
        {
          key: 'home_cta_banner',
          section: 'homepage',
          title: 'Need Immediate Clinical Assistance on Your Farm?',
          subtitle: 'Rapid Response Service',
          body: 'Our field veterinary team provides real-time WhatsApp visual triage, emergency ambulatory dispatch, and immediate drug dosage guidance.',
        },
        {
          key: 'fleet_vignette',
          section: 'contact',
          title: 'Ambulatory Fleet In Action',
          badge: 'Cold Chain + Ultrasound Equipped',
          metadata: {
            items: [
              {
                name: 'Mobile Lab Fleet #3',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdMipf_wHgAU1jJHBgzZ-6Av_FOWhaYTe_R9-pUVcedYopdfsqz05h2pLUvunESqUTs5qQ7PE4qFASeBGVWfVSZvspJFb4JPAt5kk3WO0D9tu2HlST18cJ3ygPKcaYjKN3hJrJ8lyFMrr5ozKgdT1YM4lsEa7ZpWUMDO1_Y_AY42lHfrKIfvOn6JZx30CnGUq2rCrWC_AYy4ozTsbtvRFnM5Bb1gl2r4BcFoGaHWLvSF3AtJW7KU2B',
              },
              {
                name: 'Rift Valley Herd Triage',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuKHTURKZQOaYcfibAeMONBddKmwPREFD5iGH_CqqzH9tQiNalVh80yYdaD0v6ZSKMqKPTXd_0lYTdqHA5_Cwdky_5a9BRoHxuJSzbVZM74updOwNHCc1AXfrfkW8MxahBdJocfbPQmqZzW6CoJQiaYRUeQWT0LznnWguWv_dvn3UzlMalVH4Xa9Iag7GOCQmDzydia2FrRZvqduy8IrpPc0j6sLiA3Lp11DHLJ1WDkXDuT04mMW0v',
              },
            ],
          },
        },
      ]);
    }

    // 4. Services
    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      await Service.insertMany([
        {
          slug: 'one-health-consultancy',
          protocolNumber: 'Service Protocol 01',
          title: 'Consultancy – One Health Infrastructure',
          badgeText: 'Zoonoses & Bio-Risk',
          badgeIcon: 'public',
          statusTag: 'KVB Standard Audit',
          category: ['one-health'],
          image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuD8GMqS-s8oinLCAa3VcL8Xl7AQBM1TSOEF9XkmOobmDNuBcrYO1BnJzDYY41T8p8D9N9DXAJZ5xXcXs62AY48PxF50eFEK4mvnrlAmyiiDgMPdtr-U4_r1YfvJTd93s_r1lRgit73FS86IaEBFaO558hGseYNlXJUuDUeHj2wgYr0-fWtJ7mG4UE5sfCVkqHFhtPTMjJYKvI4veFlKgjAORdXijb34IbWE4OAS4B7gmYQXrKE4mb-6',
          description:
            'Direct integration of animal wellness, farm-hand occupational safety, and water-table containment. We conduct rigorous epidemiological tracking to intercept zoonotic transmissions (Brucellosis, Anthrax, Q-Fever) before contamination spreads to distribution lines.',
          features: [
            {
              icon: 'coronavirus',
              title: 'Zoonotic Surveillance',
              desc: 'Serum banking, PCR cross-testing, and human-livestock barrier analysis.',
            },
            {
              icon: 'sanitizer',
              title: 'Bio-Security Auditing',
              desc: 'Footbath integrity, disinfection gates, visitor telemetry protocols.',
            },
            {
              icon: 'water_drop',
              title: 'Effluent Management',
              desc: 'Runoff bio-filtration, manure pathogen decay monitoring.',
            },
          ],
          compliance: 'Formal WHO & WOAH One Health Guidelines Adherent',
          sortOrder: 1,
          isPublished: true,
        },
        {
          slug: 'disease-control',
          protocolNumber: 'Service Protocol 02',
          title: 'Disease Control & Prophylactic Treatment',
          badgeText: 'Prophylaxis & Isolation',
          badgeIcon: 'vaccines',
          statusTag: 'Certified Cold-Chain Biologics',
          category: ['one-health', 'therapeutic'],
          image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBgnhlSjZh6a_oC4v7hYvCuMI9VsqHpex3EdPZPLUzhyy570fhrW6SIPBaIrSEcUFUmg07n-4pAVj_BhwZtM19s8akn86fGPdra5hoBc9pm6zfqA4GubUB72rcakr5i2vzrYLAp6Yo279jWmOk5oLWefblAWC5DZBd5Jq3O2zt97mR5v5BEDu0JPTwX6_6YnYp7NSuo_HPQ_iYf17s7DDx6utqnr2aVzP0YQM-mzxyFUTedu_6OoiDF',
          description:
            'Systematic herd immunity programs designed to eliminate Foot & Mouth Disease (FMD), Contagious Bovine Pleuropneumonia (CBPP), and East Coast Fever (ECF). We oversee ring-vaccination corridors and statutory quarantine release procedures.',
          features: [
            {
              icon: 'calendar_month',
              title: 'Herd Vaccination Rosters',
              desc: 'Predictive seasonal immunization schedules tailored to regional epidemiology.',
            },
            {
              icon: 'security',
              title: 'Vector Suppression',
              desc: 'Acaricide resistance assays and precision dip-tank management.',
            },
            {
              icon: 'fence',
              title: 'Outbreak Containment',
              desc: 'Rapid physical quarantine cordon, sentinel animal tagging, and reporting.',
            },
          ],
          compliance: 'Full Veterinary Movement Permits (VMP) Documentation',
          sortOrder: 2,
          isPublished: true,
        },
        {
          slug: 'livestock-treatment',
          protocolNumber: 'Service Protocol 03',
          title: 'Livestock Treatment & On-Farm Diagnostics',
          badgeText: '24/7 Mobile Ambulatory',
          badgeIcon: 'medical_services',
          statusTag: 'On-Farm Lab Results in 20 Mins',
          category: ['therapeutic'],
          image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDh5jaUFBmHwqIryyhXOLCyM_SF4fmmOIZXVxsg_bOyqhV031U28QBWBI-lloxbLb461c7qh5Wxra5XBRp1gvhADzm1p3Fm5s3knm7MuRw7FnAwdIg3oz99cOyoGYVrtm75ibJwefv0-DUnUmK0wEmq_e8py1Osc6QY6_EyW9OXuIzn2j9xZiqLTvOxLyM03ruryocUYinIHMW600l2e449l2-sMjohLy9wj2wfFJ-O-gYsbbJQLCyU',
          description:
            'Mobile surgical suites equipped for emergency c-sections, rumenotomy, abomasal displacements, and acute trauma. Supported by field blood analyzers, California Mastitis Testing (CMT), and tick-borne blood smear staining right at your crush pen.',
          features: [
            {
              icon: 'smb_share',
              title: 'Hemoparasite Scans',
              desc: 'Anaplasmosis, Babesiosis, and Theileriosis stain assays.',
            },
            {
              icon: 'precision_manufacturing',
              title: 'Field Laparotomy',
              desc: 'Aseptic abdominal interventions with continuous sedation monitoring.',
            },
            {
              icon: 'science',
              title: 'Subclinical Mastitis',
              desc: 'Quarter somatic cell counts and pathogen-targeted therapy.',
            },
          ],
          compliance: 'Priority Triage dispatched via Ambulatory Hotline',
          sortOrder: 3,
          isPublished: true,
        },
        {
          slug: 'reproductive-health',
          protocolNumber: 'Service Protocol 04',
          title: 'Reproductive Health & Genetic Breeding',
          badgeText: 'Genomics & Reproduction',
          badgeIcon: 'genetics',
          statusTag: 'Liquid Nitrogen Cold Chain Verified',
          category: ['reproductive'],
          image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuB_9EiuR-JPwOcWNoWj0W_UeeLanbTS5rR1me9ItLQcTrmoh4237VWg-7VMsCk1ODyaO6o-YGEmS0TmAK6VylXQwCHJuru32pFMcA4UOJsdGgTtxeGdVHzrJ2cllA-w6nC_A-aTKXHcqi2yOLZXVxjHV0KBZ5wM-Oh7Ts_hkOd4Mg4x1QQGDK1PNIbfefM1fDWWXSq-hUcKD7xfEwqw6tOTBmAQB0-b3Y1Lq04PCO_5iySgjZaKBMka',
          description:
            'Accelerating dairy milk output and beef carcass conformation through high-index international and acclimatized sires. We handle hormonal oestrus synchronization for batch calving, early ultrasound gestation scans at day 28, and repeat-breeder therapy.',
          features: [
            {
              icon: 'sync_alt',
              title: 'Fixed-Time AI (FTAI)',
              desc: 'Progesterone/GnRH hormonal protocols for clustered conception.',
            },
            {
              icon: 'monitor_heart',
              title: 'Doppler Ultrasonography',
              desc: 'Ovarian follicle dynamics and fetal viability evaluations.',
            },
            {
              icon: 'grade',
              title: 'Sexed Semen Programs',
              desc: '90%+ female heifer generation from tested pedigree bulls.',
            },
          ],
          compliance: 'Authorized Distributor of Certified ABS & World Wide Sires genetics',
          sortOrder: 4,
          isPublished: true,
        },
        {
          slug: 'nutritional-assessment',
          protocolNumber: 'Service Protocol 05',
          title: 'Nutritional Assessment & Feeding Programs',
          badgeText: 'Agronomic Nutrition',
          badgeIcon: 'grass',
          statusTag: 'NIR Forage Spectroscopy',
          category: ['insurance'],
          image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDzBmA1iUjjVdHf22mm8riFhRv4ez8Tygqa7mf6CrigA6apjigthuM23h0-YOvCXA2Q36LY4KziiH-G7r1rFEsp4qEkaek1-7jBSn2oWwKlD6JnCcYUPKmXDvBvayzz7RktYyZXCav0gVjYlqs2uDVCDizDM91FKEHh5nwkLLP7zQoSd3YPhGc05beY2PYX-z-cFjMdBKKw5bub_Px0ZXRtJb5y8M1bIlnzkpn--XTeACyOjL_QWABX',
          description:
            'Feed represents up to 70% of livestock operational overhead. We formulate scientifically balanced Total Mixed Rations (TMR), calibrate mineral premixes to combat postpartum hypocalcemia (milk fever), and optimize silage fermentation to minimize dry-matter loss.',
          features: [
            {
              icon: 'pie_chart',
              title: 'TMR Formulation',
              desc: 'Computerized least-cost ration balancing using local agro-byproducts.',
            },
            {
              icon: 'grain',
              title: 'Silage Bio-Additives',
              desc: 'Inoculant regimens that slash aerobic spoilage and mycotoxin build-up.',
            },
            {
              icon: 'analytics',
              title: 'Metabolic Profiling',
              desc: 'Ketosis testing, ruminal pH sampling, and body condition scoring (BCS).',
            },
          ],
          compliance: 'Reduces Enteric Methane While Boosting Daily Milk Yield',
          sortOrder: 5,
          isPublished: true,
        },
        {
          slug: 'animal-insurance',
          protocolNumber: 'Service Protocol 06',
          title: 'Animal Insurance Underwriting & Retainer Subscription',
          badgeText: 'Risk Management',
          badgeIcon: 'verified_user',
          statusTag: 'Underwritten by Top East African Insurers',
          category: ['insurance'],
          image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDc4LFTEGrQ_28rCuyAwiOYBtku6XcBb2e7c0faLJPvLPQLYQZCHWDVrHvYuTtkLqFjIET2wDlb_3o9SI8RZKGrxUk9dvhw3akQm5ZpZ0-mZmqL9qdxovEEtnPQZkIioh5hh1aNhRpkWoUbmetRv6_mIdYFF2VYGkjhVLv59ovcSlM6eZw9vUzf-cOGXcmE3QW3eUJLoXu-pcXQsAAroF_YJyLymPK_WZzUjbJR8dLKP7JtnIGruJ5I',
          description:
            'Safeguard biological equity against catastrophic herd loss, calving fatalities, and epidemic diseases. AniHeal provides certified pre-underwriting valuation, biometric RFID tagging, routine compliance audits, and expedited claims post-mortems.',
          features: [
            {
              icon: 'tag',
              title: 'Biometric Tagging',
              desc: 'Tamper-proof RFID tagging integrated with national livestock registries.',
            },
            {
              icon: 'assignment_turned_in',
              title: 'Underwriting Valuation',
              desc: 'Accurate asset valuation based on pedigree, production, and parity.',
            },
            {
              icon: 'history_edu',
              title: 'Rapid Claims Autopsy',
              desc: 'KVB-certified mortality reporting completed within 24 hours of demise.',
            },
          ],
          compliance: 'Low-loss ratio protocols rewarded with annual premium discounts',
          sortOrder: 6,
          isPublished: true,
        },
      ]);
    }

    // 5. Pricing Plans
    const pricingCount = await PricingPlan.countDocuments();
    if (pricingCount === 0) {
      await PricingPlan.insertMany([
        {
          name: 'Basic Farm Retainer',
          category: 'Smallholder & Homestead',
          price: 8500,
          currency: 'KES',
          billingPeriod: '/ month',
          billingNote: 'Billed quarterly or annually',
          description: 'Continuous preventative surveillance for small dairy operations and breeding pens (1-10 head).',
          features: [
            'Monthly herd health & mastitis audits',
            'Vaccination calendar oversight',
            'Subsidized ambulatory callout fees',
            'Direct WhatsApp vet support group',
          ],
          isPopular: false,
          ctaText: 'Subscribe to Basic',
          ctaLink: '/appointment-booking',
          sortOrder: 1,
          isPublished: true,
        },
        {
          name: 'Commercial Dairy Protocol',
          category: 'Commercial Production',
          price: 24000,
          currency: 'KES',
          billingPeriod: '/ month',
          billingNote: 'Includes bi-weekly on-site surgeon residency',
          description: 'Complete herd health, reproductive scheduling, and metabolic surveillance (11-100+ head).',
          features: [
            'Bi-weekly ultrasound reproductive exams',
            'TMR least-cost nutritional formulation',
            'Full priority ambulatory response (zero call fee)',
            'Pre-underwriting insurance certification',
            'Quarterly farm-worker One Health hygiene training',
          ],
          isPopular: true,
          ctaText: 'Enroll Commercial Protocol',
          ctaLink: '/appointment-booking',
          sortOrder: 2,
          isPublished: true,
        },
        {
          name: 'Emergency Ambulatory',
          category: 'On-Call Contingency',
          price: 5000,
          currency: 'KES',
          billingPeriod: '+ mileage',
          billingNote: 'Diagnostic medications billed at cost',
          description: 'Direct dispatch for non-retainer emergency surgical cases, dystocia, or toxic ingestion.',
          features: [
            'Rapid mobile field unit mobilization',
            'Emergency surgical intervention & anesthesia',
            'Cold-chain antivenom & antitoxin stock',
            'Official statutory notification if epizootic',
          ],
          isPopular: false,
          isEmergency: true,
          ctaText: 'Request Emergency Unit',
          ctaLink: 'tel:+254700264432',
          sortOrder: 3,
          isPublished: true,
        },
      ]);
    }

    // 6. Team Members
    const teamCount = await TeamMember.countDocuments();
    if (teamCount === 0) {
      await TeamMember.insertMany([
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
          bio: "Reproductive Biology & Embryo Transfer Specialist. Leads AniHeal's advanced assisted reproduction protocols, artificial insemination synchronization, and genomics yield mapping.",
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
      ]);
    }

    // 7. Hubs
    const hubCount = await Hub.countDocuments();
    if (hubCount === 0) {
      await Hub.insertMany([
        {
          name: 'Headquarters & Kabete Central Clinic',
          stationType: 'headquarters',
          subtitle: 'Tier-1 Surgical & Pathological Lab',
          address: 'Veterinary Complex, Kabete Road, Nairobi, Kenya',
          phone: '+254 700 ANIHEAL',
          leadOfficer: 'Dr. M. Gatheca, DVM',
          coverageAreas: ['Nairobi', 'Kiambu', 'Kajiado North'],
          responseRadiusKm: 60,
          fleetEquipment: ['Autoclaves', 'Surgical Rig', 'Cold Storage'],
          zone: 'Nairobi Metropolitan & Kabete Central',
          zoneDescription: 'Central diagnostic reference core and administrative HQ.',
          sortOrder: 1,
          isPublished: true,
        },
        {
          name: 'Nakuru & Rift Valley Ambulatory Hub',
          stationType: 'hub',
          subtitle: 'Dairy, Feedlot & Commercial Pasture Unit',
          address: 'George Morara Rd, Central Industrial Area, Nakuru',
          phone: '+254 (0) 711 445 522',
          leadOfficer: 'Dr. Dennis Kipchumba',
          coverageAreas: ['Naivasha', 'Rongai', 'Njoro', 'Gilgil'],
          responseRadiusKm: 120,
          fleetEquipment: ['Portable Sonar & Dewormer Gun', 'Cryo-Tank'],
          zone: 'Zone 1: Rift Valley Cluster',
          zoneDescription: 'Coordinated by 6 Lead Paravets and 3 Veterinary Surgeons specializing in intensive dairy cattle.',
          sortOrder: 2,
          isPublished: true,
        },
        {
          name: 'Eldoret Dairy Basin Station',
          stationType: 'station',
          subtitle: 'Genetics & Synchronization Station',
          address: 'Uganda Rd, Agri-Business Mile, Eldoret',
          phone: '+254 700 ANIHEAL',
          leadOfficer: 'Dr. Dennis Kipchumba',
          coverageAreas: ['Uasin Gishu', 'Turbo', 'Moiben', 'Nandi Hills'],
          responseRadiusKm: 100,
          fleetEquipment: ['Mobile Semen Dispensary', '4x4 Treatment Rig'],
          zone: 'Zone 1: Rift Valley Cluster',
          zoneDescription: 'Pastoralist and commercial grain-dairy belt operations.',
          sortOrder: 3,
          isPublished: true,
        },
        {
          name: 'Nyeri Mount Kenya Regional Station',
          stationType: 'station',
          subtitle: 'Smallholder Agro-Vet Outreach',
          address: "Ruring'u Agricultural Hub, Nyeri County",
          phone: '+254 700 ANIHEAL',
          leadOfficer: 'Dr. Grace Wanjiku',
          coverageAreas: ['Kiambu', 'Nyeri', "Murang'a", 'Kirinyaga'],
          responseRadiusKm: 85,
          fleetEquipment: ['Sub-zero Vaccine Freezers', 'Diagnostic Kits'],
          zone: 'Zone 2: Central Highlands',
          zoneDescription: 'Specialized smallholder zero-grazing consultation and mastitis control squads.',
          sortOrder: 4,
          isPublished: true,
        },
        {
          name: 'Kilifi Coastal & Livestock Unit',
          stationType: 'outpost',
          subtitle: 'Tropical Disease & Vector Control',
          address: 'Mnarani Agricultural Outpost, Kilifi Coastal Strip',
          phone: '+254 700 ANIHEAL',
          leadOfficer: 'Field Paravet Corps',
          coverageAreas: ['Kilifi', 'Malindi', 'Kwale'],
          responseRadiusKm: 140,
          fleetEquipment: ['Off-road Mobile Treatment Rig', 'Dip Tank Assays'],
          zone: 'Zone 3: Western & Coastal Belt',
          zoneDescription: 'Pastoralist herd interventions and tropical vector management.',
          sortOrder: 5,
          isPublished: true,
        },
      ]);
    }

    // 8. FAQs
    const faqCount = await FAQ.countDocuments();
    if (faqCount === 0) {
      await FAQ.insertMany([
        {
          question: "What are AniHeal's emergency ambulatory response timeframes?",
          answer:
            'For critical bovine obstetrics (dystocia), acute bloat, or downer cow emergencies within our 45-kilometer radius hubs (Kabete, Nakuru, Eldoret, Nyeri), our dedicated rapid response units dispatch immediately with an average on-farm arrival time between 25 and 45 minutes. For rural smallholdings beyond active radii, we initiate instant WhatsApp Tele-Triage to guide farm managers through primary intervention steps while our vehicle is en route.',
          category: 'emergency',
          sortOrder: 1,
          isPublished: true,
        },
        {
          question: 'What payment methods are supported for field procedures and diagnostics?',
          answer:
            'We accept instant settlement via Safaricom M-Pesa Buy Goods Till 894022 (AniHeal Agro-Vet Ltd) directly on site. For corporate commercial dairies, agricultural cooperatives, and subscribed enterprises under our Animal Insurance & Subscription retainer, 30-day corporate invoices and direct bank transfers (RTGS/EFT) are standard.',
          category: 'billing',
          sortOrder: 2,
          isPublished: true,
        },
        {
          question: 'What biosecurity protocols do AniHeal clinicians follow upon entering a farm?',
          answer:
            'In strict compliance with the Kenya Veterinary Board (KVB) and One Health antimicrobial stewardship guidelines, our mobile ambulatory vans feature self-contained disinfection gear. Veterinarians deploy virgin disposable overshoes or autoclave-sanitized gumboots with broad-spectrum Virkon-S foot dips prior to crossing farm perimeter gates. All surgical kits, A.I. guns, and ultrasound probes undergo clinical sterilization between client farm visits to prevent horizontal pathogen transmission (e.g., FMD, Brucellosis, Mastitis).',
          category: 'biosecurity',
          sortOrder: 3,
          isPublished: true,
        },
        {
          question: 'Can AniHeal assist with cross-border animal health documentation and export certification?',
          answer:
            'Yes. Our senior consulting veterinarians liaise directly with County Veterinary Directors and the Directorate of Veterinary Services (DVS) at Kabete. We conduct statutory quarantine screening, serological testing, Brucella/TB profiling, and rabies titer verification to facilitate valid international movement permits for breeding stock and companion animals.',
          category: 'regulatory',
          sortOrder: 4,
          isPublished: true,
        },
      ]);
    }

    // 9. Research Items
    const researchCount = await ResearchItem.countDocuments();
    if (researchCount === 0) {
      await ResearchItem.insertMany([
        {
          title: 'Subclinical Mastitis in Dual-Purpose Cattle: Surveillance Models',
          authors: 'Dr. Eleanor Vance, Dr. Grace Wanjiku (in collaboration with KALRO & ILRI)',
          journal: 'African Journal of Animal Health, Vol 41',
          year: 2024,
          tag: 'Peer-Reviewed',
          summary: 'Authored by Dr. Eleanor Vance and Dr. Grace Wanjiku in collaboration with KALRO and ILRI.',
          sortOrder: 1,
          isPublished: true,
        },
        {
          title: 'Field Diagnostics for East Coast Fever (Theileriosis) in Rift Valley',
          authors: 'Dr. Mercy Chebet',
          journal: 'One Health Global Review, Issue 8',
          year: 2023,
          tag: 'Technical Paper',
          summary: 'Clinical validation and farm-level trial data on rapid lateral flow tests by Dr. Mercy Chebet.',
          sortOrder: 2,
          isPublished: true,
        },
      ]);
    }

    // 10. Collaborations & Partnerships (Managed dynamically by Admin)
    // No mock collaborations inserted by default

    return true;
  } catch (error) {
    console.error('Error during runSeed execution:', error.message);
    throw error;
  }
};

module.exports = runSeed;
