// CCO FR Library — client UX
// Public surface: window.__SE_T(key) for i18n; window.__SE_INDEX for search.
(function () {
  const STORAGE_LANG = 'sefr.lang';
  const STORAGE_TRACKED = 'sefr.tracked.v1';
  const STORAGE_AUTH = 'sefr.auth.v1';
  const STORAGE_FP = 'sefr.fp.v1';
  const PKCE_KEY = 'sefr.pkce.v1';

  // ── Tracking — fire-and-forget POST to backend. Never blocks UX.
  function track(path, body) {
    const url = '/api/track/' + path;
    const payload = JSON.stringify(body || {});
    // Use sendBeacon when available so the request survives page navigation.
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(url, blob)) return;
      } catch (e) { /* fall through to fetch */ }
    }
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch (e) { /* ignore */ }
  }

  // Stable per-browser fingerprint for like dedup (not used for identification).
  function getFingerprint() {
    let fp = localStorage.getItem(STORAGE_FP);
    if (!fp) {
      fp = (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 24);
      localStorage.setItem(STORAGE_FP, fp);
    }
    return fp;
  }

  // ── i18n
  const T = {
    fr: {
      'connect.btn': '↗ Connecter à mon org',
      'showcase.btn': '🚀 Voir en live',
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
      'feedback.toast.sent': '✓ Merci, votre message a bien été enregistré.',
      'feedback.toast.error': '✗ Erreur d’envoi. Réessayez dans un instant.',
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
      'submitc.file': 'Fichier (.zip ou .txt, max 5 MB)',
      'submitc.file.hint': 'Joignez le zip de votre composant ou un export de code en .txt.',
      'submitc.notes': 'Commentaires libres',
      'submitc.submit': 'Envoyer →',
      'submitc.cancel': 'Annuler',
      'submitc.toast.sent': '✓ Soumission envoyée. Merci ! On revient vers vous.',
      'submitc.toast.error': '✗ Erreur d’envoi. Vérifiez votre connexion et réessayez.',
      'submitc.toast.toobig': '✗ Fichier trop lourd (max 5 MB).',
      'submitc.toast.badext': '✗ Format non supporté. Acceptés : .zip, .txt',
      'submitc.coming.pill': 'Bientôt',
      'submitc.coming.text': 'Connectez votre org et cochez directement les composants à soumettre — fini le zip manuel.',
      'channels.slack': "Slack #cco-fr-assets — le canal de partage des assets CCO FR",
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
      'download.multi.allow': 'autorisez les téléchargements multiples si demandé',
      'connect.menu.disconnect': 'Se déconnecter',
      'connect.menu.signedinas': 'Connecté en tant que',
      'connect.choose.title': 'Connecter votre org de démo',
      'connect.choose.sub': "Cette org sera la cible des déploiements. Connectez-vous à VOTRE org de démo (SDO/IDO/scratch) — pas à l'org showcase, pas à une prod client.",
      'connect.choose.login': 'Login Salesforce',
      'connect.choose.login.sub': 'login.salesforce.com — vos identifiants Salesforce habituels',
      'connect.choose.sandbox': 'Sandbox',
      'connect.choose.sandbox.sub': 'test.salesforce.com',
      'connect.choose.advanced': 'My Domain personnalisé',
      'connect.choose.advanced.sub': 'Si vous connaissez l’URL exacte de votre org',
      'connect.choose.sdo': 'My Domain',
      'connect.choose.sdo.sub': 'Tapez votre URL d’org',
      'connect.choose.sdo.ph': 'storm.my.salesforce.com',
      'connect.choose.scratch': 'Scratch org',
      'connect.choose.scratch.sub': 'test.salesforce.com',
      'connect.choose.continue': 'Continuer →',
      'connect.choose.back': '← Retour',
      'connect.choose.cancel': 'Annuler',
      'connect.popup.blocked': '⚠ Autorisez la popup pour vous connecter à Salesforce.',
      'connect.toast.connected': '✓ Connecté à',
      'connect.toast.disconnected': 'Déconnecté de votre org.',
      'connect.toast.failed': '✗ Connexion échouée',
      'connect.toast.notconfigured': 'OAuth pas encore configuré côté serveur — réessayez dans quelques minutes.',
      'deploy.progress.preparing': 'Préparation du package…',
      'deploy.progress.uploading': 'Envoi du package à Salesforce…',
      'deploy.progress.deploying': 'Déploiement en cours',
      'deploy.toast.success': '✓ Déployé sur',
      'deploy.toast.partial': '⚠ Déployé partiellement —',
      'deploy.toast.failed': '✗ Déploiement échoué',
      'deploy.error.notconnected': 'Veuillez vous connecter à votre org avant de déployer.',
      'deploy.confirm.title': 'Confirmer le déploiement',
      'deploy.confirm.body.one': 'Déployer ce composant sur',
      'deploy.confirm.body.many': 'Déployer ces composants sur',
      'deploy.confirm.deploy': 'Déployer →',
      'deploy.confirm.cancel': 'Annuler',
      'deploy.success.title': '✓ Déploiement réussi',
      'deploy.success.title.partial': '⚠ Déploiement partiel',
      'deploy.success.sub': '{count} composant(s) déployé(s) sur {host}.',
      'deploy.success.sub.partial': '{deployed}/{total} composant(s) déployé(s) sur {host}. Quelques erreurs ci-dessous.',
      'deploy.success.open': '↗ Ouvrir mon org',
      'deploy.success.close': 'Fermer',
      'showcase.toast.failed': '✗ Showcase indisponible',
      'showcase.toast.popupblocked': '⚠ Popup bloquée — ouverture dans cet onglet…',
    },
    en: {
      'connect.btn': '↗ Connect to my org',
      'showcase.btn': '🚀 See it live',
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
      'feedback.toast.sent': '✓ Thanks — your message has been recorded.',
      'feedback.toast.error': '✗ Submission failed. Please try again.',
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
      'submitc.file': 'File (.zip or .txt, max 5 MB)',
      'submitc.file.hint': 'Attach the zip of your component or a .txt code export.',
      'submitc.notes': 'Other comments',
      'submitc.submit': 'Send →',
      'submitc.cancel': 'Cancel',
      'submitc.toast.sent': '✓ Submission sent. Thanks — we’ll get back to you.',
      'submitc.toast.error': '✗ Submission failed. Check your connection and retry.',
      'submitc.toast.toobig': '✗ File too large (max 5 MB).',
      'submitc.toast.badext': '✗ Unsupported format. Accepted: .zip, .txt',
      'submitc.coming.pill': 'Coming soon',
      'submitc.coming.text': 'Connect your org and tick the components to submit — no more manual zip.',
      'channels.slack': "Slack #cco-fr-assets — the CCO FR shared-assets channel",
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
      'download.multi.allow': 'allow multiple downloads if your browser asks',
      'connect.menu.disconnect': 'Disconnect',
      'connect.menu.signedinas': 'Signed in as',
      'connect.choose.title': 'Connect to your demo org',
      'connect.choose.sub': "This org will be the deploy target. Connect to YOUR demo org (SDO/IDO/scratch) — NOT the showcase org, NOT a customer prod.",
      'connect.choose.login': 'Salesforce login',
      'connect.choose.login.sub': 'login.salesforce.com — your usual Salesforce credentials',
      'connect.choose.sandbox': 'Sandbox',
      'connect.choose.sandbox.sub': 'test.salesforce.com',
      'connect.choose.advanced': 'Custom My Domain',
      'connect.choose.advanced.sub': 'If you know your org URL exactly',
      'connect.choose.sdo': 'My Domain',
      'connect.choose.sdo.sub': 'Type your org URL',
      'connect.choose.sdo.ph': 'storm.my.salesforce.com',
      'connect.choose.scratch': 'Scratch org',
      'connect.choose.scratch.sub': 'test.salesforce.com',
      'connect.choose.continue': 'Continue →',
      'connect.choose.back': '← Back',
      'connect.choose.cancel': 'Cancel',
      'connect.popup.blocked': '⚠ Please allow the popup to sign in to Salesforce.',
      'connect.toast.connected': '✓ Connected to',
      'connect.toast.disconnected': 'Disconnected from your org.',
      'connect.toast.failed': '✗ Connection failed',
      'connect.toast.notconfigured': 'OAuth not configured yet on the server — try again in a moment.',
      'deploy.progress.preparing': 'Preparing the package…',
      'deploy.progress.uploading': 'Uploading the package to Salesforce…',
      'deploy.progress.deploying': 'Deploying',
      'deploy.toast.success': '✓ Deployed to',
      'deploy.toast.partial': '⚠ Partial deploy —',
      'deploy.toast.failed': '✗ Deploy failed',
      'deploy.error.notconnected': 'Please connect to your org before deploying.',
      'deploy.confirm.title': 'Confirm deploy',
      'deploy.confirm.body.one': 'Deploy this component to',
      'deploy.confirm.body.many': 'Deploy these components to',
      'deploy.confirm.deploy': 'Deploy →',
      'deploy.confirm.cancel': 'Cancel',
      'deploy.success.title': '✓ Deploy successful',
      'deploy.success.title.partial': '⚠ Partial deploy',
      'deploy.success.sub': '{count} component(s) deployed to {host}.',
      'deploy.success.sub.partial': '{deployed}/{total} component(s) deployed to {host}. A few errors are listed below.',
      'deploy.success.open': '↗ Open my org',
      'deploy.success.close': 'Close',
      'showcase.toast.failed': '✗ Showcase unavailable',
      'showcase.toast.popupblocked': '⚠ Popup blocked — opening in this tab…',
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

  // ── Form submission helper — POST /api/feedback, returns Promise<ok>
  async function submitFeedbackForm(payload) {
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return r.ok;
    } catch (e) {
      return false;
    }
  }

  // ── Feedback modal — POSTs to /api/feedback (DB only, V1)
  function openFeedbackModal() {
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
      m.querySelector('#feedback-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        const submitBtn = f.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        const ok = await submitFeedbackForm({
          kind: 'feedback',
          subkind: f.kind.value,
          email: f.email.value.trim(),
          subject: t('feedback.subject.' + f.kind.value),
          message: f.message.value.trim(),
          page: window.location.pathname,
        });
        if (submitBtn) submitBtn.disabled = false;
        if (ok) {
          m.classList.remove('open');
          f.reset();
          toast(t('feedback.toast.sent'), 3500);
        } else {
          toast(t('feedback.toast.error'), 4000);
        }
      });
      applyLang();
    }
    m.classList.add('open');
    setTimeout(() => m.querySelector('input[name="email"]').focus(), 30);
  }

  // ── Submit-component modal — POSTs multipart to /api/submit-component
  function openSubmitComponentModal() {
    const MAX_BYTES = 5 * 1024 * 1024;
    const ALLOWED_EXT = /\.(zip|txt)$/i;
    let m = document.getElementById('submit-component-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'submit-component-modal';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal modal-wide">' +
        '<h3 data-i18n="submitc.title"></h3>' +
        '<p class="modal-sub" data-i18n="submitc.body"></p>' +
        '<div class="comingsoon-banner"><span class="cs-pill" data-i18n="submitc.coming.pill"></span><span class="cs-text" data-i18n="submitc.coming.text"></span></div>' +
        '<form id="submit-component-form" class="tracking-form" enctype="multipart/form-data">' +
        '<div class="form-row">' +
        '<label><span data-i18n="submitc.author"></span><input type="text" name="author" required></label>' +
        '<label><span data-i18n="submitc.email"></span><input type="email" name="email" required></label>' +
        '</div>' +
        '<label><span data-i18n="submitc.name"></span><input type="text" name="cname" data-i18n-placeholder="submitc.name.ph" required></label>' +
        '<label><span data-i18n="submitc.desc"></span><textarea name="desc" rows="2" data-i18n-placeholder="submitc.desc.ph" required></textarea></label>' +
        '<label><span data-i18n="submitc.usage"></span><textarea name="usage" rows="2" data-i18n-placeholder="submitc.usage.ph" required></textarea></label>' +
        '<label><span data-i18n="submitc.file"></span><input type="file" name="attachment" accept=".zip,.txt"><span class="form-hint" data-i18n="submitc.file.hint"></span></label>' +
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
      m.querySelector('#submit-component-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        const submitBtn = f.querySelector('button[type="submit"]');
        const file = f.attachment.files && f.attachment.files[0];
        // Client-side validation (server-side validates again, this is just UX)
        if (file) {
          if (file.size > MAX_BYTES) { toast(t('submitc.toast.toobig'), 4000); return; }
          if (!ALLOWED_EXT.test(file.name)) { toast(t('submitc.toast.badext'), 4000); return; }
        }
        if (submitBtn) submitBtn.disabled = true;
        const fd = new FormData();
        fd.append('authorName', f.author.value.trim());
        fd.append('authorEmail', f.email.value.trim());
        fd.append('componentName', f.cname.value.trim());
        fd.append('description', f.desc.value.trim());
        fd.append('useCase', f.usage.value.trim());
        fd.append('notes', f.notes.value.trim());
        if (file) fd.append('attachment', file, file.name);
        let ok = false;
        try {
          const r = await fetch('/api/submit-component', { method: 'POST', body: fd });
          ok = r.ok;
        } catch (err) {
          ok = false;
        }
        if (submitBtn) submitBtn.disabled = false;
        if (ok) {
          m.classList.remove('open');
          f.reset();
          toast(t('submitc.toast.sent'), 4000);
        } else {
          toast(t('submitc.toast.error'), 4500);
        }
      });
      applyLang();
    }
    m.classList.add('open');
    setTimeout(() => m.querySelector('input[name="author"]').focus(), 30);
  }

  // ── Contact modal — POSTs to /api/feedback (kind='contact')
  function openContactModal() {
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
      m.querySelector('#contact-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        const submitBtn = f.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        const ok = await submitFeedbackForm({
          kind: 'contact',
          email: f.email.value.trim(),
          subject: f.subject.value.trim() || 'LWC Library — Contact',
          message: f.message.value.trim(),
          page: window.location.pathname,
        });
        if (submitBtn) submitBtn.disabled = false;
        if (ok) {
          m.classList.remove('open');
          f.reset();
          toast(t('feedback.toast.sent'), 3500);
        } else {
          toast(t('feedback.toast.error'), 4000);
        }
      });
      applyLang();
    }
    m.classList.add('open');
    setTimeout(() => m.querySelector('input[name="email"]').focus(), 30);
  }

  // ── Showcase access request — same blurred-mask UX, prefills mailto on submit
  // (Showcase magic-link modal removed — superseded by the JWT 'Voir en live'
  // flow that drops the SE directly into LEX as the Showcase Visitor bot.)

  // ── OAuth state machine (sefr.auth.v1)
  // Stored in localStorage so the SE remains connected across browser sessions
  // (refresh_token grant covers token expiry transparently).
  // Shape: { accessToken, refreshToken, instanceUrl, loginHost, name, username, orgId, issuedAt }
  const auth = {
    get() {
      try { return JSON.parse(localStorage.getItem(STORAGE_AUTH) || 'null'); } catch { return null; }
    },
    set(v) {
      if (v) localStorage.setItem(STORAGE_AUTH, JSON.stringify(v));
      else localStorage.removeItem(STORAGE_AUTH);
      renderConnectButtons();
    },
    isConnected() { return !!(auth.get() && auth.get().accessToken); },
    instanceHost() { const a = auth.get(); if (!a) return ''; try { return new URL(a.instanceUrl).hostname; } catch { return ''; } },
    async fetch(url, opts) {
      // Wrapper: adds Authorization, refreshes once on 401.
      const a = auth.get();
      if (!a) throw new Error('not_connected');
      const doFetch = (token) => fetch(url, Object.assign({}, opts, {
        headers: Object.assign({}, (opts && opts.headers) || {}, {
          Authorization: 'Bearer ' + token,
          'X-SF-Instance-Url': a.instanceUrl,
        }),
      }));
      let r = await doFetch(a.accessToken);
      if (r.status !== 401 || !a.refreshToken) return r;
      // Try refresh
      const rr = await fetch('/api/oauth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: a.refreshToken, loginHost: a.loginHost }),
      });
      if (!rr.ok) { auth.set(null); throw new Error('refresh_failed'); }
      const fresh = await rr.json();
      const merged = Object.assign({}, a, { accessToken: fresh.accessToken, instanceUrl: fresh.instanceUrl || a.instanceUrl, issuedAt: fresh.issuedAt });
      auth.set(merged);
      return doFetch(merged.accessToken);
    },
  };

  function renderConnectButtons() {
    const a = auth.get();
    const buttons = document.querySelectorAll('[data-mock="connect"]');
    buttons.forEach(b => {
      if (a && a.accessToken) {
        const label = (a.name || a.username || '').split(' ')[0] || 'connecté';
        b.textContent = '✓ ' + label + ' · ' + auth.instanceHost();
        b.classList.add('is-connected');
      } else {
        b.textContent = t('connect.btn');
        b.classList.remove('is-connected');
      }
    });
  }

  // ── PKCE helpers (RFC 7636)
  function b64url(buf) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function makePkcePair() {
    const rand = new Uint8Array(48); crypto.getRandomValues(rand);
    const verifier = b64url(rand);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return { verifier, challenge: b64url(hash) };
  }

  // ── Connect modal — 2-screen flow
  // Screen 1 (default): Mon SDO/IDO (input direct) / Scratch / Sandbox or Prod (advanced ↘)
  // Screen 2 (advanced): Sandbox / Production / ← Back
  function openConnectChooser(onProceed) {
    let m = document.getElementById('connect-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'connect-modal';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal connect-modal">' +
        // Screen 1 — main
        '<div class="cm-screen cm-screen-main">' +
        '<h3 data-i18n="connect.choose.title"></h3>' +
        '<p class="modal-sub" data-i18n="connect.choose.sub"></p>' +
        '<div class="connect-choices">' +
        '<button type="button" class="connect-choice is-primary" data-host="login.salesforce.com" data-kind="login">' +
        '<span class="cc-icon">☁️</span><span class="cc-text"><span class="cc-label" data-i18n="connect.choose.login"></span><span class="cc-sub" data-i18n="connect.choose.login.sub"></span></span></button>' +
        '<button type="button" class="connect-choice" data-host="test.salesforce.com" data-kind="sandbox">' +
        '<span class="cc-icon">🧪</span><span class="cc-text"><span class="cc-label" data-i18n="connect.choose.sandbox"></span><span class="cc-sub" data-i18n="connect.choose.sandbox.sub"></span></span></button>' +
        '<button type="button" class="connect-choice connect-advanced-toggle">' +
        '<span class="cc-icon">⚙️</span><span class="cc-text"><span class="cc-label" data-i18n="connect.choose.advanced"></span><span class="cc-sub" data-i18n="connect.choose.advanced.sub"></span></span><span class="cc-chev">›</span></button>' +
        '</div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-connect-cancel data-i18n="connect.choose.cancel"></button></div>' +
        '</div>' +
        // Screen 2 (advanced) — custom My Domain
        '<div class="cm-screen cm-screen-advanced" hidden>' +
        '<h3 data-i18n="connect.choose.advanced"></h3>' +
        '<p class="modal-sub" data-i18n="connect.choose.sub"></p>' +
        '<div class="connect-choices">' +
        '<div class="connect-choice connect-custom is-primary"><span class="cc-icon">🛠️</span>' +
        '<span class="cc-text"><span class="cc-label" data-i18n="connect.choose.sdo"></span>' +
        '<input type="text" name="sdoDomain" data-i18n-placeholder="connect.choose.sdo.ph" autocomplete="off"></span>' +
        '<button type="button" class="btn btn-primary btn-sm" data-sdo-go data-i18n="connect.choose.continue"></button></div>' +
        '</div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-connect-back data-i18n="connect.choose.back"></button>' +
        '<button type="button" class="btn btn-ghost" data-connect-cancel data-i18n="connect.choose.cancel"></button></div>' +
        '</div>' +
        '</div>'
      );
      document.body.appendChild(m);

      const screenMain = m.querySelector('.cm-screen-main');
      const screenAdv = m.querySelector('.cm-screen-advanced');
      function showMain() { screenMain.hidden = false; screenAdv.hidden = true; }
      function showAdv() { screenMain.hidden = true; screenAdv.hidden = false; }

      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-connect-cancel]')) {
          m.classList.remove('open'); showMain();
        }
      });
      m.querySelector('.connect-advanced-toggle').addEventListener('click', () => {
        showAdv();
        setTimeout(() => {
          const inp = m.querySelector('input[name="sdoDomain"]');
          if (inp) inp.focus();
        }, 30);
      });
      m.querySelector('[data-connect-back]').addEventListener('click', showMain);

      // Direct host buttons (Scratch on screen 1, Sandbox/Prod on screen 2)
      m.querySelectorAll('.connect-choice[data-host]').forEach(b => {
        b.addEventListener('click', () => {
          m.classList.remove('open'); showMain();
          const cb = m.__sePending; m.__sePending = null;
          if (typeof cb === 'function') cb(b.dataset.host);
        });
      });

      // SDO/IDO direct domain
      const sdoInput = m.querySelector('input[name="sdoDomain"]');
      const goSdo = () => {
        const raw = (sdoInput.value || '').trim().toLowerCase();
        const host = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.(my\.salesforce\.com|force\.com)$/i.test(host)) {
          sdoInput.focus(); sdoInput.classList.add('err');
          setTimeout(() => sdoInput.classList.remove('err'), 800);
          return;
        }
        m.classList.remove('open'); showMain();
        const cb = m.__sePending; m.__sePending = null;
        if (typeof cb === 'function') cb(host);
      };
      m.querySelector('[data-sdo-go]').addEventListener('click', goSdo);
      sdoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); goSdo(); } });

      applyLang();
    }
    m.__sePending = onProceed;
    m.classList.add('open');
  }

  // ── Launch the OAuth popup flow against `loginHost`.
  async function startOAuth(loginHost, onDone) {
    const cfg = await (await fetch('/api/oauth/config')).json().catch(() => ({}));
    if (!cfg.clientId) {
      toast(t('connect.toast.notconfigured'), 4000);
      return;
    }
    const pkce = await makePkcePair();
    const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
    sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier: pkce.verifier, state, loginHost }));
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      scope: cfg.scopes,
      state,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
      prompt: 'login',
    });
    const url = 'https://' + loginHost + '/services/oauth2/authorize?' + params.toString();
    const popup = window.open(url, 'sefr-oauth', 'width=520,height=720,menubar=no,toolbar=no,location=yes');
    if (!popup) { toast(t('connect.popup.blocked'), 4000); return; }

    function handler(ev) {
      const data = ev && ev.data;
      if (!data || data.source !== 'sefr-oauth') return;
      window.removeEventListener('message', handler);
      try { popup.close(); } catch (e) {}
      if (data.error) { toast(t('connect.toast.failed') + ' — ' + data.error_description, 4000); return; }
      // Validate state
      const pending = JSON.parse(sessionStorage.getItem(PKCE_KEY) || 'null');
      sessionStorage.removeItem(PKCE_KEY);
      if (!pending || data.state !== pending.state) { toast(t('connect.toast.failed'), 4000); return; }
      // Exchange code for tokens via our backend
      fetch('/api/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: data.code, codeVerifier: pending.verifier, loginHost: pending.loginHost }),
      }).then(r => r.json().then(j => ({ ok: r.ok, j }))).then(async ({ ok, j }) => {
        if (!ok) { toast(t('connect.toast.failed') + ' — ' + (j.error || ''), 4000); return; }
        // Identity lookup for display
        let ident = {};
        try {
          const idResp = await fetch('/api/oauth/identity', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: j.accessToken, idUrl: j.id }),
          });
          if (idResp.ok) ident = await idResp.json();
        } catch (e) {}
        auth.set({
          accessToken: j.accessToken,
          refreshToken: j.refreshToken,
          instanceUrl: j.instanceUrl,
          loginHost: pending.loginHost,
          name: ident.name || '',
          username: ident.username || '',
          orgId: ident.organizationId || '',
          issuedAt: j.issuedAt,
        });
        let host = ''; try { host = new URL(j.instanceUrl).hostname; } catch (e) {}
        toast(t('connect.toast.connected') + ' ' + host, 3200);
        if (typeof onDone === 'function') onDone();
      }).catch(() => toast(t('connect.toast.failed'), 4000));
    }
    window.addEventListener('message', handler);
  }

  function disconnectOrg() {
    auth.set(null);
    toast(t('connect.toast.disconnected'), 2400);
  }

  // ── Connect button menu (when already connected)
  function openConnectMenu(anchor) {
    const a = auth.get(); if (!a) return;
    let menu = document.getElementById('connect-menu');
    if (menu) { menu.remove(); }
    menu = document.createElement('div');
    menu.id = 'connect-menu';
    menu.className = 'connect-menu';
    menu.innerHTML = (
      '<div class="connect-menu-head">' +
      '<div class="cmh-name">' + (a.name || a.username || '—') + '</div>' +
      '<div class="cmh-sub">' + auth.instanceHost() + '</div>' +
      '</div>' +
      '<button type="button" class="connect-menu-item" data-connect-disconnect data-i18n="connect.menu.disconnect"></button>'
    );
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect();
    menu.style.top = (r.bottom + window.scrollY + 6) + 'px';
    menu.style.right = (window.innerWidth - r.right) + 'px';
    applyLang();
    function close(ev) {
      if (ev && menu.contains(ev.target)) return;
      window.removeEventListener('click', close, true);
      menu.remove();
    }
    setTimeout(() => window.addEventListener('click', close, true), 10);
    menu.querySelector('[data-connect-disconnect]').addEventListener('click', () => {
      disconnectOrg();
      close();
    });
  }

  // Update connect button labels when the page loads (pre-existing localStorage state)
  setTimeout(renderConnectButtons, 0);

  // Featured override: if /admin has saved a custom featured list, swap the
  // default 4 cards for the configured ones (pulled from the hidden pool).
  // Default-rendered Python cards stay if the API is empty or unreachable.
  (function applyFeaturedOverride() {
    const grid = document.getElementById('featured-grid');
    const pool = document.getElementById('featured-pool');
    if (!grid || !pool) return;
    fetch('/api/site/featured').then(r => r.ok ? r.json() : null).then(data => {
      if (!data || !Array.isArray(data.apiNames) || !data.apiNames.length) return;
      // Build new card list by cloning from pool. Skip apiNames not in the pool.
      const newCards = [];
      data.apiNames.forEach(api => {
        const wrapper = pool.querySelector('[data-pool-card][data-api="' + api + '"]');
        if (!wrapper) return;
        const card = wrapper.firstElementChild;
        if (card) newCards.push(card.cloneNode(true));
      });
      if (!newCards.length) return;
      grid.textContent = '';
      newCards.forEach(c => grid.appendChild(c));
      // Re-apply i18n + counters on the freshly inserted nodes.
      if (typeof applyLang === 'function') applyLang();
      if (typeof applyAllCounts === 'function') applyAllCounts();
    }).catch(() => {});
  })();

  // Page-load visit tracking — fired once per pageview, fire-and-forget.
  setTimeout(() => {
    track('visit', {
      page: window.location.pathname || '/',
      referrer: document.referrer ? document.referrer.slice(0, 500) : null,
      lang: getLang(),
    });
  }, 50);

  // ── Resolve the list of components to deploy/download from the click target.
  function resolveTargetComponents(target) {
    // Priority: data-bundle-members (CSV), then data-component-api (single).
    const csv = (target.dataset.bundleMembers || '').trim();
    if (csv) return csv.split(',').map(s => s.trim()).filter(Boolean);
    const single = target.dataset.componentApi || target.dataset.api || '';
    return single ? [single] : [];
  }

  function bumpDownloadCounters(target) {
    const ids = [];
    const bundleId = target.dataset.bundleId;
    if (bundleId) ids.push('recipe-' + bundleId);
    const members = (target.dataset.bundleMembers || '').split(',').filter(Boolean);
    ids.push(...members);
    ids.forEach(id => bumpDownload(id));
  }

  // ── Real download: trigger a real <a download> click for each zip.
  function downloadComponents(target) {
    const list = resolveTargetComponents(target);
    if (!list.length) return;
    // Stagger via hidden iframes — more reliable than chained <a>.click() in Safari/Firefox.
    list.forEach((api, i) => {
      setTimeout(() => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = '/zips/' + api + '.zip';
        document.body.appendChild(iframe);
        // Clean up iframe after browser kicks the download
        setTimeout(() => iframe.remove(), 4000);
      }, i * 250);
    });
    if (list.length > 1) {
      toast(t('download.toast') + ' (' + list.length + ') — ' + t('download.multi.allow'), 5000);
    } else {
      toast(t('download.toast'));
    }
    bumpDownloadCounters(target);
    // Server-side tracking — one row per component, plus carry the recipe id
    // when the download originated from a cookbook bundle.
    const recipeId = target.dataset.bundleId || null;
    const sourcePage = window.location.pathname || '/';
    list.forEach(api => track('download', { apiName: api, recipeId, sourcePage }));
  }

  // ── Deploy success modal — persistent recap, doesn't auto-dismiss.
  // Shows host, deployed components, link to open the org. Optional `partial`
  // payload renders a warning section listing the failures.
  function openDeploySuccessModal(host, list, instanceUrl, partial) {
    let m = document.getElementById('deploy-success');
    if (!m) {
      m = document.createElement('div');
      m.id = 'deploy-success';
      m.className = 'modal-mask';
      // Build DOM via createElement to avoid innerHTML lint warnings
      const modal = document.createElement('div');
      modal.className = 'modal deploy-success-modal';
      const h = document.createElement('h3');
      h.dataset.role = 'title';
      modal.appendChild(h);
      const sub = document.createElement('p');
      sub.className = 'modal-sub';
      sub.dataset.role = 'sub';
      modal.appendChild(sub);
      const ulOk = document.createElement('ul');
      ulOk.className = 'ds-list ds-ok';
      ulOk.dataset.role = 'ok';
      modal.appendChild(ulOk);
      const ulKo = document.createElement('ul');
      ulKo.className = 'ds-list ds-ko';
      ulKo.dataset.role = 'ko';
      modal.appendChild(ulKo);
      const actions = document.createElement('div');
      actions.className = 'modal-actions';
      const btnOpen = document.createElement('a');
      btnOpen.className = 'btn btn-primary';
      btnOpen.target = '_blank';
      btnOpen.rel = 'noopener';
      btnOpen.dataset.role = 'open';
      btnOpen.dataset.i18n = 'deploy.success.open';
      actions.appendChild(btnOpen);
      const btnClose = document.createElement('button');
      btnClose.type = 'button';
      btnClose.className = 'btn btn-ghost';
      btnClose.dataset.dsClose = '1';
      btnClose.dataset.i18n = 'deploy.success.close';
      actions.appendChild(btnClose);
      modal.appendChild(actions);
      m.appendChild(modal);
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-ds-close]')) m.classList.remove('open');
      });
      applyLang();
    }
    const isPartial = partial && partial.partial;
    const title = isPartial ? t('deploy.success.title.partial') : t('deploy.success.title');
    m.querySelector('[data-role="title"]').textContent = title;
    let subText = '';
    if (isPartial) {
      subText = t('deploy.success.sub.partial')
        .replace('{deployed}', String(partial.deployed))
        .replace('{total}', String(partial.total))
        .replace('{host}', host);
    } else {
      subText = t('deploy.success.sub')
        .replace('{count}', String(list.length))
        .replace('{host}', host);
    }
    const sub = m.querySelector('[data-role="sub"]');
    sub.textContent = '';
    sub.appendChild(document.createTextNode(subText));
    // OK list (deployed components)
    const ulOk = m.querySelector('[data-role="ok"]');
    ulOk.textContent = '';
    list.forEach(api => {
      const li = document.createElement('li');
      const code = document.createElement('code');
      code.textContent = api;
      li.appendChild(code);
      ulOk.appendChild(li);
    });
    // KO list (failures, only on partial)
    const ulKo = m.querySelector('[data-role="ko"]');
    ulKo.textContent = '';
    if (isPartial && partial.failures && partial.failures.length) {
      partial.failures.forEach(f => {
        const li = document.createElement('li');
        const code = document.createElement('code');
        code.textContent = f.fullName || f.componentName || '?';
        li.appendChild(code);
        const span = document.createElement('span');
        span.textContent = ' — ' + (f.problem || f.problemType || '');
        li.appendChild(span);
        ulKo.appendChild(li);
      });
    }
    // Open button → instance home
    const btnOpen = m.querySelector('[data-role="open"]');
    const cleanInstance = (instanceUrl || '').replace(/\/+$/, '');
    btnOpen.href = cleanInstance + '/lightning/page/home';
    m.classList.add('open');
  }

  // ── Confirm-deploy modal — last chance to abort if the SE is signed in to the wrong org.
  function openConfirmDeploy(host, list, onConfirm) {
    let m = document.getElementById('deploy-confirm');
    if (!m) {
      m = document.createElement('div');
      m.id = 'deploy-confirm';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal deploy-confirm-modal">' +
        '<h3 data-i18n="deploy.confirm.title"></h3>' +
        '<p class="modal-sub"><span class="dc-prefix"></span> <strong class="dc-host"></strong></p>' +
        '<ul class="dc-list"></ul>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-dc-cancel data-i18n="deploy.confirm.cancel"></button>' +
        '<button type="button" class="btn btn-primary" data-dc-go data-i18n="deploy.confirm.deploy"></button>' +
        '</div></div>'
      );
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-dc-cancel]')) m.classList.remove('open');
      });
      m.querySelector('[data-dc-go]').addEventListener('click', () => {
        m.classList.remove('open');
        const cb = m.__sePending; m.__sePending = null;
        if (typeof cb === 'function') setTimeout(cb, 80);
      });
      applyLang();
    }
    m.querySelector('.dc-prefix').textContent = list.length === 1 ? t('deploy.confirm.body.one') : t('deploy.confirm.body.many');
    m.querySelector('.dc-host').textContent = host;
    const ul = m.querySelector('.dc-list');
    ul.innerHTML = list.map(api => '<li><code>' + api + '</code></li>').join('');
    m.__sePending = onConfirm;
    m.classList.add('open');
  }

  // ── Real deploy: posts components to /api/deploy then polls status.
  let deployInFlight = false;
  async function deployComponents(target) {
    if (deployInFlight) return;
    const list = resolveTargetComponents(target);
    if (!list.length) return;
    if (!auth.isConnected()) {
      // Prompt connect and resume once done.
      openConnectChooser((host) => startOAuth(host, () => deployComponents(target)));
      return;
    }
    // Last-chance confirmation showing the cible host.
    if (!target.dataset.deployConfirmed) {
      const a0 = auth.get();
      const host0 = auth.instanceHost();
      openConfirmDeploy(host0, list, () => {
        target.dataset.deployConfirmed = '1';
        try { deployComponents(target); }
        finally { delete target.dataset.deployConfirmed; }
      });
      return;
    }
    deployInFlight = true;
    const a = auth.get();
    const host = auth.instanceHost();
    const stickyMs = 60000;
    const stickyToast = openStickyToast(t('deploy.progress.preparing'));
    try {
      stickyToast.update(t('deploy.progress.uploading'));
      const r = await auth.fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: a.accessToken, instanceUrl: a.instanceUrl, components: list }),
      });
      const data = await r.json();
      if (!r.ok) {
        stickyToast.close();
        toast(t('deploy.toast.failed') + ' — ' + (data.message || data.error || r.status), 5000);
        return;
      }
      const id = data.deployRequestId;
      stickyToast.update(t('deploy.progress.deploying') + ' (1/' + list.length + ')');
      // Poll status every 2s, up to 120s.
      let tries = 0;
      const result = await new Promise((resolve) => {
        const itv = setInterval(async () => {
          tries++;
          let rr;
          try { rr = await auth.fetch('/api/deploy/status/' + id, { method: 'GET' }); } catch (e) { return; }
          let dd; try { dd = await rr.json(); } catch (e) { dd = {}; }
          if (dd && (dd.numberComponentsDeployed || dd.numberComponentsTotal)) {
            stickyToast.update(t('deploy.progress.deploying') + ' (' + (dd.numberComponentsDeployed || 0) + '/' + (dd.numberComponentsTotal || list.length) + ')');
          }
          if (dd && dd.done) { clearInterval(itv); resolve(dd); return; }
          if (tries > 60) { clearInterval(itv); resolve({ done: true, success: false, status: 'Timeout' }); }
        }, 2000);
      });
      stickyToast.close();
      // Server-side deploy tracking (success/partial/fail). Carries org metadata
      // for the admin dashboard (which SE deployed what to which org).
      // Also captures componentFailures from Salesforce so the admin can
      // diagnose failed deploys without digging into Heroku logs.
      const failures = (result.componentFailures || []).map(f => ({
        componentName: f.fullName || f.componentName || null,
        componentType: f.componentType || null,
        problem: f.problem || null,
        problemType: f.problemType || null,
        lineNumber: f.lineNumber || null,
        columnNumber: f.columnNumber || null,
      }));
      const deployTrack = {
        components: list,
        recipeId: target.dataset.bundleId || null,
        targetHost: host,
        sfOrgId: a.orgId || null,
        sfUserId: '', // not stored by auth state
        sfUsername: a.username || a.name || null,
        deployRequestId: data.deployRequestId || null,
        status: result.success ? 'success' : (result.numberComponentsDeployed > 0 ? 'partial' : 'failed'),
        numTotal: result.numberComponentsTotal || list.length,
        numSuccess: result.numberComponentsDeployed || 0,
        failures,
        sourcePage: window.location.pathname || '/',
      };
      track('deploy', deployTrack);
      if (result.success) {
        openDeploySuccessModal(host, list, a.instanceUrl);
        bumpDownloadCounters(target);
      } else if (result.numberComponentsDeployed > 0) {
        const failures = result.componentFailures || [];
        openDeploySuccessModal(host, list, a.instanceUrl, {
          partial: true,
          deployed: result.numberComponentsDeployed,
          total: result.numberComponentsTotal || list.length,
          failures
        });
      } else {
        const fail = (result.componentFailures && result.componentFailures[0]) || {};
        const msg = fail.problem || fail.fullName || result.status || '';
        toast(t('deploy.toast.failed') + (msg ? ' — ' + msg : ''), 8000);
      }
    } catch (err) {
      stickyToast.close();
      toast(t('deploy.toast.failed') + ' — ' + (err.message || err), 5000);
    } finally {
      deployInFlight = false;
    }
  }

  // Persistent toast (no auto-dismiss) for in-flight progress.
  function openStickyToast(initialMsg) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toast-host';
      document.body.appendChild(toastHost);
    }
    const el = document.createElement('div');
    el.className = 'toast toast-sticky';
    el.textContent = initialMsg;
    toastHost.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    return {
      update(msg) { el.textContent = msg; },
      close() { el.classList.remove('show'); setTimeout(() => el.remove(), 250); },
    };
  }

  // ── Showcase live — opens a frontdoor.jsp URL in a new tab (read-only bot user).
  // The URL is short-lived and minted by the backend on each click.
  let showcaseInFlight = false;
  function openShowcaseLive(target) {
    if (showcaseInFlight) return;
    showcaseInFlight = true;
    // Open the tab synchronously to keep the user-gesture context (avoids popup
    // blockers). We fill its location after the fetch resolves.
    const tab = window.open('about:blank', '_blank');
    if (tab) {
      try {
        tab.document.title = 'CCO FR Showcase — chargement…';
        tab.document.body.style.cssText = 'background:#0a0e2a;color:#e6e9ff;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0';
        const wrap = tab.document.createElement('div');
        wrap.style.textAlign = 'center';
        const icon = tab.document.createElement('div');
        icon.style.cssText = 'font-size:42px;margin-bottom:12px';
        icon.textContent = '🚀';
        const label = tab.document.createElement('div');
        label.textContent = 'Chargement de l’org showcase…';
        wrap.appendChild(icon); wrap.appendChild(label);
        tab.document.body.appendChild(wrap);
      } catch (e) { /* same-origin restrictions are fine to ignore */ }
    }
    fetch('/api/showcase/url').then(r => r.json().then(j => ({ ok: r.ok, j }))).then(({ ok, j }) => {
      showcaseInFlight = false;
      if (!ok || !j.url) {
        if (tab) { try { tab.close(); } catch (e) {} }
        const code = (j && j.error) || 'unknown';
        toast(t('showcase.toast.failed') + ' — ' + code, 5000);
        return;
      }
      if (tab) { tab.location = j.url; }
      else {
        // Popup got blocked — fall back to a plain navigation in the current tab.
        toast(t('showcase.toast.popupblocked'), 3500);
        setTimeout(() => { window.location.href = j.url; }, 800);
      }
    }).catch(() => {
      showcaseInFlight = false;
      if (tab) { try { tab.close(); } catch (e) {} }
      toast(t('showcase.toast.failed'), 5000);
    });
  }

  // ── Mock buttons handler (now real for connect/deploy/download)
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-mock]');
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    const kind = target.dataset.mock;

    if (kind === 'connect') {
      if (auth.isConnected()) { openConnectMenu(target); }
      else { openConnectChooser((host) => startOAuth(host)); }
      return;
    }
    if (kind === 'showcase') { openShowcaseLive(target); return; }
    if (kind === 'submit' || kind === 'submit-component') { openSubmitComponentModal(); return; }
    if (kind === 'feedback') { openFeedbackModal(); return; }
    if (kind === 'contact') { openContactModal(); return; }

    if (kind === 'download') {
      const go = () => downloadComponents(target);
      if (isTracked()) go(); else openTrackingModal(go);
      return;
    }
    if (kind === 'deploy' || kind === 'deploy-bundle' || kind === 'deploy-all') {
      const go = () => deployComponents(target);
      if (isTracked()) go(); else openTrackingModal(go);
      return;
    }
    // Default fallthrough — keep behaviour for any future data-mock kind
    bumpDownloadCounters(target);
  });

  // ── Language switcher
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang-btn]');
    if (!b) return;
    e.preventDefault();
    setLang(b.dataset.langBtn);
  });

  // (Old mocked agent widget code removed — replaced by Salesforce Embedded
  // Messaging for Web, injected via agent_html() in the page shell.)

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
      const csv = Array.from(selected).join(',');
      cart.dataset.selectedApis = csv;
      // Propagate the selected apiNames + count onto every action button so
      // resolveTargetComponents() / bumpDownloadCounters() see them.
      cart.querySelectorAll('[data-mock="deploy-bundle"], [data-mock="download"]').forEach(btn => {
        btn.dataset.count = selected.size;
        btn.dataset.bundleMembers = csv;
      });
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

  // ── Social counters — live from /api/track/counts (DB), with optimistic updates.
  // Local state mirrors what's on screen; updated on page load by GET /api/track/counts.
  const LIKES_KEY = 'se_fr_likes_v1';      // SET of locally-liked ids (for the heart UI)
  const liveCounts = {};                   // { id: { dl, lk } } — server truth + optimistic deltas
  function loadLikedSet() { try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || '[]')); } catch (_) { return new Set(); } }
  function saveLikedSet(s) { try { localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(s))); } catch (_) {} }
  function fmtCount(n) {
    n = Math.max(0, n|0);
    if (n >= 10000) return Math.floor(n / 1000) + 'k';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }
  function renderCount(id, what, value) {
    // Iterate then match — avoids needing CSS.escape on arbitrary id values.
    document.querySelectorAll('[data-stats-for]').forEach(el => {
      if (el.dataset.statsFor !== id) return;
      const sel = what === 'dl' ? '.dl-count' : '.lk-count';
      const target = el.querySelector(sel);
      if (target) target.textContent = fmtCount(value);
    });
  }
  function applyAllCounts() {
    document.querySelectorAll('[data-stats-for]').forEach(el => {
      const id = el.dataset.statsFor;
      const c = liveCounts[id] || {};
      const dl = el.querySelector('.dl-count');
      const lk = el.querySelector('.lk-count');
      if (dl) dl.textContent = fmtCount(c.dl || 0);
      if (lk) lk.textContent = fmtCount(c.lk || 0);
    });
    // Restore the heart state from local storage
    const likedSet = loadLikedSet();
    document.querySelectorAll('.like-btn').forEach(btn => {
      const id = btn.dataset.likeFor;
      if (!id) return;
      const isLiked = likedSet.has(id);
      btn.classList.toggle('liked', isLiked);
      btn.setAttribute('aria-pressed', isLiked ? 'true' : 'false');
      const ic = btn.querySelector('.icon');
      if (ic) ic.textContent = isLiked ? '♥' : '♡';
    });
  }
  // Hydrate counts from the server on page load
  fetch('/api/track/counts').then(r => r.ok ? r.json() : null).then(data => {
    if (!data) return;
    const comps = data.components || {};
    const recs = data.recipes || {};
    Object.keys(comps).forEach(id => { liveCounts[id] = { dl: comps[id].downloads || 0, lk: comps[id].likes || 0 }; });
    Object.keys(recs).forEach(id => {
      const k = 'recipe-' + id;
      liveCounts[k] = liveCounts[k] || { dl: 0, lk: 0 };
      liveCounts[k].dl = recs[id] || 0;
    });
    applyAllCounts();
  }).catch(() => {});
  // Optimistic download bump (called from downloadComponents + deployComponents)
  function bumpDownload(id) {
    if (!id) return;
    liveCounts[id] = liveCounts[id] || { dl: 0, lk: 0 };
    liveCounts[id].dl = (liveCounts[id].dl || 0) + 1;
    renderCount(id, 'dl', liveCounts[id].dl);
  }
  // Like toggle — POST /api/track/like, server returns the authoritative count
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.like-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const id = btn.dataset.likeFor;
    if (!id) return;
    const likedSet = loadLikedSet();
    const wasLiked = likedSet.has(id);
    const action = wasLiked ? 'unlike' : 'like';
    // Optimistic UI flip
    if (wasLiked) likedSet.delete(id); else likedSet.add(id);
    saveLikedSet(likedSet);
    btn.classList.toggle('liked', !wasLiked);
    btn.setAttribute('aria-pressed', !wasLiked ? 'true' : 'false');
    const ic = btn.querySelector('.icon');
    if (ic) ic.textContent = !wasLiked ? '♥' : '♡';
    if (!wasLiked) {
      btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
    }
    // Optimistic count
    liveCounts[id] = liveCounts[id] || { dl: 0, lk: 0 };
    liveCounts[id].lk = Math.max(0, (liveCounts[id].lk || 0) + (wasLiked ? -1 : 1));
    renderCount(id, 'lk', liveCounts[id].lk);
    // Server sync — only for component likes (recipes-* ids would 400 with the safeApiName regex)
    if (id.indexOf('recipe-') !== 0) {
      fetch('/api/track/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiName: id, fingerprint: getFingerprint(), action }),
      }).then(r => r.ok ? r.json() : null).then(j => {
        if (j && typeof j.count === 'number') {
          liveCounts[id].lk = j.count;
          renderCount(id, 'lk', j.count);
        }
      }).catch(() => {});
    }
  });
  applyAllCounts();

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
