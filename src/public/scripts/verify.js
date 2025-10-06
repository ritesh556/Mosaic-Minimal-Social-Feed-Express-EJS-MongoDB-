// ===== OTP inputs behavior =====
(function () {
  const wrapper = document.getElementById('otp-wrapper');
  if (!wrapper) return; // page not loaded or wrong id

  const inputs = Array.from(wrapper.querySelectorAll('input[data-otp-index]'));
  const hidden = document.getElementById('code-hidden');
  const form = document.getElementById('verify-form');

  function syncHidden() {
    if (!hidden) return;
    hidden.value = inputs.map(i => (i.value || '').trim()).join('');
  }

  // Focus first box on load
  window.addEventListener('DOMContentLoaded', () => inputs[0] && inputs[0].focus());

  inputs.forEach((el, idx) => {
    el.addEventListener('input', (e) => {
      const v = e.target.value.replace(/\D/g, '');
      e.target.value = v.slice(-1);

      if (e.target.value && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
        inputs[idx + 1].select && inputs[idx + 1].select();
      }
      syncHidden();
    });

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !el.value && idx > 0) {
        inputs[idx - 1].focus();
        inputs[idx - 1].value = '';
        syncHidden();
      }
      if (e.key === 'ArrowLeft' && idx > 0) inputs[idx - 1].focus();
      if (e.key === 'ArrowRight' && idx < inputs.length - 1) inputs[idx + 1].focus();
    });

    el.addEventListener('paste', (e) => {
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (!text) return;
      const digits = text.replace(/\D/g, '').slice(0, inputs.length).split('');
      if (!digits.length) return;
      e.preventDefault();
      inputs.forEach((inp, i) => (inp.value = digits[i] || ''));
      syncHidden();
      const next = Math.min(digits.length, inputs.length) - 1;
      inputs[Math.max(0, next)].focus();
    });
  });

  form && form.addEventListener('submit', (e) => {
    syncHidden();
    if (!/^\d{6}$/.test(hidden.value)) {
      e.preventDefault();
      const firstEmpty = inputs.find(i => !i.value);
      if (firstEmpty) firstEmpty.focus();
    }
  });

  // ===== 30s client-side cooldown for resend =====
  const resendBtn   = document.getElementById('resend-btn');
  const resendForm  = document.getElementById('resend-form');
  const resendEta   = document.getElementById('resend-eta');
  const resendCount = document.getElementById('resend-count');

  let cooldown = 30;
  function tickCooldown() {
    if (resendBtn) resendBtn.disabled = cooldown > 0;
    if (resendEta) resendEta.classList.toggle('hidden', cooldown <= 0);
    if (cooldown > 0) {
      if (resendCount) resendCount.textContent = String(cooldown);
      cooldown--;
      setTimeout(tickCooldown, 1000);
    }
  }
  tickCooldown();

  resendForm && resendForm.addEventListener('submit', () => {
    cooldown = 30;
    tickCooldown();
  });

  // ===== Optional: show 10-minute expiry countdown =====
  const expiryEta = document.getElementById('expiry-eta');
  let remain = 10 * 60; // seconds
  function tickExpiry() {
    if (!expiryEta) return;
    const m = String(Math.floor(remain / 60)).padStart(2, '0');
    const s = String(remain % 60).padStart(2, '0');
    expiryEta.textContent = `${m}:${s}`;
    if (remain > 0) {
      remain--;
      setTimeout(tickExpiry, 1000);
    } else {
      inputs.forEach(i => (i.disabled = true));
    }
  }
  tickExpiry();
})();
