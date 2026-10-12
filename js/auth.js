(function () {
  'use strict';

  // Explícito (em vez de confiar nos valores por omissão) para a sessão
  // ficar guardada no telemóvel e sobreviver a fechar a app por completo.
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  });

  function showOnly(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.dataset.screen === name));
  }

  function showError(elId, message) {
    const el = document.getElementById(elId);
    el.textContent = message;
    el.classList.remove('hidden');
  }
  function hideError(elId) {
    document.getElementById(elId).classList.add('hidden');
  }

  // ================== Login por link mágico OU código de 6 dígitos ==================
  // No iPhone, o link do email abre sempre no Safari (nunca diretamente na
  // app guardada no ecrã principal), e o Safari não partilha sempre a
  // sessão com essa app instalada. O código resolve isto: é confirmado sem
  // nunca sair da app.
  const loginForm = document.getElementById('login-form');
  const loginSent = document.getElementById('login-sent');
  const inputLoginEmail = document.getElementById('input-login-email');
  const inputOtpCode = document.getElementById('input-otp-code');
  let pendingLoginEmail = '';

  document.getElementById('btn-send-magic-link').addEventListener('click', async () => {
    const email = inputLoginEmail.value.trim();
    hideError('login-error');
    if (!email || !email.includes('@')) {
      showError('login-error', 'Escreve um email válido.');
      return;
    }
    const btn = document.getElementById('btn-send-magic-link');
    btn.disabled = true;
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    btn.disabled = false;
    if (error) {
      showError('login-error', 'Não foi possível enviar o código. Tenta outra vez.');
      return;
    }
    pendingLoginEmail = email;
    document.getElementById('login-sent-email').textContent = email;
    inputOtpCode.value = '';
    hideError('otp-error');
    loginForm.classList.add('hidden');
    loginSent.classList.remove('hidden');
    inputOtpCode.focus();
  });

  inputOtpCode.addEventListener('input', () => {
    inputOtpCode.value = inputOtpCode.value.replace(/\D/g, '').slice(0, 6);
  });

  document.getElementById('btn-confirm-otp').addEventListener('click', async () => {
    const token = inputOtpCode.value.trim();
    hideError('otp-error');
    if (token.length !== 6) {
      showError('otp-error', 'O código tem 6 números.');
      return;
    }
    const btn = document.getElementById('btn-confirm-otp');
    btn.disabled = true;
    const { error } = await sb.auth.verifyOtp({ email: pendingLoginEmail, token, type: 'email' });
    btn.disabled = false;
    if (error) {
      showError('otp-error', 'Código inválido ou expirado. Pede um novo.');
      return;
    }
    // Sucesso: o onAuthStateChange abaixo trata do resto sozinho.
  });

  document.getElementById('btn-login-try-again').addEventListener('click', () => {
    loginSent.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });

  // ================== Primeiro nome ==================
  document.getElementById('btn-save-first-name').addEventListener('click', async () => {
    const name = document.getElementById('input-first-name').value.trim();
    if (!name) return;
    const { data: { user } } = await sb.auth.getUser();
    await sb.from('profiles').update({ name }).eq('id', user.id);
    await checkGroup();
  });

  // ================== Grupo: criar ou entrar ==================
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I/L, para evitar confusões
  function generateCode() {
    let code = '';
    for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return code;
  }

  document.getElementById('btn-create-group').addEventListener('click', async () => {
    hideError('group-error');
    const { data: { user } } = await sb.auth.getUser();
    let created = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const code = generateCode();
      const { data, error } = await sb.from('groups').insert({ code }).select().single();
      if (!error) created = data;
      else if (error.code !== '23505') {
        showError('group-error', 'Não foi possível criar o grupo. Tenta outra vez.');
        return;
      }
    }
    if (!created) {
      showError('group-error', 'Não foi possível gerar um código único. Tenta outra vez.');
      return;
    }
    await sb.from('group_members').insert({ group_id: created.id, user_id: user.id });
    document.getElementById('group-choice').classList.add('hidden');
    document.getElementById('group-created').classList.remove('hidden');
    document.getElementById('created-group-code').textContent = created.code;
  });

  document.getElementById('btn-join-group').addEventListener('click', async () => {
    hideError('group-error');
    const code = document.getElementById('input-join-code').value.trim();
    if (code.length !== 6) {
      showError('group-error', 'O código tem 6 carateres.');
      return;
    }
    const { error } = await sb.rpc('join_group', { p_code: code });
    if (error) {
      showError('group-error', error.message.includes('inválido') ? 'Código inválido.' : error.message);
      return;
    }
    await finalizeGroupAndBoot();
  });

  document.getElementById('btn-group-continue').addEventListener('click', finalizeGroupAndBoot);

  // ================== Fluxo depois do login ==================
  async function checkGroup() {
    const { data: { user } } = await sb.auth.getUser();
    const { data: membership } = await sb
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      document.getElementById('group-choice').classList.remove('hidden');
      document.getElementById('group-created').classList.add('hidden');
      document.getElementById('input-join-code').value = '';
      hideError('group-error');
      showOnly('group');
      return;
    }
    await finalizeGroupAndBoot();
  }

  async function finalizeGroupAndBoot() {
    const { data: { user } } = await sb.auth.getUser();
    const { data: profile } = await sb.from('profiles').select('id, name').eq('id', user.id).single();

    const { data: membership } = await sb
      .from('group_members')
      .select('group_id, groups(code)')
      .eq('user_id', user.id)
      .single();

    const { data: allMembers } = await sb
      .from('group_members')
      .select('user_id, profiles(id, name)')
      .eq('group_id', membership.group_id);

    const partnerRow = allMembers.find((m) => m.user_id !== user.id);
    const partner = partnerRow ? partnerRow.profiles : null;
    const group = { id: membership.group_id, code: membership.groups.code };

    window.NDApp.boot({ sb, user, profile, partner, group });
  }

  async function afterLogin() {
    const { data: { user } } = await sb.auth.getUser();
    const { data: profile } = await sb.from('profiles').select('id, name').eq('id', user.id).single();

    if (!profile || !profile.name || profile.name === 'Sem nome') {
      showOnly('name');
      return;
    }
    await checkGroup();
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (session) {
      afterLogin();
    } else {
      showOnly('login');
    }
  });

  // Expõe o necessário para as Definições (sair do grupo / terminar sessão).
  window.AuthBridge = {
    client: sb,
    async signOut() {
      await sb.auth.signOut();
      window.location.reload();
    },
    async leaveGroup() {
      const { data: { user } } = await sb.auth.getUser();
      await sb.from('group_members').delete().eq('user_id', user.id);
      window.location.reload();
    },
  };
})();
