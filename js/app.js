(function () {
  'use strict';

  // ================== Preferências só do telemóvel ==================
  // Estas ficam mesmo locais (não fazem sentido partilhadas): o PIN do
  // Spicy, a preferência de Spicy nas notificações e o progresso visual.
  const LS = {
    pin: 'nd_pin',
    spicyAuto: 'nd_spicy_auto',
  };

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Preenchido por window.NDApp.boot() depois do login + grupo (ver js/auth.js).
  // { sb, user, profile, partner, group }
  let authCtx = null;

  // ================== Navegação entre ecrãs ==================
  const screens = Array.from(document.querySelectorAll('.screen'));
  let navStack = ['home'];

  // A barra de navegação é um único elemento partilhado por todos os ecrãs
  // (fora de qualquer .screen) — só assim o indicador consegue deslizar de
  // um separador para o outro em vez de simplesmente "saltar" para a
  // posição nova a cada troca de ecrã.
  const NAV_HIDDEN_SCREENS = new Set(['login', 'name', 'group', 'spicy-gate']);
  const navWrap = document.getElementById('nav-wrap');
  const navBar = document.getElementById('nav-bar');
  const navIndicator = document.getElementById('nav-indicator');
  const navButtons = Array.from(document.querySelectorAll('.nav-btn'));

  // A posição é medida ao vivo a partir do ícone de destino (em vez de
  // valores fixos em px), para funcionar em qualquer largura de ecrã —
  // cada iPhone tem uma largura de ecrã (em "pontos CSS") diferente.
  function updateNavIndicator(name) {
    navWrap.classList.toggle('hidden', NAV_HIDDEN_SCREENS.has(name));
    navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.nav === name));
    const target = navButtons.find((btn) => btn.dataset.nav === name);
    if (!target) {
      navIndicator.style.opacity = '0';
      return;
    }
    navIndicator.style.opacity = '1';
    const barRect = navBar.getBoundingClientRect();
    const btnRect = target.getBoundingClientRect();
    const left = btnRect.left - barRect.left + (btnRect.width - navIndicator.offsetWidth) / 2;
    navIndicator.style.left = left + 'px';
  }

  function showScreen(name) {
    screens.forEach((s) => s.classList.toggle('active', s.dataset.screen === name));
    updateNavIndicator(name);
  }
  function goTo(name) {
    navStack.push(name);
    showScreen(name);
  }
  function goBack() {
    if (navStack.length > 1) navStack.pop();
    showScreen(navStack[navStack.length - 1]);
  }
  function goHome() {
    navStack = ['home'];
    showScreen('home');
  }

  document.querySelectorAll('.btn-back').forEach((btn) => btn.addEventListener('click', goBack));

  function activeScreenName() {
    return navStack[navStack.length - 1];
  }

  // ================== Toast ==================
  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ================== Cabeçalho do casal ==================
  function getDisplayName() {
    return (authCtx && authCtx.profile && authCtx.profile.name) || 'Tu';
  }
  function getPartnerName() {
    return (authCtx && authCtx.partner && authCtx.partner.name) || '';
  }
  function getCoupleHeader() {
    const me = getDisplayName();
    const partner = getPartnerName();
    const names = [me, partner].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt'));
    return names.length ? names.join(' & ') : 'Nós Dois';
  }
  function renderCoupleHeader() {
    document.getElementById('couple-logo').textContent = getCoupleHeader();
    const partner = getPartnerName();
    document.getElementById('sheet-partner-name').textContent = partner || 'o/a teu/tua par';
  }

  // ================== Utilidades de categorias/itens ==================
  function findCategory(id) {
    return CATEGORIES.find((c) => c.id === id);
  }

  // Lista de categorias (incluindo "vales") usadas para acrescentar ideias nas Definições.
  const ADDABLE_CATEGORIES = CATEGORIES.map((c) => ({ id: c.id, nome: c.nome })).concat([
    { id: 'vales', nome: 'Vales' },
  ]);

  function baseItemsFor(catId) {
    if (catId === 'vales') return VALES_ITEMS;
    const cat = findCategory(catId);
    return cat ? cat.items : [];
  }

  // Cache simples das ideias acrescentadas pelo grupo (vem do Supabase).
  // Não há nenhum ecrã que as liste de volta — entram logo no sorteio e só
  // se revelam quando calharem, para manter a surpresa.
  let customItemsCache = {}; // { catId: [{ id, text, authorName }] }

  async function loadCustomItems() {
    const { data, error } = await authCtx.sb
      .from('custom_items')
      .select('id, category_id, text, profiles(name)')
      .eq('group_id', authCtx.group.id)
      .order('created_at', { ascending: true });
    if (error) return;
    customItemsCache = {};
    (data || []).forEach((row) => {
      if (!customItemsCache[row.category_id]) customItemsCache[row.category_id] = [];
      customItemsCache[row.category_id].push({
        id: row.id,
        text: row.text,
        authorName: (row.profiles && row.profiles.name) || null,
      });
    });
  }

  function getCustomItems(catId) {
    return customItemsCache[catId] || [];
  }

  function getCombinedItems(catId) {
    return baseItemsFor(catId).concat(getCustomItems(catId).map((c) => c.text));
  }

  // Devolve quem acrescentou o item num certo índice do array combinado, ou
  // null se for uma das ideias originais (sem autor).
  function authorForCombinedIndex(catId, index) {
    const baseLen = baseItemsFor(catId).length;
    if (index < baseLen) return null;
    const custom = getCustomItems(catId)[index - baseLen];
    return custom ? custom.authorName : null;
  }

  async function addCustomItem(catId, text) {
    await authCtx.sb.from('custom_items').insert({ group_id: authCtx.group.id, category_id: catId, text });
    await loadCustomItems();
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) +
      ' às ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  }

  // ================== Sorteio sem repetições (partilhado pelo grupo) ==================
  // Guarda, por categoria, uma ordem baralhada e a posição atual na tabela
  // draw_progress do Supabase. Mantemos uma cópia em memória para o sorteio
  // ser instantâneo; a escrita para o servidor acontece em segundo plano.
  const drawProgressCache = {}; // { catId: { order: [...], pos } }

  function shuffledOrder(length) {
    const arr = Array.from({ length }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async function loadDrawProgress(catId, length) {
    try {
      const { data, error } = await authCtx.sb
        .from('draw_progress')
        .select('order_json, pos')
        .eq('group_id', authCtx.group.id)
        .eq('category_id', catId)
        .maybeSingle();
      if (!error && data && Array.isArray(data.order_json) && data.order_json.length === length) {
        drawProgressCache[catId] = { order: data.order_json, pos: data.pos };
        return;
      }
    } catch (e) {
      // offline ou sem rede: cai para um baralho só desta sessão, mais abaixo
    }
    drawProgressCache[catId] = { order: shuffledOrder(length), pos: 0 };
    saveDrawProgress(catId);
  }

  function saveDrawProgress(catId) {
    const state = drawProgressCache[catId];
    if (!authCtx || !state) return;
    authCtx.sb
      .from('draw_progress')
      .upsert(
        { group_id: authCtx.group.id, category_id: catId, order_json: state.order, pos: state.pos, updated_at: new Date().toISOString() },
        { onConflict: 'group_id,category_id' }
      )
      .then(() => {}, () => {}); // falha silenciosa (sincroniza na próxima vez)
  }

  function drawNextIndex(catId, length) {
    let state = drawProgressCache[catId];
    if (!state || state.order.length !== length) {
      state = { order: shuffledOrder(length), pos: 0 };
    }
    if (state.pos >= state.order.length) {
      state = { order: shuffledOrder(length), pos: 0 };
    }
    const index = state.order[state.pos];
    state.pos += 1;
    drawProgressCache[catId] = state;
    saveDrawProgress(catId);
    return index;
  }

  async function resetAllProgress() {
    Object.keys(drawProgressCache).forEach((k) => delete drawProgressCache[k]);
    await authCtx.sb.from('draw_progress').delete().eq('group_id', authCtx.group.id);
  }

  // ================== Ecrã principal: grelha de categorias ==================
  const grid = document.getElementById('category-grid');

  const ARROW_SVG = '<svg class="icon-svg" viewBox="0 0 2434 1800"><path d="M1928.327,839.656l-78.018,-78.018c-23.55,-23.55 -23.55,-61.789 0,-85.339c23.55,-23.55 61.789,-23.55 85.339,0l223.701,223.701l-223.701,223.701c-23.55,23.55 -61.789,23.55 -85.339,0c-23.55,-23.55 -23.55,-61.789 -0,-85.339l78.018,-78.018l-1593.999,0c-33.305,0 -60.344,-27.039 -60.344,-60.344c-0,-33.305 27.039,-60.344 60.344,-60.344l1593.999,0Z"/></svg>';

  function renderGrid() {
    grid.innerHTML = '';
    CATEGORIES.forEach((cat) => {
      const card = document.createElement('button');
      card.className = 'category-card';
      card.style.background = cat.cor;
      card.innerHTML = `
        <div>
          <h3>${cat.nome}</h3>
          <p>${cat.frase}</p>
        </div>
        ${ARROW_SVG}
      `;
      card.addEventListener('click', () => openCategory(cat.id));
      grid.appendChild(card);
    });
  }

  // ---- Arrastar o carrossel com o rato (o dedo já funciona nativamente) ----
  let carouselDrag = null;
  let carouselWasDragged = false;
  grid.addEventListener('mousedown', (e) => {
    carouselDrag = { x: e.clientX, left: grid.scrollLeft };
    carouselWasDragged = false;
  });
  grid.addEventListener('mousemove', (e) => {
    if (!carouselDrag) return;
    const dx = e.clientX - carouselDrag.x;
    if (Math.abs(dx) > 4) carouselWasDragged = true;
    grid.scrollLeft = carouselDrag.left - dx;
  });
  ['mouseup', 'mouseleave'].forEach((ev) => grid.addEventListener(ev, () => { carouselDrag = null; }));
  grid.addEventListener(
    'click',
    (e) => {
      if (carouselWasDragged) {
        e.stopPropagation();
        e.preventDefault();
        carouselWasDragged = false;
      }
    },
    true
  );

  // ---- Cartões de estatística na home: próximo vale a expirar + ideia mais antiga por cumprir ----
  const statCardsEl = document.getElementById('stat-cards');

  async function renderHomeStats() {
    await Promise.all([loadHistory(), loadWallet()]);

    // historyCache vem ordenado do mais recente para o mais antigo.
    const pending = historyCache.filter((e) => !e.myRating);
    const oldestPending = pending.length ? pending[pending.length - 1] : null;

    const now = Date.now();
    const myActiveVouchers = walletCache.filter(
      (v) => v.assigned_to === authCtx.user.id && v.status === 'ativo' && v.has_time_limit && v.expires_at && new Date(v.expires_at).getTime() > now
    );
    myActiveVouchers.sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at));
    const nextVoucher = myActiveVouchers[0] || null;

    statCardsEl.innerHTML = '';

    const voucherCard = document.createElement('button');
    voucherCard.className = 'stat-card dark' + (nextVoucher ? '' : ' empty');
    voucherCard.innerHTML = nextVoucher
      ? `<h3>Próximo vale<br>a expirar&hellip;</h3><p>${nextVoucher.text}</p>`
      : `<p>Não tens nenhum vale</p>`;
    voucherCard.addEventListener('click', async () => {
      valesTab = 'mine';
      valesShowArchive = false;
      await renderWallet();
      goTo('vales');
    });
    statCardsEl.appendChild(voucherCard);

    const ideaCard = document.createElement('button');
    ideaCard.className = 'stat-card outline' + (oldestPending ? '' : ' empty');
    ideaCard.innerHTML = oldestPending
      ? `<h3>Há mais tempo<br>à espera&hellip;</h3><p>${oldestPending.text}</p>`
      : `<p>Não tens nada pendente. Está na hora de novo sorteio</p>`;
    ideaCard.addEventListener('click', async () => {
      historyShowArchive = false;
      await renderHistory();
      goTo('historico');
    });
    statCardsEl.appendChild(ideaCard);
  }

  // ================== Folhas de confirmação (overlay) genéricas ==================
  const sheetBackdrop = document.getElementById('sheet-backdrop');
  const allSheets = Array.from(document.querySelectorAll('.sheet'));

  function openSheet(id) {
    closeSheets();
    document.getElementById(id).classList.add('visible');
    sheetBackdrop.classList.add('visible');
  }
  function closeSheets() {
    allSheets.forEach((s) => s.classList.remove('visible'));
    sheetBackdrop.classList.remove('visible');
  }
  sheetBackdrop.addEventListener('click', closeSheets);

  // ================== Ecrã de categoria / sorteio ==================
  let currentCatId = null;
  let currentIndex = null;
  let currentItems = [];
  let pendingCatId = null; // usado para o gate do Spicy

  const categoryScreen = document.getElementById('screen-category');
  const categoryTitle = document.getElementById('category-title');
  const drawCard = document.getElementById('draw-card');
  const drawCardText = document.getElementById('draw-card-text');
  const drawCardAddedBy = document.getElementById('draw-card-added-by');
  const btnDraw = document.getElementById('btn-draw');
  const btnAgain = document.getElementById('btn-again');
  const btnChoose = document.getElementById('btn-choose');
  const btnFav = document.getElementById('btn-fav');

  function openCategory(catId) {
    const cat = findCategory(catId);
    if (cat.protegida) {
      pendingCatId = catId;
      openSpicyGate();
      return;
    }
    enterCategoryScreen(catId);
  }

  async function enterCategoryScreen(catId) {
    const cat = findCategory(catId);
    currentCatId = catId;
    currentIndex = null;
    await loadCustomItems();
    currentItems = getCombinedItems(catId);
    await loadDrawProgress(catId, currentItems.length);

    categoryTitle.textContent = cat.nome;
    categoryScreen.style.setProperty('--category-color', cat.cor);
    drawCardText.textContent = 'Toca para sortear';
    drawCard.classList.remove('shuffling', 'custom-added');
    drawCardAddedBy.classList.add('hidden');
    btnDraw.classList.remove('hidden');
    btnAgain.classList.add('hidden');
    btnChoose.classList.add('hidden');
    updateFavButton();

    goTo('category');
  }

  function doDraw() {
    currentItems = getCombinedItems(currentCatId);
    const index = drawNextIndex(currentCatId, currentItems.length);
    currentIndex = index;
    const author = authorForCombinedIndex(currentCatId, index);

    drawCard.classList.remove('shuffling');
    void drawCard.offsetWidth; // força reflow para repetir a animação em sorteios seguidos
    drawCard.classList.add('shuffling');

    if (navigator.vibrate) navigator.vibrate(15);

    setTimeout(() => {
      drawCardText.textContent = currentItems[index];
      drawCard.classList.toggle('custom-added', !!author);
      if (author) {
        drawCardAddedBy.textContent = `Adicionado por ${author}`;
        drawCardAddedBy.classList.remove('hidden');
      } else {
        drawCardAddedBy.classList.add('hidden');
      }
    }, 120);

    btnDraw.classList.add('hidden');
    btnAgain.classList.remove('hidden');
    btnChoose.classList.remove('hidden');
    updateFavButton();
  }

  btnDraw.addEventListener('click', doDraw);

  // "Dá-me outra" pede confirmação antes de sortear de novo.
  btnAgain.addEventListener('click', () => openSheet('sheet-confirm-again'));

  document.getElementById('btn-sheet-draw-again').addEventListener('click', () => {
    closeSheets();
    doDraw();
  });
  document.getElementById('btn-sheet-add-history').addEventListener('click', () => {
    chooseCurrentItem();
  });

  btnChoose.addEventListener('click', chooseCurrentItem);

  async function chooseCurrentItem() {
    const text = currentItems[currentIndex];
    await addToHistory(currentCatId, text);
    openSheet('sheet-added-history');
  }

  document.getElementById('btn-sheet-visit-history').addEventListener('click', async () => {
    closeSheets();
    historyShowArchive = false;
    await renderHistory();
    navStack = ['home'];
    goTo('historico');
  });

  document.getElementById('btn-sheet-share-partner').addEventListener('click', () => {
    const partner = getPartnerName();
    closeSheets();
    if (!partner) {
      toast('Ainda não têm os dois no grupo.');
      return;
    }
    // Na próxima fase (notificações push), isto acorda o telemóvel do parceiro.
    toast(`A notificar ${partner}... (fica ativo quando ligarmos as notificações push)`);
  });

  // ---- Favoritos (botão estrela no ecrã de sorteio) ----
  let favoritesCache = []; // [{ id, catId, text }]

  async function loadFavorites() {
    const { data, error } = await authCtx.sb
      .from('favorites')
      .select('id, category_id, text')
      .eq('group_id', authCtx.group.id)
      .order('created_at', { ascending: false });
    if (!error) favoritesCache = (data || []).map((r) => ({ id: r.id, catId: r.category_id, text: r.text }));
  }

  function findFavorite(catId, text) {
    return favoritesCache.find((f) => f.catId === catId && f.text === text);
  }

  function updateFavButton() {
    if (currentIndex === null) {
      btnFav.classList.remove('active');
      btnFav.textContent = '☆';
      return;
    }
    const text = currentItems[currentIndex];
    const fav = !!findFavorite(currentCatId, text);
    btnFav.textContent = fav ? '★' : '☆';
    btnFav.classList.toggle('active', fav);
  }

  btnFav.addEventListener('click', async () => {
    if (currentIndex === null) return;
    const text = currentItems[currentIndex];
    const existing = findFavorite(currentCatId, text);

    if (existing) {
      await authCtx.sb.from('favorites').delete().eq('id', existing.id);
      toast('Removido dos favoritos');
    } else {
      await authCtx.sb.from('favorites').insert({ group_id: authCtx.group.id, category_id: currentCatId, text });
      toast('Adicionado aos favoritos ⭐');
    }
    await loadFavorites();
    updateFavButton();
  });

  // ================== Spicy: confirmação + PIN ==================
  const spicyPinArea = document.getElementById('spicy-pin-area');
  const spicyPinInput = document.getElementById('spicy-pin-input');
  const spicyPinError = document.getElementById('spicy-pin-error');

  function openSpicyGate() {
    const pin = localStorage.getItem(LS.pin) || '';
    spicyPinArea.classList.toggle('hidden', !pin);
    spicyPinInput.value = '';
    spicyPinError.classList.add('hidden');
    goTo('spicy-gate');
  }

  document.getElementById('btn-spicy-cancel').addEventListener('click', () => {
    pendingCatId = null;
    goHome();
  });

  document.getElementById('btn-spicy-confirm').addEventListener('click', () => {
    const storedPin = localStorage.getItem(LS.pin) || '';
    if (storedPin) {
      if (spicyPinInput.value !== storedPin) {
        spicyPinError.classList.remove('hidden');
        return;
      }
    }
    const catId = pendingCatId;
    pendingCatId = null;
    navStack = ['home'];
    enterCategoryScreen(catId);
  });

  // ================== Histórico ==================
  let historyCache = []; // linhas vindas do Supabase, já com avaliações

  async function addToHistory(catId, text) {
    await authCtx.sb.from('history').insert({ group_id: authCtx.group.id, category_id: catId, text });
  }

  // Usamos a view "history_with_ratings": ela só revela a nota do/a
  // parceiro/a depois de teres dado a tua, para nenhum de vocês ser
  // influenciado pela resposta do outro.
  async function loadHistory() {
    const { data, error } = await authCtx.sb
      .from('history_with_ratings')
      .select('id, text, done, created_at, chosen_by_name, my_rating, partner_rating')
      .eq('group_id', authCtx.group.id)
      .order('created_at', { ascending: false });
    if (error) {
      historyCache = [];
      return;
    }
    historyCache = (data || []).map((row) => ({
      id: row.id,
      text: row.text,
      by: row.chosen_by_name || 'Alguém',
      date: row.created_at,
      done: row.done,
      myRating: row.my_rating,
      partnerRating: row.partner_rating,
    }));
  }

  // Ecrã principal do Histórico só mostra as ideias pendentes (ainda sem a
  // tua nota); as já avaliadas ficam no arquivo ("Ver cards anteriores").
  let historyShowArchive = false;

  function renderHistoryItem(entry) {
    const myBadge = entry.myRating ? `A tua nota: ${entry.myRating}★` : (entry.done ? 'Feito' : 'Pendente');
    const partnerName = getPartnerName() || 'o/a teu/tua par';
    const partnerLine = !entry.myRating
      ? ''
      : entry.partnerRating !== null
        ? ` · Nota de ${partnerName}: ${entry.partnerRating}★`
        : ` · A aguardar a nota de ${partnerName}`;
    const matched = entry.myRating && entry.partnerRating && entry.myRating === entry.partnerRating;

    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="list-item-top">
        <p class="list-item-text">${entry.text}</p>
        <span class="list-item-badge">${myBadge}</span>
      </div>
      ${matched ? '<span class="list-item-badge unlocked voucher-badge">🎁 Vale desbloqueado!</span>' : ''}
      <p class="list-item-meta">Escolhido por ${entry.by} · ${formatDate(entry.date)}${partnerLine}</p>
      ${entry.myRating ? '' : `<div class="list-item-actions"><button data-id="${entry.id}" class="btn-mark-done">Marcar como feito</button></div>`}
    `;
    return item;
  }

  async function renderHistory() {
    await loadHistory();
    const list = document.getElementById('historico-list');
    list.innerHTML = '';

    const toggleBtn = document.getElementById('btn-historico-archive-toggle');
    toggleBtn.textContent = historyShowArchive ? 'Ver pendentes' : 'Ver cards anteriores';

    const items = historyCache.filter((e) => (historyShowArchive ? !!e.myRating : !e.myRating));

    if (items.length === 0) {
      list.innerHTML = historyShowArchive
        ? '<p class="empty-state">Ainda não avaliaste nenhuma ideia.</p>'
        : '<p class="empty-state">Sem ideias pendentes. Vão a uma categoria e sorteiem!</p>';
    } else {
      items.forEach((entry) => list.appendChild(renderHistoryItem(entry)));
    }

    list.querySelectorAll('.btn-mark-done').forEach((btn) => {
      btn.addEventListener('click', () => openRatingSheet(btn.dataset.id));
    });
  }

  document.getElementById('btn-historico-archive-toggle').addEventListener('click', () => {
    historyShowArchive = !historyShowArchive;
    renderHistory();
  });

  document.getElementById('nav-historico').addEventListener('click', async () => {
    historyShowArchive = false;
    await renderHistory();
    goTo('historico');
  });

  // ---- Avaliação de 1 a 5 ao marcar como feito ----
  let ratingTargetId = null;
  let ratingSelected = 0;
  const ratingStars = Array.from(document.querySelectorAll('#rating-stars .star-btn'));

  function openRatingSheet(entryId) {
    ratingTargetId = entryId;
    ratingSelected = 0;
    paintStars();
    openSheet('sheet-rating');
  }

  function paintStars() {
    ratingStars.forEach((star) => {
      star.classList.toggle('filled', Number(star.dataset.value) <= ratingSelected);
    });
  }

  ratingStars.forEach((star) => {
    star.addEventListener('click', () => {
      ratingSelected = Number(star.dataset.value);
      paintStars();
    });
  });

  document.getElementById('btn-rating-cancel').addEventListener('click', closeSheets);

  document.getElementById('btn-rating-save').addEventListener('click', async () => {
    if (ratingSelected === 0) {
      toast('Escolhe uma nota de 1 a 5');
      return;
    }
    await authCtx.sb
      .from('history_ratings')
      .upsert(
        { history_id: ratingTargetId, user_id: authCtx.user.id, rating: ratingSelected },
        { onConflict: 'history_id,user_id' }
      );
    await authCtx.sb.from('history').update({ done: true }).eq('id', ratingTargetId);
    const unlocked = await checkAndGrantVoucherIfMatch(ratingTargetId);
    await renderHistory();
    // Se o vale acabou de ser desbloqueado, o pop-up já tratou de trocar a
    // folha (openSheet fecha as outras sozinho) — não fechar tudo aqui por cima.
    if (!unlocked) closeSheets();
  });

  // ---- Se as duas notas coincidirem, desbloqueia um vale para cada um ----
  // A atualização condicional ("vouchers_granted = false") garante que,
  // mesmo que os dois telemóveis tentem ao mesmo tempo, o vale só é criado
  // uma única vez. Devolve true se foi este telemóvel a desbloquear agora.
  async function checkAndGrantVoucherIfMatch(historyId) {
    const { data: ratings } = await authCtx.sb.from('history_ratings').select('user_id, rating').eq('history_id', historyId);
    if (!ratings || ratings.length !== 2 || ratings[0].rating !== ratings[1].rating) return false;

    const { data: claimed } = await authCtx.sb
      .from('history')
      .update({ vouchers_granted: true })
      .eq('id', historyId)
      .eq('vouchers_granted', false)
      .select();
    if (!claimed || claimed.length === 0) return false; // outro telemóvel já tratou disto

    await loadCustomItems();
    const pool = getCombinedItems('vales');
    const [textA, textB] = pickTwoDistinctTexts(pool);

    const vouchers = ratings.map((r, i) => {
      const text = i === 0 ? textA : textB;
      const hasLimit = text.toLowerCase().includes('durante 1 semana');
      return {
        group_id: authCtx.group.id,
        assigned_to: r.user_id,
        text,
        has_time_limit: hasLimit,
        expires_at: hasLimit ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      };
    });
    await authCtx.sb.from('vouchers').insert(vouchers);
    openSheet('sheet-voucher-unlocked');
    return true;
  }

  // Escolhe duas ideias de vale diferentes (nunca a mesma para os dois).
  function pickTwoDistinctTexts(pool) {
    if (pool.length < 2) return [pool[0], pool[0]];
    const i1 = Math.floor(Math.random() * pool.length);
    let i2 = Math.floor(Math.random() * (pool.length - 1));
    if (i2 >= i1) i2 += 1;
    return [pool[i1], pool[i2]];
  }

  document.getElementById('btn-voucher-view-all').addEventListener('click', async () => {
    closeSheets();
    navStack = ['home'];
    valesTab = 'mine';
    valesShowArchive = false;
    await renderWallet();
    goTo('vales');
  });

  // ================== Vales (carteira do grupo) ==================
  // A atribuição automática e aleatória dos vales ao acaso (fora dos
  // desbloqueados por avaliações coincidentes) é função das notificações
  // push (próxima fase).
  //
  // Quem RECEBE o vale (assigned_to) é quem aprova; quem CUMPRE o favor
  // (o/a outro/a) é quem marca como usado — por isso pedimos ao Supabase
  // o nome de quem recebeu e, separadamente, o nome de quem usou.
  let walletCache = [];
  let valesTab = 'mine'; // 'mine' | 'partner'
  let valesShowArchive = false;

  function walletStatusLabel(v, isMine) {
    if (v.status === 'usado') return 'Usado';
    if (v.status === 'a_aguardar') {
      return isMine ? 'A aguardar a tua aprovação' : `A aguardar aprovação de ${getPartnerName() || 'o/a teu/tua par'}`;
    }
    if (v.status === 'expirado') return 'Expirado';
    if (v.has_time_limit && v.expires_at) {
      const remaining = new Date(v.expires_at).getTime() - Date.now();
      if (remaining <= 0) return 'Expirado';
      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      return `Expira em ${days}d ${hours}h`;
    }
    return 'Ativo';
  }

  async function loadWallet() {
    const { data, error } = await authCtx.sb
      .from('vouchers')
      .select(
        'id, text, status, has_time_limit, expires_at, used_at, created_at, assigned_to, used_by,' +
        'assigned_profile:profiles!vouchers_assigned_to_fkey(name), used_profile:profiles!vouchers_used_by_fkey(name)'
      )
      .eq('group_id', authCtx.group.id)
      .order('created_at', { ascending: false });
    walletCache = error ? [] : data || [];
  }

  // Vales com prazo que já passou o tempo: move para "Expirado" sozinho.
  async function sweepExpiredVouchers() {
    const now = Date.now();
    const toExpire = walletCache.filter(
      (v) => (v.status === 'ativo' || v.status === 'a_aguardar') && v.has_time_limit && v.expires_at && new Date(v.expires_at).getTime() <= now
    );
    if (toExpire.length === 0) return;
    await authCtx.sb.from('vouchers').update({ status: 'expirado' }).in('id', toExpire.map((v) => v.id));
    toExpire.forEach((v) => { v.status = 'expirado'; });
  }

  function renderValesMemberTabs() {
    const container = document.getElementById('vales-member-tabs');
    if (valesShowArchive) {
      container.innerHTML = '';
      return;
    }
    const partnerName = getPartnerName() || 'o/a teu/tua par';
    container.innerHTML = `
      <button class="tab-btn ${valesTab === 'mine' ? 'active' : ''}" data-tab="mine">Os teus vales</button>
      <button class="tab-btn ${valesTab === 'partner' ? 'active' : ''}" data-tab="partner">Vales de ${partnerName}</button>
    `;
    container.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        valesTab = btn.dataset.tab;
        renderWallet();
      });
    });
  }

  async function renderWallet() {
    await loadWallet();
    await sweepExpiredVouchers();

    const toggleBtn = document.getElementById('btn-vales-archive-toggle');
    toggleBtn.textContent = valesShowArchive ? 'Voltar aos vales ativos' : 'Ver vales antigos';
    renderValesMemberTabs();

    const list = document.getElementById('vales-list');
    list.innerHTML = '';

    let items;
    if (valesShowArchive) {
      items = walletCache.filter((v) => v.status === 'usado' || v.status === 'expirado');
    } else {
      const targetId = valesTab === 'mine' ? authCtx.user.id : (authCtx.partner && authCtx.partner.id);
      items = walletCache.filter((v) => v.assigned_to === targetId && (v.status === 'ativo' || v.status === 'a_aguardar'));
    }

    if (items.length === 0) {
      list.innerHTML = valesShowArchive
        ? '<p class="empty-state">Ainda sem vales usados ou expirados.</p>'
        : '<p class="empty-state">Sem vales aqui. Eles aparecem quando a app os atribuir, ou quando as vossas avaliações de uma ideia coincidirem.</p>';
      return;
    }

    items.forEach((v) => {
      const item = document.createElement('div');
      item.className = 'list-item';
      const isMine = v.assigned_to === authCtx.user.id;
      const assignedName = (v.assigned_profile && v.assigned_profile.name) || 'Alguém';
      const usedByName = (v.used_profile && v.used_profile.name) || '';

      let actions = '';
      if (v.status === 'ativo' && !isMine) {
        actions = `<button data-id="${v.id}" class="btn-use-voucher">Marcar como usado</button>`;
      } else if (v.status === 'a_aguardar' && isMine) {
        actions = `
          <button data-id="${v.id}" class="btn-approve-voucher">Aprovar</button>
          <button data-id="${v.id}" class="btn-reject-voucher">Recusar</button>
        `;
      }

      const usedMeta = v.status === 'usado' && usedByName ? ` · usado por ${usedByName} em ${formatDate(v.used_at)}` : '';

      item.innerHTML = `
        <div class="list-item-top">
          <p class="list-item-text">${v.text}</p>
          <span class="list-item-badge">${walletStatusLabel(v, isMine)}</span>
        </div>
        <p class="list-item-meta">Atribuído a ${assignedName} · ${formatDate(v.created_at)}${usedMeta}</p>
        ${actions ? `<div class="list-item-actions">${actions}</div>` : ''}
      `;
      list.appendChild(item);
    });

    list.querySelectorAll('.btn-use-voucher').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await authCtx.sb
          .from('vouchers')
          .update({ status: 'a_aguardar', used_requested_at: new Date().toISOString(), used_by: authCtx.user.id })
          .eq('id', btn.dataset.id);
        await renderWallet();
        toast('Pedido enviado — a aguardar aprovação');
      });
    });

    list.querySelectorAll('.btn-approve-voucher').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await authCtx.sb.from('vouchers').update({ status: 'usado', used_at: new Date().toISOString() }).eq('id', btn.dataset.id);
        await renderWallet();
        toast('Vale aprovado ✓');
      });
    });

    list.querySelectorAll('.btn-reject-voucher').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await authCtx.sb.from('vouchers').update({ status: 'ativo', used_requested_at: null, used_by: null }).eq('id', btn.dataset.id);
        await renderWallet();
        toast('Pedido recusado');
      });
    });
  }

  document.getElementById('btn-vales-archive-toggle').addEventListener('click', () => {
    valesShowArchive = !valesShowArchive;
    renderWallet();
  });

  document.getElementById('nav-vales').addEventListener('click', async () => {
    valesTab = 'mine';
    valesShowArchive = false;
    await renderWallet();
    goTo('vales');
  });

  // ================== Favoritos ==================
  async function renderFavorites() {
    await loadFavorites();
    const list = document.getElementById('favoritos-list');
    list.innerHTML = '';

    if (favoritesCache.length === 0) {
      list.innerHTML = '<p class="empty-state">Ainda sem favoritos. Toca na estrela ⭐ quando sortearem algo que adorem.</p>';
      return;
    }

    favoritesCache.forEach((f) => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <div class="list-item-top">
          <p class="list-item-text">${f.text}</p>
        </div>
        <div class="list-item-actions">
          <button data-id="${f.id}" class="btn-remove-fav">Remover</button>
        </div>
      `;
      list.appendChild(item);
    });

    list.querySelectorAll('.btn-remove-fav').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await authCtx.sb.from('favorites').delete().eq('id', btn.dataset.id);
        await renderFavorites();
      });
    });
  }

  document.getElementById('nav-favoritos').addEventListener('click', async () => {
    await renderFavorites();
    goTo('favoritos');
  });

  // ================== Definições ==================
  const inputName = document.getElementById('input-name');
  const inputPin = document.getElementById('input-pin');
  const toggleSpicyAuto = document.getElementById('toggle-spicy-auto');
  const selectAddCategory = document.getElementById('select-add-category');
  const inputAddText = document.getElementById('input-add-text');

  async function loadSettings() {
    inputName.value = getDisplayName();
    inputPin.value = localStorage.getItem(LS.pin) || '';
    toggleSpicyAuto.checked = readJSON(LS.spicyAuto, false);
    renderGroupStatus();
  }

  function renderGroupStatus() {
    const el = document.getElementById('group-status');
    const partner = getPartnerName();
    const code = authCtx && authCtx.group ? authCtx.group.code : '';
    el.textContent = partner
      ? `Código: ${code} · Também no grupo: ${partner}`
      : `Código: ${code} · À espera que o/a teu/tua par entre com este código.`;
  }

  inputName.addEventListener('change', async () => {
    const name = inputName.value.trim();
    if (!name) return;
    authCtx.profile.name = name;
    await authCtx.sb.from('profiles').update({ name }).eq('id', authCtx.user.id);
    renderCoupleHeader();
    toast('Nome guardado');
  });

  document.getElementById('btn-leave-group').addEventListener('click', () => {
    if (confirm('Sair do grupo? Deixas de ver o histórico e os vales partilhados com o/a teu/tua par.')) {
      window.AuthBridge.leaveGroup();
    }
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('Terminar sessão?')) {
      window.AuthBridge.signOut();
    }
  });

  inputPin.addEventListener('input', () => {
    inputPin.value = inputPin.value.replace(/\D/g, '').slice(0, 4);
  });
  inputPin.addEventListener('change', () => {
    const v = inputPin.value;
    if (v && v.length !== 4) {
      toast('O PIN deve ter 4 dígitos');
      inputPin.value = localStorage.getItem(LS.pin) || '';
      return;
    }
    localStorage.setItem(LS.pin, v);
    toast(v ? 'PIN definido' : 'PIN removido');
  });

  toggleSpicyAuto.addEventListener('change', () => {
    writeJSON(LS.spicyAuto, toggleSpicyAuto.checked);
    toast('Preferência guardada. Vai ser usada quando ligarmos as notificações semanais.');
  });

  document.getElementById('btn-reset-progress').addEventListener('click', async () => {
    await resetAllProgress();
    toast('Progresso dos sorteios reposto');
  });

  // ---- Zona perigosa: apagar todo o histórico do grupo (dupla confirmação) ----
  document.getElementById('btn-wipe-group-data').addEventListener('click', async () => {
    const step1 = confirm(
      'Isto apaga definitivamente o Histórico, os Vales e os Favoritos de todo o grupo — de ambos. Não pode ser desfeito. Continuar?'
    );
    if (!step1) return;

    const step2 = confirm('Tens mesmo a certeza? Esta é a última confirmação — depois disto não há volta atrás.');
    if (!step2) return;

    const gid = authCtx.group.id;
    await authCtx.sb.from('history').delete().eq('group_id', gid); // apaga também as avaliações, em cascata
    await authCtx.sb.from('favorites').delete().eq('group_id', gid);
    await authCtx.sb.from('vouchers').delete().eq('group_id', gid);
    await authCtx.sb.from('custom_items').delete().eq('group_id', gid);
    await authCtx.sb.from('draw_progress').delete().eq('group_id', gid);
    customItemsCache = {};
    Object.keys(drawProgressCache).forEach((k) => delete drawProgressCache[k]);

    toast('Histórico do grupo apagado');
  });

  // ---- Acrescentar ideias às categorias (partilhado pelo grupo) ----
  const ADD_CATEGORY_COLORS = { vales: '#1A1A1A' };
  CATEGORIES.forEach((c) => { ADD_CATEGORY_COLORS[c.id] = c.cor; });
  function addCategoryTextColor(id) {
    return id === 'vales' ? '#FBF8EF' : '#1A1A1A';
  }

  const pickCategoryBtn = document.getElementById('btn-pick-category');
  const pickCategoryLabel = document.getElementById('category-picker-label');

  function setAddCategory(id) {
    selectAddCategory.value = id;
    const cat = ADDABLE_CATEGORIES.find((c) => c.id === id) || ADDABLE_CATEGORIES[0];
    pickCategoryLabel.textContent = cat.nome.toLowerCase();
    pickCategoryBtn.style.background = ADD_CATEGORY_COLORS[cat.id] || '#A6CBFF';
    pickCategoryBtn.style.color = addCategoryTextColor(cat.id);
  }

  function populateCategoryPicker() {
    const container = document.getElementById('category-picker-options');
    container.innerHTML = ADDABLE_CATEGORIES.map(
      (c) => `<button type="button" class="category-picker-option" data-id="${c.id}" style="background:${ADD_CATEGORY_COLORS[c.id] || '#A6CBFF'}; color:${addCategoryTextColor(c.id)};">${c.nome.toLowerCase()}</button>`
    ).join('');
    container.querySelectorAll('.category-picker-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        setAddCategory(btn.dataset.id);
        closeSheets();
      });
    });
  }

  pickCategoryBtn.addEventListener('click', () => openSheet('sheet-pick-category'));

  function populateCategorySelect() {
    selectAddCategory.innerHTML = ADDABLE_CATEGORIES.map(
      (c) => `<option value="${c.id}">${c.nome}</option>`
    ).join('');
    populateCategoryPicker();
    setAddCategory(ADDABLE_CATEGORIES[0].id);
  }

  document.getElementById('btn-add-idea').addEventListener('click', async () => {
    const catId = selectAddCategory.value;
    const text = inputAddText.value.trim();
    if (!text) {
      toast('Escreve a ideia primeiro');
      return;
    }
    await addCustomItem(catId, text);
    inputAddText.value = '';
    toast('Ideia adicionada ao sorteio — vai surpreender quando calhar ✓');
  });

  document.getElementById('nav-definicoes').addEventListener('click', async () => {
    await loadSettings();
    goTo('settings');
  });

  document.getElementById('nav-home').addEventListener('click', async () => {
    await renderHomeStats();
    goHome();
  });

  // ================== Tempo real: atualiza quando o/a par faz algo ==================
  function subscribeRealtime() {
    const gid = authCtx.group.id;
    authCtx.sb
      .channel('group-' + gid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'history', filter: `group_id=eq.${gid}` }, () => {
        if (activeScreenName() === 'historico') renderHistory();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'history_ratings' }, (payload) => {
        const historyId = (payload.new && payload.new.history_id) || (payload.old && payload.old.history_id);
        if (historyId) checkAndGrantVoucherIfMatch(historyId);
        if (activeScreenName() === 'historico') renderHistory();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites', filter: `group_id=eq.${gid}` }, () => {
        if (activeScreenName() === 'favoritos') renderFavorites();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vouchers', filter: `group_id=eq.${gid}` }, () => {
        if (activeScreenName() === 'vales') renderWallet();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_items', filter: `group_id=eq.${gid}` }, () => {
        customItemsCache = {}; // força a recarregar na próxima vez que entrarem numa categoria
      })
      .subscribe();
  }

  // ================== Arranque ==================
  // Chamado pelo js/auth.js assim que a pessoa está autenticada e já tem
  // grupo (criado ou juntou-se a um). Só a partir daqui a app principal
  // fica visível.
  //
  // O Supabase renova a sessão sozinho de vez em quando, o que faz disparar
  // este mesmo evento outra vez (sem ser um novo login a sério). Sem este
  // "já arrancou", isso reiniciava a app e atirava a pessoa de volta ao
  // ecrã principal a meio do que estava a fazer.
  let booted = false;

  async function boot(ctx) {
    authCtx = ctx;
    if (booted) {
      renderCoupleHeader(); // o nome/parceiro pode ter mudado entretanto
      return;
    }
    booted = true;
    navStack = ['home'];
    populateCategorySelect();
    renderCoupleHeader();
    renderGrid();
    await loadFavorites();
    await renderHomeStats();
    subscribeRealtime();
    showScreen('home');

    // "standalone" é true quando a app foi aberta pelo ícone no ecrã
    // principal; false quando é o Safari normal (ex: depois de clicar no
    // link do email, que o iOS abre sempre no browser).
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    document.getElementById('browser-banner').classList.toggle('hidden', isStandalone);
  }

  window.NDApp = { boot };

  // ================== Service worker (PWA) ==================
  // Sem isto, uma atualização só aparece na abertura A SEGUIR à abertura em
  // que o telemóvel a detetou (o novo service worker instala-se em segundo
  // plano, mas só passa a controlar a página numa próxima navegação). Para
  // a pessoa não ter de fechar e abrir a app duas vezes, forçamos a
  // verificação assim que abre, e recarregamos sozinhos mal a nova versão
  // assuma o controlo.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').then((reg) => {
        reg.update();
      }).catch(() => {
        // falha silenciosa: a app continua a funcionar sem cache offline
      });
    });

    let reloadedForNewVersion = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadedForNewVersion) return;
      reloadedForNewVersion = true;
      window.location.reload();
    });
  }
})();
