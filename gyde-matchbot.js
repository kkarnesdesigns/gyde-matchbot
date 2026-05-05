(function() {
  'use strict';

  // ========================================
  // CONFIGURATION - UPDATE THESE
  // ========================================
  const API_BASE_URL = 'https://webflow-experts-router.vercel.app';
  const N8N_WEBHOOK_URL = 'https://joingyde.app.n8n.cloud/webhook/1c95ea93-5550-402a-b5c0-771f02a6b4ac';

  // ========================================
  // STATE
  // ========================================
  const state = {
    currentStep: -1, // -1 = loading
    formData: null,  // CMS data from API
    selectedCategory: null,
    selectedSkills: [],
    selectedCerts: [],
    skillsCatchAll: false,
    certsCatchAll: false,
    locationType: null,    // 'remote' | 'state'
    locationValue: null,
    locationStateId: null,
    results: null
  };

  // ========================================
  // INITIALIZATION
  // ========================================
  async function init() {
    showStep(-1); // show loading

    try {
      const response = await fetch(`${API_BASE_URL}/api/form-options`);
      if (!response.ok) throw new Error(`Failed to load form options (HTTP ${response.status})`);
      state.formData = await response.json();
    } catch (err) {
      console.error('Gyde Matchbot: failed to load form data.', err);
      showStep('error');
      return;
    }

    renderCategories();
    showStep(0);
  }

  // ========================================
  // STEP NAVIGATION
  // ========================================
  function showStep(stepIndex) {
    state.currentStep = stepIndex;

    // Hide all steps
    document.querySelectorAll('.gyde-step').forEach(el => el.classList.remove('active'));

    // Show the right step
    if (stepIndex === -1) {
      document.getElementById('gydeStepLoading').classList.add('active');
    } else if (stepIndex === 'submitting') {
      document.getElementById('gydeStepSubmitting').classList.add('active');
    } else if (stepIndex === 'results') {
      document.getElementById('gydeStepResults').classList.add('active');
      document.getElementById('gydeProgress').style.display = 'none';
    } else if (stepIndex === 'error') {
      document.getElementById('gydeStepError').classList.add('active');
    } else {
      document.getElementById('gydeStep' + stepIndex).classList.add('active');
    }

    // Update progress bar
    if (typeof stepIndex === 'number' && stepIndex >= 0) {
      document.getElementById('gydeProgress').style.display = 'flex';
      document.querySelectorAll('.gyde-progress-step').forEach((el, i) => {
        el.classList.remove('active', 'completed');
        if (i < stepIndex) el.classList.add('completed');
        if (i === stepIndex) el.classList.add('active');
      });
    }
  }

  function nextStep() {
    if (state.currentStep < 4) {
      showStep(state.currentStep + 1);
    }
  }

  function prevStep() {
    if (state.currentStep > 0) {
      showStep(state.currentStep - 1);
    }
  }

  // ========================================
  // STEP 1: CATEGORIES
  // ========================================
  const HIDDEN_CATEGORY_PATTERNS = [
    /^seo$/i,
    /^content marketing$/i,
    /photography/i,
    /videography/i
  ];

  function isHiddenCategory(cat) {
    const name = (cat.name || '').trim();
    const slug = (cat.slug || '').trim();
    return HIDDEN_CATEGORY_PATTERNS.some(re => re.test(name) || re.test(slug));
  }

  function renderCategories() {
    const container = document.getElementById('gydeCategoryList');
    container.innerHTML = '';

    state.formData.categories
      .filter(cat => !isHiddenCategory(cat))
      .forEach(cat => {
        const card = document.createElement('div');
        card.className = 'gyde-category-card';
        card.textContent = cat.name;
        card.onclick = () => selectCategory(cat);
        container.appendChild(card);
      });
  }

  function selectCategory(category) {
    state.selectedCategory = category;
    state.selectedSkills = [];
    state.selectedCerts = [];
    state.skillsCatchAll = false;
    state.certsCatchAll = false;

    // Highlight selected card
    document.querySelectorAll('.gyde-category-card').forEach(el => {
      el.classList.toggle('selected', el.textContent === category.name);
    });

    // Render skills and certs for this category
    renderSkillChips(category.id);
    renderCertChips(category.id);

    // Auto-advance to next step
    setTimeout(() => showStep(1), 200);
  }

  // ========================================
  // STEP 2: SKILLS
  // ========================================
  function renderSkillChips(categoryId) {
    const container = document.getElementById('gydeSkillChips');
    container.innerHTML = '';

    const skills = state.formData.skills[categoryId] || [];

    if (skills.length === 0) {
      container.innerHTML = '<p style="color: var(--gyde-text-light); font-size: 14px;">No specific skills listed for this category.</p>';
      state.skillsCatchAll = true;
      updateCatchAllBtn('skills');
      return;
    }

    skills.forEach(skill => {
      const chip = document.createElement('span');
      chip.className = 'gyde-chip';
      chip.textContent = skill.name;
      chip.dataset.id = skill.id;
      chip.onclick = () => toggleSkill(skill, chip);
      container.appendChild(chip);
    });

    updateCatchAllBtn('skills');
  }

  function toggleSkill(skill, chipEl) {
    if (state.skillsCatchAll) {
      state.skillsCatchAll = false;
      updateCatchAllBtn('skills');
    }

    const idx = state.selectedSkills.findIndex(s => s.id === skill.id);
    if (idx > -1) {
      state.selectedSkills.splice(idx, 1);
      chipEl.classList.remove('selected');
    } else {
      state.selectedSkills.push(skill);
      chipEl.classList.add('selected');
    }
  }

  // ========================================
  // STEP 3: CERTIFICATIONS
  // ========================================
  function renderCertChips(categoryId) {
    const container = document.getElementById('gydeCertChips');
    container.innerHTML = '';

    const certs = state.formData.certifications[categoryId] || [];

    if (certs.length === 0) {
      container.innerHTML = '<p style="color: var(--gyde-text-light); font-size: 14px;">No specific platforms listed for this category.</p>';
      state.certsCatchAll = true;
      updateCatchAllBtn('certifications');
      return;
    }

    certs.forEach(cert => {
      const chip = document.createElement('span');
      chip.className = 'gyde-chip';
      chip.textContent = cert.name;
      chip.dataset.id = cert.id;
      chip.onclick = () => toggleCert(cert, chip);
      container.appendChild(chip);
    });

    updateCatchAllBtn('certifications');
  }

  function toggleCert(cert, chipEl) {
    if (state.certsCatchAll) {
      state.certsCatchAll = false;
      updateCatchAllBtn('certifications');
    }

    const idx = state.selectedCerts.findIndex(c => c.id === cert.id);
    if (idx > -1) {
      state.selectedCerts.splice(idx, 1);
      chipEl.classList.remove('selected');
    } else {
      state.selectedCerts.push(cert);
      chipEl.classList.add('selected');
    }
  }

  // ========================================
  // CATCH-ALL TOGGLE
  // ========================================
  function toggleCatchAll(type) {
    if (type === 'skills') {
      state.skillsCatchAll = !state.skillsCatchAll;
      if (state.skillsCatchAll) {
        state.selectedSkills = [];
        document.querySelectorAll('#gydeSkillChips .gyde-chip').forEach(el => el.classList.remove('selected'));
      }
    } else {
      state.certsCatchAll = !state.certsCatchAll;
      if (state.certsCatchAll) {
        state.selectedCerts = [];
        document.querySelectorAll('#gydeCertChips .gyde-chip').forEach(el => el.classList.remove('selected'));
      }
    }
    updateCatchAllBtn(type);
  }

  function updateCatchAllBtn(type) {
    const btn = document.getElementById(type === 'skills' ? 'gydeSkillCatchAll' : 'gydeCertCatchAll');
    const isActive = type === 'skills' ? state.skillsCatchAll : state.certsCatchAll;
    btn.classList.toggle('selected', isActive);
  }

  // ========================================
  // STEP 4: LOCATION
  // ========================================
  function selectLocation(type) {
    state.locationType = type;
    state.locationValue = null;
    state.locationStateId = null;

    // Highlight button
    document.querySelectorAll('.gyde-location-btn').forEach(el => {
      el.classList.toggle('selected', el.dataset.location === type);
    });

    // Show/hide dropdowns
    document.getElementById('gydeStateSelect').classList.toggle('visible', type === 'state');

    // Populate state dropdown if needed
    if (type === 'state' && document.getElementById('gydeStateDropdown').options.length <= 1) {
      const dropdown = document.getElementById('gydeStateDropdown');
      state.formData.states.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        opt.dataset.name = s.name;
        dropdown.appendChild(opt);
      });
    }

    // Enable next for remote
    if (type === 'remote') {
      state.locationValue = 'Remote';
      document.getElementById('gydeLocationNext').disabled = false;
    } else {
      document.getElementById('gydeLocationNext').disabled = true;
    }
  }

  function onStateChange() {
    const dropdown = document.getElementById('gydeStateDropdown');
    const selected = dropdown.options[dropdown.selectedIndex];
    if (selected && selected.value) {
      state.locationValue = selected.dataset.name;
      state.locationStateId = selected.value;
      document.getElementById('gydeLocationNext').disabled = false;
    } else {
      state.locationValue = null;
      state.locationStateId = null;
      document.getElementById('gydeLocationNext').disabled = true;
    }
  }

  // ========================================
  // STEP 5: CONTACT VALIDATION
  // ========================================
  function validateContact() {
    const firstName = document.getElementById('gydeFirstName').value.trim();
    const lastName = document.getElementById('gydeLastName').value.trim();
    const email = document.getElementById('gydeEmail').value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    document.getElementById('gydeSubmitBtn').disabled =
      !(firstName && lastName && email && emailRegex.test(email));
  }

  // Attach input listeners
  function attachContactListeners() {
    ['gydeFirstName', 'gydeLastName', 'gydeEmail'].forEach(id => {
      document.getElementById(id).addEventListener('input', validateContact);
    });
  }

  // ========================================
  // SUBMIT
  // ========================================
  async function submit() {
    const firstName = document.getElementById('gydeFirstName').value.trim();
    const lastName = document.getElementById('gydeLastName').value.trim();
    const email = document.getElementById('gydeEmail').value.trim();

    // Build location payload
    const location = { type: state.locationType, value: state.locationValue };
    if (state.locationType === 'state') {
      location.stateId = state.locationStateId;
    }

    const payload = {
      source: 'gyde-matchbot-form',
      timestamp: new Date().toISOString(),
      sessionId: 'mb_' + Math.random().toString(36).substring(2, 15),
      contact: { firstName, lastName, email },
      criteria: {
        category: {
          id: state.selectedCategory.id,
          name: state.selectedCategory.name
        },
        skills: state.skillsCatchAll ? [] : state.selectedSkills.map(s => ({ id: s.id, name: s.name })),
        certifications: state.certsCatchAll ? [] : state.selectedCerts.map(c => ({ id: c.id, name: c.name })),
        location
      },
      catchAll: {
        skills: state.skillsCatchAll,
        certifications: state.certsCatchAll
      }
    };

    showStep('submitting');

    try {
      console.log('Gyde Matchbot payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Webhook returned ' + response.status);

      const rawResults = await response.json();
      const results = normalizeResults(rawResults);
      state.results = results;
      renderResults(results);
      showStep('results');
    } catch (err) {
      console.error('Gyde Matchbot submit error:', err);
      // For development: render mock results so the UI can be tested
      console.log('Using mock results for development...');
      const mockResults = getMockResults();
      state.results = mockResults;
      renderResults(mockResults);
      showStep('results');
    }
  }

  // ========================================
  // RESULTS NORMALIZATION
  // ========================================
  // Accepts either the expected shape { topMatches, additionalMatches }
  // or a raw Airtable array of records and normalizes it for rendering.
  // Order is preserved as-is from the backend — no sorting on the front end.
  function normalizeResults(raw) {
    if (raw && !Array.isArray(raw) && (raw.topMatches || raw.additionalMatches)) {
      return raw;
    }
    const records = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.records) ? raw.records : []);
    const mapped = records.map(rec => {
      const f = (rec && rec.fields) ? rec.fields : rec || {};
      return {
        name: f['Full name'] || f.name || '',
        title: f['Title'] || f.title || '',
        profilePicture: f['Profile Picture'] || f.profilePicture || '',
        location: f['Location'] || f.location || '',
        skills: f['Name (from Skills)'] || f.skills || [],
        certifications: f['Name (from Certifications)'] || f.certifications || [],
        about: f['Brief Description'] || f.about || '',
        profileUrl: f['Profile URL'] || f.profileUrl || '#',
        membershipPlan: f['Membership Plan'] || f.membershipPlan || '',
        aiSummary: f.aiSummary || ''
      };
    });
    return {
      topMatches: mapped.slice(0, 3),
      additionalMatches: mapped.slice(3)
    };
  }

  // ========================================
  // RESULTS RENDERING
  // ========================================
  function renderResults(results) {
    const topContainer = document.getElementById('gydeTopMatches');
    const moreContainer = document.getElementById('gydeMoreMatches');
    topContainer.innerHTML = '';
    moreContainer.innerHTML = '';

    // Top matches
    const topMatches = results.topMatches || [];
    topMatches.forEach(expert => {
      topContainer.appendChild(createProfileCard(expert, true));
    });

    // Additional matches
    const additionalMatches = results.additionalMatches || [];
    if (additionalMatches.length > 0) {
      document.getElementById('gydeViewMoreContainer').style.display = 'block';
      additionalMatches.forEach(expert => {
        moreContainer.appendChild(createProfileCard(expert, false));
      });
    } else {
      document.getElementById('gydeViewMoreContainer').style.display = 'none';
    }
  }

  function createProfileCard(expert, showAiSummary) {
    const card = document.createElement('div');
    card.className = 'gyde-profile-card';

    const renderList = (items, label) => {
      if (!items || !items.length) return '';
      const lis = items.map((s, i) => `<li${i >= 5 ? ' class="hidden-item"' : ''}>${escapeHtml(s)}</li>`).join('');
      const moreBtn = items.length > 5
        ? `<button type="button" class="gyde-profile-skills-more" onclick="(function(b){var ul=b.previousElementSibling;ul.classList.toggle('collapsed');b.textContent=ul.classList.contains('collapsed')?('View '+(${items.length}-5)+' more'):'View less';})(this)">View ${items.length - 5} more</button>`
        : '';
      return `
        <div class="gyde-profile-skills">
          <div class="gyde-profile-skills-label">${label}</div>
          <ul class="gyde-profile-skills-list collapsed">${lis}</ul>
          ${moreBtn}
        </div>`;
    };
    const servicesBlock = renderList(expert.skills || [], 'Services Offered');
    const certsBlock = renderList(expert.certifications || [], 'Skills');
    const aboutText = expert.about || '';
    const truncatedAbout = aboutText.length > 300 ? aboutText.substring(0, 300) + '...' : aboutText;

    const plan = (expert.membershipPlan || '').toLowerCase();
    let tierLabel = '', tierClass = '';
    if (plan.includes('premium')) { tierLabel = 'Premium'; tierClass = 'tier-premium'; }
    const badgeHtml = tierLabel ? `<div class="gyde-profile-badge ${tierClass}">${tierLabel}</div>` : '';

    let aiSummaryHtml = '';
    if (showAiSummary && expert.aiSummary) {
      aiSummaryHtml = `
        <div class="gyde-profile-ai-summary">
          <p>${escapeHtml(expert.aiSummary)}</p>
        </div>`;
    }

    card.innerHTML = `
      <div class="gyde-profile-top">
        <img class="gyde-profile-photo" src="${escapeHtml(expert.profilePicture || '')}" alt="${escapeHtml(expert.name)}" onerror="this.style.display='none'" />
        <div class="gyde-profile-info">
          ${badgeHtml}
          <div class="gyde-profile-name">
            <a href="${escapeHtml(expert.profileUrl || '#')}" target="_blank">${escapeHtml(expert.name)}</a>
          </div>
          <div class="gyde-profile-location">${escapeHtml(expert.location || '')}</div>
          <div class="gyde-profile-title">${escapeHtml(expert.title || '')}</div>
        </div>
      </div>
      <div class="gyde-profile-body">
        ${servicesBlock}
        ${certsBlock}
        <div class="gyde-profile-about">
          <div class="gyde-profile-about-label">About</div>
          <div class="gyde-profile-about-text">${escapeHtml(truncatedAbout)}</div>
        </div>
      </div>
      ${aiSummaryHtml}
      <a class="gyde-profile-link" href="${escapeHtml(expert.profileUrl || '#')}" target="_blank">View Full Profile &rarr;</a>
    `;

    return card;
  }

  function showMore() {
    document.getElementById('gydeAdditionalResults').classList.add('visible');
    document.getElementById('gydeViewMoreContainer').style.display = 'none';
  }

  // ========================================
  // RESET
  // ========================================
  function reset() {
    state.selectedCategory = null;
    state.selectedSkills = [];
    state.selectedCerts = [];
    state.skillsCatchAll = false;
    state.certsCatchAll = false;
    state.locationType = null;
    state.locationValue = null;
    state.locationStateId = null;
    state.results = null;

    // Reset UI
    document.querySelectorAll('.gyde-category-card').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.gyde-location-btn').forEach(el => el.classList.remove('selected'));
    document.getElementById('gydeStateSelect').classList.remove('visible');
    document.getElementById('gydeFirstName').value = '';
    document.getElementById('gydeLastName').value = '';
    document.getElementById('gydeEmail').value = '';
    document.getElementById('gydeSubmitBtn').disabled = true;
    document.getElementById('gydeLocationNext').disabled = true;
    document.getElementById('gydeAdditionalResults').classList.remove('visible');
    document.getElementById('gydeProgress').style.display = 'flex';

    showStep(0);
  }

  // ========================================
  // HELPERS
  // ========================================
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getMockResults() {
    return {
      topMatches: [
        {
          name: 'Majestyk',
          title: 'Web Design & Development Firm',
          profilePicture: 'https://uploads-ssl.webflow.com/607ef28c71149b54ce7ae3fc/placeholder.png',
          location: 'New York City',
          skills: ['Custom Websites', 'E-Commerce / Online Store Design', 'Front-End Design & Development', 'Back-End Design & Development'],
          about: 'Majestyk is a New York-based web design and development firm that specializes in creating custom websites specifically for ecommerce platforms and online shopping pages.',
          profileUrl: 'https://www.joingyde.com/expert/majestyk',
          membershipPlan: 'pln_gyde-pro-plan-abc123',
          aiSummary: 'Majestyk is a strong match based on your need for custom website development with e-commerce capabilities. Their portfolio demonstrates deep expertise in the specific services you requested.'
        },
        {
          name: 'Becca Hornen',
          title: 'Freelance Web Developer',
          profilePicture: 'https://uploads-ssl.webflow.com/607ef28c71149b54ce7ae3fc/placeholder2.png',
          location: 'Seattle, WA',
          skills: ['Front-End Design & Development', 'Landing Page Creation & Design', 'Custom Websites', 'UI/UX Design & Development'],
          about: 'Becca Hornen is a Seattle-based web developer who has a wealth of experience designing landing pages across industries such as automotive, SaaS, real estate, financial services among others.',
          profileUrl: 'https://www.joingyde.com/expert/becca-hornen',
          membershipPlan: 'pln_gyde-basic-plan-c4m80swf',
          aiSummary: 'Becca brings strong front-end development skills and landing page expertise that aligns well with your project requirements.'
        }
      ],
      additionalMatches: [
        {
          name: 'Danielle Martin',
          title: 'Full-Stack Developer',
          profilePicture: '',
          location: 'New York City',
          skills: ['Content Management Systems (CMS)', 'Custom Websites', 'Landing Page Creation & Design'],
          about: 'Danielle brings an impactful and experimental UX experience to all projects with 10+ years of experience in design and development.',
          profileUrl: 'https://www.joingyde.com/expert/danielle-martin',
          membershipPlan: 'pln_gyde-pro-plan-abc123'
        },
        {
          name: 'Kerry LaCoste',
          title: 'Freelance Creative Director & Designer',
          profilePicture: '',
          location: 'St. Petersburg, FL',
          skills: ['Front-End Design & Development', 'Landing Page Creation & Design', 'Brand Design'],
          about: 'Kerry LaCoste is a seasoned Creative Director, Designer, and Founder of LaCoste Design Co. based in St. Petersburg, FL.',
          profileUrl: 'https://www.joingyde.com/expert/kerry-lacoste',
          membershipPlan: 'pln_gyde-basic-plan-c4m80swf'
        },
        {
          name: 'Amanda Wallace',
          title: 'Web & Brand Designer',
          profilePicture: '',
          location: 'Remote',
          skills: ['Custom Websites', 'Brand Design', 'UI/UX Design & Development'],
          about: 'Amanda is a self-taught digital designer with 10 years of experience creating WordPress and Webflow sites.',
          profileUrl: 'https://www.joingyde.com/expert/amanda-wallace',
          membershipPlan: 'pln_gyde-basic-plan-c4m80swf'
        }
      ],
      totalMatches: 5
    };
  }

  // ========================================
  // PUBLIC API
  // ========================================
  window.GydeMatchbot = {
    nextStep,
    prevStep,
    selectLocation,
    toggleCatchAll,
    onStateChange: onStateChange,
    submit,
    showMore,
    reset
  };

  // ========================================
  // BOOT
  // ========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attachContactListeners();
      init();
    });
  } else {
    attachContactListeners();
    init();
  }

})();
