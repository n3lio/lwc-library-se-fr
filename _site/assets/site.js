// SE FR Library — client UX
// Public surface: window.__SE_T(key) for i18n; window.__SE_INDEX for search.
(function () {
  const STORAGE_LANG = 'sefr.lang';
  const STORAGE_TRACKED = 'sefr.tracked.v1';

  // ── i18n
  const T = {
    fr: {
      'connect.btn': '↗ Connecter à mon org',
      'showcase.btn': '🌐 Org de démo',
      'search.placeholder': 'Rechercher…',
      'search.empty': 'Aucun résultat.',
      'cart.selected': 'composants sélectionnés',
      'cart.copy': '📋 Copier en kit',
      'cart.download': '⬇ Télécharger .zip',
      'cart.deploy': '🚀 Déployer dans mon org',
      'tracking.title': 'Avant de continuer — un instant',
      'tracking.sub': 'On suit qui utilise quoi pour mieux maintenir la lib. Promis, on ne spam pas.',
      'tracking.email': 'Votre email Salesforce',
      'tracking.reason': "Pourquoi ce composant / bundle ?",
      'tracking.opp': "Nom de l'opportunité ou du client (optionnel)",
      'tracking.submit': 'Continuer →',
      'tracking.cancel': 'Annuler',
      'tracking.toast': '✓ Merci, suivi enregistré pour la session.',
      'showcase.title': "Demander un accès à l'org de démo",
      'showcase.body': "Un compte read-only vous est créé dans l'org SE_FR_SDO. Renseignez votre email — Lionel revient vers vous avec un magic-link.",
      'showcase.email': 'Votre email',
      'showcase.comment': 'Commentaire (optionnel)',
      'showcase.comment.ph': 'Un cas d’usage spécifique, un composant à voir en priorité, …',
      'showcase.submit': 'Envoyer la demande →',
      'showcase.cancel': 'Annuler',
      'submit.title': 'Soumettre un composant',
      'submit.body': "Un composant que d'autres SE pourraient adorer ? Envoyez-le moi via :",
      'feedback.title': 'Partager un feedback / une idée',
      'feedback.body': "Bug, idée ou retour — dites-moi tout.",
      'feedback.kind': 'Type',
      'feedback.kind.bug': 'Bug',
      'feedback.kind.idea': "Idée d'amélioration",
      'feedback.kind.other': 'Autre',
      'feedback.email': 'Votre email',
      'feedback.message': 'Votre message',
      'feedback.submit': 'Envoyer →',
      'feedback.cancel': 'Annuler',
      'feedback.via.agent': 'Préférez le chat ? Ouvrez le Library Agent (bas à droite).',
      'feedback.subject.bug': 'LWC Library — Bug',
      'feedback.subject.idea': 'LWC Library — Idée',
      'feedback.subject.other': 'LWC Library — Feedback',
      'contact.title': 'Me contacter',
      'contact.body': "Une question ? Un retour ? Écrivez-moi.",
      'contact.email': 'Votre email',
      'contact.subject': 'Sujet',
      'contact.message': 'Votre message',
      'contact.submit': 'Envoyer →',
      'contact.cancel': 'Annuler',
      'contact.subject.placeholder': 'Ex. Question sur seFrKanbanBoard',
      'submitc.title': 'Soumettre un composant',
      'submitc.body': "Merci pour votre contribution !",
      'submitc.author': 'Votre nom',
      'submitc.email': 'Votre email',
      'submitc.name': 'Nom du composant',
      'submitc.name.ph': 'Ex. seFrPipelineHeatmap',
      'submitc.desc': 'Description courte',
      'submitc.desc.ph': 'En une phrase, ce que fait le composant.',
      'submitc.usage': "Cas d'usage / personas",
      'submitc.usage.ph': 'Sales, Service, Marketing… page Account, Home, Service Console, etc.',
      'submitc.attach': 'Lien (zip, repo, vidéo)',
      'submitc.attach.ph': 'Drive, Quip, GitHub… (les pièces jointes lourdes passent mieux par lien)',
      'submitc.notes': 'Commentaires libres',
      'submitc.submit': 'Envoyer →',
      'submitc.cancel': 'Annuler',
      'channels.slack': "Slack #cco-fr-assets — le canal de partage des assets SE FR",
      'channels.qbranch': "Q Branch — Demo Components",
      'channels.email': "Email · lionel.braun@salesforce.com",
      'channels.agent': "Le Library Agent (bouton en bas à droite)",
      'connect.title': 'Déployer sur votre org Salesforce',
      'connect.body': "Connectez-vous via OAuth à votre org de démo (popup de login Salesforce, choix de l'org, le token reste dans votre session navigateur), puis déployez les composants sélectionnés en un clic.",
      'modal.ok': 'Compris',
      'agent.btn': "Demander à l'agent",
      'agent.title': '💬 Library Agent',
      'agent.body': "Posez une question sur la lib — composants, recettes, comment configurer telle ou telle prop. L'agent répond depuis la knowledge base à jour.",
      'agent.examples': 'Exemples : « un composant mobile-ready pour le Field Sales », « ceux qui utilisent l’Apex partagé », « les nouveautés de la v2.8 ».',
      'deploy.toast': '🚀 Déploiement lancé',
      'download.toast': '⬇ Téléchargement lancé',
    },
    en: {
      'connect.btn': '↗ Connect to my org',
      'showcase.btn': '🌐 Showcase org',
      'search.placeholder': 'Search…',
      'search.empty': 'No match.',
      'cart.selected': 'components selected',
      'cart.copy': '📋 Copy as kit',
      'cart.download': '⬇ Download .zip',
      'cart.deploy': '🚀 Deploy to my org',
      'tracking.title': 'One quick thing before you continue',
      'tracking.sub': 'We track usage so we can maintain the library better. No spam, promise.',
      'tracking.email': 'Your Salesforce email',
      'tracking.reason': 'Why this component / bundle?',
      'tracking.opp': 'Opportunity or customer name (optional)',
      'tracking.submit': 'Continue →',
      'tracking.cancel': 'Cancel',
      'tracking.toast': '✓ Thanks — tracked for this session.',
      'showcase.title': 'Request access to the demo org',
      'showcase.body': "A read-only account will be provisioned for you in SE_FR_SDO. Drop your email — Lionel comes back to you with a magic-link.",
      'showcase.email': 'Your email',
      'showcase.comment': 'Comment (optional)',
      'showcase.comment.ph': 'A specific use case, a component you want to see first, …',
      'showcase.submit': 'Send request →',
      'showcase.cancel': 'Cancel',
      'submit.title': 'Submit a component',
      'submit.body': "Built something other SEs might love? Send it my way through:",
      'feedback.title': 'Share feedback or an idea',
      'feedback.body': "Bug, idea or feedback — tell me anything.",
      'feedback.kind': 'Type',
      'feedback.kind.bug': 'Bug',
      'feedback.kind.idea': 'Improvement idea',
      'feedback.kind.other': 'Other',
      'feedback.email': 'Your email',
      'feedback.message': 'Your message',
      'feedback.submit': 'Send →',
      'feedback.cancel': 'Cancel',
      'feedback.via.agent': 'Prefer chat? Open the Library Agent (bottom right).',
      'feedback.subject.bug': 'LWC Library — Bug',
      'feedback.subject.idea': 'LWC Library — Idea',
      'feedback.subject.other': 'LWC Library — Feedback',
      'contact.title': 'Contact me',
      'contact.body': "A question? Feedback? Drop me a line.",
      'contact.email': 'Your email',
      'contact.subject': 'Subject',
      'contact.message': 'Your message',
      'contact.submit': 'Send →',
      'contact.cancel': 'Cancel',
      'contact.subject.placeholder': 'E.g. Question about seFrKanbanBoard',
      'submitc.title': 'Submit a component',
      'submitc.body': "Thanks for your contribution!",
      'submitc.author': 'Your name',
      'submitc.email': 'Your email',
      'submitc.name': 'Component name',
      'submitc.name.ph': 'E.g. seFrPipelineHeatmap',
      'submitc.desc': 'Short description',
      'submitc.desc.ph': 'In one sentence, what your component does.',
      'submitc.usage': 'Use cases / personas',
      'submitc.usage.ph': 'Sales, Service, Marketing… Account record page, Home, Service Console, etc.',
      'submitc.attach': 'Link (zip, repo, video)',
      'submitc.attach.ph': 'Drive, Quip, GitHub… (large attachments are easier via link)',
      'submitc.notes': 'Other comments',
      'submitc.submit': 'Send →',
      'submitc.cancel': 'Cancel',
      'channels.slack': "Slack #cco-fr-assets — the SE FR shared-assets channel",
      'channels.qbranch': "Q Branch — Demo Components",
      'channels.email': "Email · lionel.braun@salesforce.com",
      'channels.agent': "The Library Agent (bottom-right button)",
      'connect.title': 'Deploy to your Salesforce org',
      'connect.body': "Connect via OAuth to your demo org (Salesforce popup login, pick your org, session token lives in your browser only), then deploy the selected components in one click.",
      'modal.ok': 'Got it',
      'agent.btn': 'Ask the agent',
      'agent.title': '💬 Library Agent',
      'agent.body': "Ask anything about the library — components, recipes, how to configure a given prop. The agent answers from the latest knowledge base.",
      'agent.examples': 'Try: "a mobile-ready component for Field Sales", "what uses Apex shared classes", "what’s new in v2.8".',
      'deploy.toast': '🚀 Deploy launched',
      'download.toast': '⬇ Download started',
    }
  };

  function getLang() {
    return localStorage.getItem(STORAGE_LANG) || 'fr';
  }
  function setLang(l) {
    localStorage.setItem(STORAGE_LANG, l);
    applyLang();
  }
  function t(k) { return (T[getLang()] || T.fr)[k] || k; }
  window.__SE_T = t;

  function applyLang() {
    const lang = getLang();
    document.documentElement.lang = lang;
    // Library-controlled content — innerHTML is safe here.
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.innerHTML = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const tx = t(el.dataset.i18nPlaceholder);
      if ('placeholder' in el && el.tagName !== 'SPAN') el.placeholder = tx;
      else el.textContent = tx;
    });
    document.querySelectorAll('[data-i18n-pair]').forEach(el => {
      try {
        const map = JSON.parse(el.dataset.i18nPair);
        const v = map[lang] || map.en || '';
        el.innerHTML = v;
      } catch (e) { /* ignore */ }
    });
    // Component-level i18n: data-i18n-comp="apiName.field" or
    // "apiName.field.idx" (for arrays). EN content lives in DOM,
    // window.__SE_I18N[apiName] = { tagline, chips: [...], keyProps: [...],
    // seBenefit, description } provides the FR replacements.
    const dict = window.__SE_I18N || {};
    function mdInline(s) {
      // Mirror of Python md_inline: escape HTML, then turn `…` → <code>, **…** → <strong>, *…* → <em>.
      var out = String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
      out = out.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      out = out.replace(/(^|[^*])\\*([^*]+)\\*(?!\\*)/g, '$1<em>$2</em>');
      return out;
    }
    document.querySelectorAll('[data-i18n-comp]').forEach(el => {
      const key = el.dataset.i18nComp;
      // Cache the EN version once
      if (el.dataset.i18nEn === undefined) el.dataset.i18nEn = el.innerHTML;
      if (lang === 'en') { el.innerHTML = el.dataset.i18nEn; return; }
      const parts = key.split('.');
      const api = parts[0];
      const field = parts[1];
      const idx = parts[2] !== undefined ? parseInt(parts[2], 10) : null;
      const entry = dict[api];
      if (!entry) return;
      let v;
      if (idx !== null && Array.isArray(entry[field])) v = entry[field][idx];
      else v = entry[field];
      if (typeof v === 'string') el.innerHTML = mdInline(v);
    });
    document.querySelectorAll('[data-lang-btn]').forEach(b => {
      b.classList.toggle('active', b.dataset.langBtn === lang);
    });
    // Update cmd-k index pointer
    if (window.__SE_INDEX_FR && lang === 'fr') window.__SE_ACTIVE_INDEX = window.__SE_INDEX_FR;
    else window.__SE_ACTIVE_INDEX = window.__SE_INDEX;
  }

  // ── Toast helper
  let toastHost = null;
  function toast(msg, ms = 2400) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toast-host';
      document.body.appendChild(toastHost);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastHost.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, ms);
  }
  window.__seToast = toast;

  // ── Generic info modal (Connect, Showcase, Submit, Feedback)
  function openInfoModal(opts) {
    let m = document.getElementById('global-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'global-modal';
      m.className = 'modal-mask';
      m.innerHTML = '<div class="modal"><h3 id="m-t"></h3><div id="m-b"></div><div class="modal-actions"><button class="btn btn-primary" id="m-close">' + t('modal.ok') + '</button></div></div>';
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => { if (ev.target === m || ev.target.id === 'm-close') m.classList.remove('open'); });
    }
    m.querySelector('#m-t').textContent = opts.title;
    m.querySelector('#m-b').innerHTML = opts.bodyHtml || ('<p>' + (opts.body || '') + '</p>');
    m.querySelector('#m-close').textContent = t('modal.ok');
    m.classList.add('open');
  }

  // ── Tracking modal — fired before download/deploy, once per session
  function isTracked() { return sessionStorage.getItem(STORAGE_TRACKED) === '1'; }
  function markTracked() { sessionStorage.setItem(STORAGE_TRACKED, '1'); }

  function openTrackingModal(onComplete) {
    let m = document.getElementById('tracking-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'tracking-modal';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal">' +
        '<h3 data-i18n="tracking.title"></h3>' +
        '<p class="modal-sub" data-i18n="tracking.sub"></p>' +
        '<form id="tracking-form" class="tracking-form">' +
        '<label><span data-i18n="tracking.email"></span><input type="email" name="email" required></label>' +
        '<label><span data-i18n="tracking.reason"></span><textarea name="reason" rows="2" required></textarea></label>' +
        '<label><span data-i18n="tracking.opp"></span><input type="text" name="opp"></label>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-tracking-cancel data-i18n="tracking.cancel"></button>' +
        '<button type="submit" class="btn btn-primary" data-i18n="tracking.submit"></button>' +
        '</div></form></div>'
      );
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-tracking-cancel]')) {
          m.classList.remove('open');
        }
      });
      m.querySelector('#tracking-form').addEventListener('submit', (e) => {
        e.preventDefault();
        markTracked();
        m.classList.remove('open');
        toast(t('tracking.toast'));
        const cb = m.__sePending;
        m.__sePending = null;
        if (typeof cb === 'function') setTimeout(cb, 100);
      });
      applyLang();
    }
    m.__sePending = onComplete;
    m.classList.add('open');
    setTimeout(() => m.querySelector('input[name="email"]').focus(), 30);
  }

  // ── Feedback modal — opens a mailto: with prefilled subject + body
  function openFeedbackModal() {
    const FEEDBACK_TO = 'lionel.braun@salesforce.com';
    let m = document.getElementById('feedback-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'feedback-modal';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal">' +
        '<h3 data-i18n="feedback.title"></h3>' +
        '<p class="modal-sub" data-i18n="feedback.body"></p>' +
        '<form id="feedback-form" class="tracking-form">' +
        '<label><span data-i18n="feedback.kind"></span><select name="kind">' +
        '<option value="bug" data-i18n="feedback.kind.bug"></option>' +
        '<option value="idea" data-i18n="feedback.kind.idea"></option>' +
        '<option value="other" data-i18n="feedback.kind.other"></option>' +
        '</select></label>' +
        '<label><span data-i18n="feedback.email"></span><input type="email" name="email" required></label>' +
        '<label><span data-i18n="feedback.message"></span><textarea name="message" rows="5" required></textarea></label>' +
        '<p style="font-size:11.5px;color:var(--text-muted);margin:0" data-i18n="feedback.via.agent"></p>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-feedback-cancel data-i18n="feedback.cancel"></button>' +
        '<button type="submit" class="btn btn-primary" data-i18n="feedback.submit"></button>' +
        '</div></form></div>'
      );
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-feedback-cancel]')) {
          m.classList.remove('open');
        }
      });
      m.querySelector('#feedback-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const kind = f.kind.value;
        const subject = t('feedback.subject.' + kind);
        const fromEmail = f.email.value.trim();
        const msg = f.message.value.trim();
        const body = msg + '\n\n— ' + fromEmail + ' (via the LWC Library site)';
        const url = 'mailto:' + FEEDBACK_TO +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
        window.location.href = url;
        m.classList.remove('open');
      });
      applyLang();
    }
    m.classList.add('open');
    setTimeout(() => m.querySelector('input[name="email"]').focus(), 30);
  }

  // ── Submit-component modal — full form, mailto on submit
  function openSubmitComponentModal() {
    const TO = 'lionel.braun@salesforce.com';
    let m = document.getElementById('submit-component-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'submit-component-modal';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal modal-wide">' +
        '<h3 data-i18n="submitc.title"></h3>' +
        '<p class="modal-sub" data-i18n="submitc.body"></p>' +
        '<form id="submit-component-form" class="tracking-form">' +
        '<div class="form-row">' +
        '<label><span data-i18n="submitc.author"></span><input type="text" name="author" required></label>' +
        '<label><span data-i18n="submitc.email"></span><input type="email" name="email" required></label>' +
        '</div>' +
        '<label><span data-i18n="submitc.name"></span><input type="text" name="cname" data-i18n-placeholder="submitc.name.ph" required></label>' +
        '<label><span data-i18n="submitc.desc"></span><textarea name="desc" rows="2" data-i18n-placeholder="submitc.desc.ph" required></textarea></label>' +
        '<label><span data-i18n="submitc.usage"></span><textarea name="usage" rows="2" data-i18n-placeholder="submitc.usage.ph" required></textarea></label>' +
        '<label><span data-i18n="submitc.attach"></span><input type="url" name="attach" data-i18n-placeholder="submitc.attach.ph"></label>' +
        '<label><span data-i18n="submitc.notes"></span><textarea name="notes" rows="3"></textarea></label>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-submitc-cancel data-i18n="submitc.cancel"></button>' +
        '<button type="submit" class="btn btn-primary" data-i18n="submitc.submit"></button>' +
        '</div></form></div>'
      );
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-submitc-cancel]')) {
          m.classList.remove('open');
        }
      });
      m.querySelector('#submit-component-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const author = f.author.value.trim();
        const fromEmail = f.email.value.trim();
        const cname = f.cname.value.trim();
        const desc = f.desc.value.trim();
        const usage = f.usage.value.trim();
        const attach = f.attach.value.trim();
        const notes = f.notes.value.trim();
        const subject = 'LWC Library — Submission: ' + cname;
        const lines = [
          'Author: ' + author + ' <' + fromEmail + '>',
          'Component: ' + cname,
          '',
          'Description:',
          desc,
          '',
          'Use cases / personas:',
          usage,
        ];
        if (attach) { lines.push('', 'Link: ' + attach); }
        if (notes)  { lines.push('', 'Notes:', notes); }
        lines.push('', '— sent via the LWC Library site');
        const url = 'mailto:' + TO +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(lines.join('\\n'));
        window.location.href = url;
        m.classList.remove('open');
      });
      applyLang();
    }
    m.classList.add('open');
    setTimeout(() => m.querySelector('input[name="author"]').focus(), 30);
  }

  // ── Contact modal — same blurred-mask UX, prefills mailto on submit
  function openContactModal() {
    const CONTACT_TO = 'lionel.braun@salesforce.com';
    let m = document.getElementById('contact-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'contact-modal';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal">' +
        '<h3 data-i18n="contact.title"></h3>' +
        '<p class="modal-sub" data-i18n="contact.body"></p>' +
        '<form id="contact-form" class="tracking-form">' +
        '<label><span data-i18n="contact.email"></span><input type="email" name="email" required></label>' +
        '<label><span data-i18n="contact.subject"></span><input type="text" name="subject" data-i18n-placeholder="contact.subject.placeholder" required></label>' +
        '<label><span data-i18n="contact.message"></span><textarea name="message" rows="5" required></textarea></label>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-contact-cancel data-i18n="contact.cancel"></button>' +
        '<button type="submit" class="btn btn-primary" data-i18n="contact.submit"></button>' +
        '</div></form></div>'
      );
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-contact-cancel]')) {
          m.classList.remove('open');
        }
      });
      m.querySelector('#contact-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const subject = f.subject.value.trim() || 'LWC Library — Contact';
        const fromEmail = f.email.value.trim();
        const msg = f.message.value.trim();
        const body = msg + '\\n\\n— ' + fromEmail + ' (via the LWC Library site)';
        const url = 'mailto:' + CONTACT_TO +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
        window.location.href = url;
        m.classList.remove('open');
      });
      applyLang();
    }
    m.classList.add('open');
    setTimeout(() => m.querySelector('input[name="email"]').focus(), 30);
  }

  // ── Showcase access request — same blurred-mask UX, prefills mailto on submit
  function openShowcaseModal(opts) {
    const SHOWCASE_TO = 'lionel.braun@salesforce.com';
    const ctx = (opts && opts.context) || '';
    let m = document.getElementById('showcase-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'showcase-modal';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal">' +
        '<h3 data-i18n="showcase.title"></h3>' +
        '<p class="modal-sub" data-i18n="showcase.body"></p>' +
        '<form id="showcase-form" class="tracking-form">' +
        '<label><span data-i18n="showcase.email"></span><input type="email" name="email" required></label>' +
        '<label><span data-i18n="showcase.comment"></span><textarea name="comment" rows="3" data-i18n-placeholder="showcase.comment.ph"></textarea></label>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-showcase-cancel data-i18n="showcase.cancel"></button>' +
        '<button type="submit" class="btn btn-primary" data-i18n="showcase.submit"></button>' +
        '</div></form></div>'
      );
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-showcase-cancel]')) {
          m.classList.remove('open');
        }
      });
      m.querySelector('#showcase-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const fromEmail = f.email.value.trim();
        const comment = f.comment.value.trim();
        const ctxNow = m.dataset.context || '';
        const subject = ctxNow
          ? 'Demande d’accès SE FR Showcase — focus ' + ctxNow
          : 'Demande d’accès SE FR Showcase';
        const lines = [
          'Email demandeur: ' + fromEmail,
          'Type: read-only access via STORM',
        ];
        if (ctxNow) lines.push('Composant d’intérêt: ' + ctxNow);
        if (comment) lines.push('', 'Commentaire:', comment);
        lines.push('', '— sent via the LWC Library site');
        const url = 'mailto:' + SHOWCASE_TO +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(lines.join('\\n'));
        window.location.href = url;
        m.classList.remove('open');
      });
      applyLang();
    }
    m.dataset.context = ctx;
    m.classList.add('open');
    setTimeout(() => m.querySelector('input[name="email"]').focus(), 30);
  }

  // ── Mock buttons handler
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-mock]');
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    const kind = target.dataset.mock;

    function doAction() {
      if (kind === 'deploy' || kind === 'deploy-bundle' || kind === 'deploy-all') {
        const n = target.dataset.count || '1';
        toast(t('deploy.toast') + ' (' + n + ')');
      } else if (kind === 'download') {
        toast(t('download.toast'));
      }
      // Bump download counters for all members + the bundle id (if any)
      const ids = [];
      const bundleId = target.dataset.bundleId;
      if (bundleId) ids.push('recipe-' + bundleId);
      const members = (target.dataset.bundleMembers || '').split(',').filter(Boolean);
      ids.push(...members);
      ids.forEach(id => bumpDownload(id));
    }

    if (kind === 'connect') {
      openInfoModal({ title: t('connect.title'), body: t('connect.body') });
      return;
    }
    if (kind === 'showcase') {
      openShowcaseModal({ context: target.dataset.componentApi || '' });
      return;
    }
    if (kind === 'submit' || kind === 'submit-component') {
      openSubmitComponentModal();
      return;
    }
    if (kind === 'feedback') {
      openFeedbackModal();
      return;
    }
    if (kind === 'contact') {
      openContactModal();
      return;
    }
    // Tracked actions: deploy + download
    if (['deploy', 'deploy-bundle', 'deploy-all', 'download'].includes(kind)) {
      if (isTracked()) doAction();
      else openTrackingModal(doAction);
      return;
    }
    // Default fallthrough
    doAction();
  });

  // ── Language switcher
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang-btn]');
    if (!b) return;
    e.preventDefault();
    setLang(b.dataset.langBtn);
  });

  // ── Agent widget mock
  const agentBtn = document.querySelector('.agent-button');
  if (agentBtn) {
    let panel = null;
    agentBtn.addEventListener('click', () => {
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'agent-panel';
        panel.innerHTML = '<button class="close">×</button><h4 data-i18n="agent.title"></h4><p data-i18n="agent.body"></p><p style="font-size:11.5px; color:var(--text-muted)" data-i18n="agent.examples"></p>';
        document.body.appendChild(panel);
        panel.querySelector('.close').addEventListener('click', () => panel.classList.remove('open'));
        applyLang();
      }
      panel.classList.toggle('open');
    });
  }

  // ── Cmd+K search
  const cmdkBtn = document.querySelector('.cmd-k');
  if (cmdkBtn && window.__SE_INDEX) {
    let modal = null, input = null, list = null, idx = 0, current = [];
    function openSearch() {
      if (!modal) buildSearch();
      modal.classList.add('open');
      input.value = '';
      idx = 0;
      render('');
      setTimeout(() => input.focus(), 30);
    }
    function buildSearch() {
      modal = document.createElement('div');
      modal.className = 'search-modal';
      modal.innerHTML = '<div class="search-box"><input data-i18n-placeholder="search.placeholder"><div class="search-results"></div></div>';
      document.body.appendChild(modal);
      input = modal.querySelector('input');
      list = modal.querySelector('.search-results');
      applyLang();
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
      input.addEventListener('input', () => { idx = 0; render(input.value); });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.classList.remove('open');
        else if (e.key === 'Enter') current[idx] && (window.location = current[idx].href);
        else if (e.key === 'ArrowDown') { idx = Math.min(idx + 1, current.length - 1); refreshActive(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { idx = Math.max(idx - 1, 0); refreshActive(); e.preventDefault(); }
      });
    }
    function render(q) {
      q = q.trim().toLowerCase();
      const all = window.__SE_ACTIVE_INDEX || window.__SE_INDEX;
      current = q ? all.filter(x => x.haystack.includes(q)).slice(0, 12) : all.slice(0, 12);
      if (!current.length) {
        list.innerHTML = '<div class="search-empty">' + t('search.empty') + '</div>';
        return;
      }
      list.innerHTML = current.map((x, i) =>
        `<a class="search-result${i===idx?' active':''}" href="${x.href}"><span class="name">${x.name}</span><span class="api">${x.api}</span><div class="tagline">${x.tagline||''}</div></a>`
      ).join('');
    }
    function refreshActive() {
      list.querySelectorAll('.search-result').forEach((el, i) => el.classList.toggle('active', i === idx));
    }
    cmdkBtn.addEventListener('click', openSearch);
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    });
  }

  // ── Components page filters
  const filterBar = document.querySelector('.filter-bar');
  const grid = document.querySelector('.components-grid-host');
  if (filterBar && grid) {
    const allCards = Array.from(grid.querySelectorAll('.card'));
    const allSections = Array.from(grid.querySelectorAll('h2.section-title'));
    const counter = filterBar.querySelector('.results-count');
    const totalEl = counter && counter.querySelector('.results-of');
    // Cards are duplicated per category (a multi-cat component appears
    // in each of its categories), so dedup by data-api for accurate
    // counts in the badge.
    const uniqueApis = new Set(allCards.map(c => c.dataset.api).filter(Boolean));
    const totalUnique = uniqueApis.size;
    const state = { category: '', persona: '', surface: '', dataMode: '', q: '' };

    filterBar.addEventListener('click', (e) => {
      const p = e.target.closest('.filter-dd-panel button[data-group]');
      if (!p) return;
      const group = p.dataset.group;
      const value = p.dataset.value || '';
      const dd = p.closest('.filter-dd');
      const summary = dd && dd.querySelector('summary');
      const groupBtns = filterBar.querySelectorAll('.filter-dd-panel button[data-group="' + group + '"]');
      groupBtns.forEach(x => x.classList.toggle('active', x === p));
      // Update summary label
      if (summary) {
        const valEl = summary.querySelector('.dd-value');
        if (valEl) {
          const lang = (typeof getLang === 'function') ? getLang() : 'fr';
          const lbl = (lang === 'en' && p.dataset.labelEn) ? p.dataset.labelEn : (p.dataset.label || '');
          valEl.textContent = lbl;
          valEl.setAttribute('data-i18n-pair', JSON.stringify({fr: p.dataset.label || '', en: p.dataset.labelEn || p.dataset.label || ''}).replace(/'/g, '&#39;'));
        }
        dd.classList.toggle('has-active', !!value);
      }
      state[group] = value;
      // Close the dropdown
      if (dd) dd.open = false;
      apply();
    });
    // Close any open dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.closest('.filter-dd')) return;
      filterBar.querySelectorAll('.filter-dd[open]').forEach(d => d.open = false);
    });
    // Mutually exclusive: opening one dropdown closes the others.
    filterBar.querySelectorAll('.filter-dd').forEach(dd => {
      dd.addEventListener('toggle', () => {
        if (!dd.open) return;
        filterBar.querySelectorAll('.filter-dd[open]').forEach(other => {
          if (other !== dd) other.open = false;
        });
      });
    });

    function apply() {
      const q = (state.q || '').toLowerCase();
      const visibleApis = new Set();
      allCards.forEach(c => {
        const personas = (c.dataset.personas || '').split('|');
        const surfaces = (c.dataset.surfaces || '').split('|');
        const cats = (c.dataset.categories || '').split('|');
        const dm = c.dataset.datamode || '';
        const haystack = (c.dataset.haystack || '').toLowerCase();
        let show = true;
        if (state.category && !cats.includes(state.category)) show = false;
        if (show && state.persona && !personas.includes(state.persona)) show = false;
        if (show && state.surface && !surfaces.includes(state.surface)) show = false;
        if (show && state.dataMode && dm !== state.dataMode) show = false;
        if (show && q && !haystack.includes(q)) show = false;
        c.style.display = show ? '' : 'none';
        if (show && c.dataset.api) visibleApis.add(c.dataset.api);
      });
      const visible = visibleApis.size;
      allSections.forEach(h => {
        const gridEl = h.nextElementSibling;
        if (!gridEl) return;
        const sectionCat = h.dataset.category || '';
        const visibleCards = Array.from(gridEl.querySelectorAll('.card')).filter(c => c.style.display !== 'none');
        // If a category filter is active, only the matching section stays visible.
        const matchesCatFilter = !state.category || state.category === sectionCat;
        const showSection = matchesCatFilter && visibleCards.length > 0;
        h.style.display = showSection ? '' : 'none';
        gridEl.style.display = showSection ? '' : 'none';
        // Hide non-matching cards within this section so the count reflects reality
        // even though they remain in the DOM (multi-category components are duplicated).
        if (!matchesCatFilter) {
          gridEl.querySelectorAll('.card').forEach(c => { c.style.display = 'none'; });
        }
        // Update the count badge
        const cnt = h.querySelector('.count');
        if (cnt) {
          const n = matchesCatFilter ? visibleCards.length : 0;
          const lang = (typeof getLang === 'function') ? getLang() : 'fr';
          cnt.textContent = (lang === 'fr')
            ? `${n} composant${n === 1 ? '' : 's'}`
            : `${n} component${n === 1 ? '' : 's'}`;
        }
      });
      if (counter) {
        const strong = counter.querySelector('strong');
        if (strong) strong.textContent = visible;
        // Patch the trailing "/ N affichés" / "/ N shown" so it matches
        // the unique count even after the i18n switch.
        if (totalEl) {
          const lang = (typeof getLang === 'function') ? getLang() : 'fr';
          totalEl.textContent = (lang === 'fr')
            ? `/ ${totalUnique} affichés`
            : `/ ${totalUnique} shown`;
        }
      }
    }
    apply();
  }

  // ── Cart for multi-select on the components page
  const cart = document.querySelector('.cart');
  if (cart) {
    const selected = new Set();
    function refresh() {
      cart.classList.toggle('hidden', selected.size === 0);
      const c = cart.querySelector('.cart-count strong');
      if (c) c.textContent = selected.size;
      cart.dataset.selectedApis = Array.from(selected).join(',');
      const deployBtn = cart.querySelector('[data-mock="deploy-bundle"]');
      if (deployBtn) deployBtn.dataset.count = selected.size;
    }
    document.addEventListener('click', (e) => {
      const cb = e.target.closest('.card-checkbox');
      if (!cb) return;
      e.preventDefault();
      e.stopPropagation();
      const card = cb.closest('.card');
      if (!card) return;
      const api = card.dataset.api;
      if (selected.has(api)) {
        selected.delete(api);
        card.classList.remove('selected');
      } else {
        selected.add(api);
        card.classList.add('selected');
      }
      refresh();
    });
    refresh();
  }

  // ── Preview carousel (component detail page)
  document.querySelectorAll('.preview-carousel').forEach(car => {
    const slides = Array.from(car.querySelectorAll('.preview-slide'));
    const dots = Array.from(car.querySelectorAll('.preview-dot'));
    const prev = car.querySelector('.preview-arrow.prev');
    const next = car.querySelector('.preview-arrow.next');
    let i = 0;
    function show(idx) {
      i = (idx + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('active', k === i));
      dots.forEach((d, k) => d.classList.toggle('active', k === i));
    }
    if (prev) prev.addEventListener('click', () => show(i - 1));
    if (next) next.addEventListener('click', () => show(i + 1));
    dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
  });

  // ── Lightbox — click any preview image to zoom full-screen + nav across siblings
  let lightbox = null;
  let lbImages = [];
  let lbIndex = 0;
  function buildLightbox() {
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML =
      '<div class="lightbox-counter" aria-live="polite"></div>' +
      '<button class="lightbox-nav prev" aria-label="Previous">‹</button>' +
      '<img alt="">' +
      '<button class="lightbox-nav next" aria-label="Next">›</button>' +
      '<div class="lightbox-dots" role="tablist"></div>' +
      '<button class="lightbox-close" aria-label="Close">×</button>';
    document.body.appendChild(lightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
      else if (e.target.classList.contains('lightbox-close')) closeLightbox();
      else if (e.target.classList.contains('prev')) showLb(lbIndex - 1);
      else if (e.target.classList.contains('next')) showLb(lbIndex + 1);
      else if (e.target.matches('.lightbox-dots button')) {
        const k = Number(e.target.dataset.k); if (!Number.isNaN(k)) showLb(k);
      }
    });
  }
  function showLb(i) {
    if (!lbImages.length) return;
    lbIndex = (i + lbImages.length) % lbImages.length;
    const item = lbImages[lbIndex];
    const img = lightbox.querySelector('img');
    img.src = item.src; img.alt = item.alt || '';
    const multi = lbImages.length > 1;
    lightbox.querySelector('.prev').hidden = !multi;
    lightbox.querySelector('.next').hidden = !multi;
    const counter = lightbox.querySelector('.lightbox-counter');
    counter.hidden = !multi;
    if (multi) counter.textContent = (lbIndex + 1) + ' / ' + lbImages.length;
    const dots = lightbox.querySelector('.lightbox-dots');
    dots.hidden = !multi;
    if (multi && dots.children.length !== lbImages.length) {
      dots.innerHTML = lbImages.map((_, k) => '<button data-k="' + k + '" aria-label="Go to ' + (k+1) + '"></button>').join('');
    }
    if (multi) {
      Array.from(dots.children).forEach((b, k) => b.classList.toggle('active', k === lbIndex));
    }
  }
  function openLightbox(siblings, startIndex) {
    if (!lightbox) buildLightbox();
    lbImages = siblings;
    showLb(startIndex || 0);
    requestAnimationFrame(() => lightbox.classList.add('open'));
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.preview-large.preview-image img, .preview-slide img');
    if (!img) return;
    e.preventDefault();
    // Build the sibling list from the parent .preview-large (carousel = many slides, single = 1 image)
    const parent = img.closest('.preview-large');
    let siblings = [];
    let start = 0;
    if (parent && parent.classList.contains('preview-carousel')) {
      const slides = Array.from(parent.querySelectorAll('.preview-slide img'));
      siblings = slides.map(s => ({ src: s.src, alt: s.alt }));
      start = slides.indexOf(img);
      if (start < 0) start = 0;
    } else {
      siblings = [{ src: img.src, alt: img.alt }];
    }
    openLightbox(siblings, start);
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
    else if (e.key === 'ArrowRight') showLb(lbIndex + 1);
  });

  // ── Social counters: stable per-id base values + localStorage deltas (downloads + likes)
  const COUNTS_KEY = 'se_fr_counts_v1';
  const LIKES_KEY = 'se_fr_likes_v1';
  function loadCounts() { try { return JSON.parse(localStorage.getItem(COUNTS_KEY) || '{}'); } catch (_) { return {}; } }
  function saveCounts(c) { try { localStorage.setItem(COUNTS_KEY, JSON.stringify(c)); } catch (_) {} }
  function loadLikedSet() { try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || '[]')); } catch (_) { return new Set(); } }
  function saveLikedSet(s) { try { localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(s))); } catch (_) {} }
  function fmtCount(n) {
    if (n >= 10000) return Math.floor(n / 1000) + 'k';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\\.0$/, '') + 'k';
    return String(n);
  }
  function applyCountsTo(scope) {
    const counts = loadCounts();
    const liked = loadLikedSet();
    (scope || document).querySelectorAll('[data-stats-for]').forEach(el => {
      const id = el.dataset.statsFor;
      const host = id.startsWith('recipe-')
        ? document.querySelector('.recipe-card[id="' + id.slice('recipe-'.length) + '"]')
        : document.querySelector('[data-api="' + id + '"]') || el.closest('[data-base-dl]');
      const baseDl = host ? Number(host.dataset.baseDl || 0) : 0;
      const baseLk = host ? Number(host.dataset.baseLk || 0) : 0;
      const c = counts[id] || {};
      const dl = baseDl + (c.dl || 0);
      const lk = baseLk + (c.lk || 0);
      const dlEl = el.querySelector('.dl-count');
      const lkEl = el.querySelector('.lk-count');
      if (dlEl) dlEl.textContent = fmtCount(dl);
      if (lkEl) lkEl.textContent = fmtCount(lk);
      const btn = el.querySelector('.like-btn');
      if (btn) {
        const isLiked = liked.has(id);
        btn.classList.toggle('liked', isLiked);
        btn.setAttribute('aria-pressed', isLiked ? 'true' : 'false');
        const ic = btn.querySelector('.icon');
        if (ic) ic.textContent = isLiked ? '♥' : '♡';
      }
    });
  }
  function bumpDownload(id) {
    if (!id) return;
    const counts = loadCounts();
    counts[id] = counts[id] || {};
    counts[id].dl = (counts[id].dl || 0) + 1;
    saveCounts(counts);
    applyCountsTo();
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.like-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const id = btn.dataset.likeFor;
    if (!id) return;
    const liked = loadLikedSet();
    const counts = loadCounts();
    counts[id] = counts[id] || {};
    if (liked.has(id)) {
      liked.delete(id);
      counts[id].lk = (counts[id].lk || 0) - 1;
    } else {
      liked.add(id);
      counts[id].lk = (counts[id].lk || 0) + 1;
      btn.classList.remove('bump');
      void btn.offsetWidth;
      btn.classList.add('bump');
    }
    saveLikedSet(liked);
    saveCounts(counts);
    applyCountsTo();
  });
  applyCountsTo();

  // ── Page transitions — fade-in only, on arrival. No fade-out before unload (would leave a
  // white gap during load). The smooth feel comes entirely from pageInitialFade on body.
  // @view-transition CSS gives a true cross-doc fade on the rare browsers that ship it.

  // ── Back-to-top
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a.back-to-top');
    if (!a) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── Docs scrollspy — highlight the side-nav link matching the section in view
  const docsSide = document.querySelector('.docs-side');
  const docsMain = document.querySelector('.docs-main');
  if (docsSide && docsMain && 'IntersectionObserver' in window) {
    const sectionEls = Array.from(docsMain.querySelectorAll('h2[id]'));
    const linkById = new Map();
    docsSide.querySelectorAll('a[href*="#"]').forEach(a => {
      const hash = a.getAttribute('href').split('#')[1];
      if (hash) linkById.set(hash, a);
    });
    if (sectionEls.length) {
      const visible = new Set();
      const setActive = (id) => {
        docsSide.querySelectorAll('a.active').forEach(a => a.classList.remove('active'));
        const link = linkById.get(id);
        if (link) link.classList.add('active');
      };
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting) visible.add(en.target.id);
          else visible.delete(en.target.id);
        });
        // Pick the first section currently visible (closest to top)
        const first = sectionEls.find(s => visible.has(s.id));
        if (first) setActive(first.id);
      }, { rootMargin: '-90px 0px -60% 0px', threshold: 0 });
      sectionEls.forEach(s => obs.observe(s));
      // Default to first section on load
      setActive(sectionEls[0].id);
    }
  }

  // Init i18n on page load
  applyLang();
})();
