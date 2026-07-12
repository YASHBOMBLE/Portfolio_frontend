/* =====================================================
   CONFIG
   Change this to your deployed backend URL when you go live,
   e.g. "https://api.yourdomain.com/api" or your Render/Railway URL.
===================================================== */
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'http://localhost:5000/api';

/* =====================================================
   CONTACT FORM
===================================================== */
(function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('submitBtn');
  const statusEl = document.getElementById('formStatus');

  const fields = {
    name: form.querySelector('#name'),
    email: form.querySelector('#email'),
    subject: form.querySelector('#subject'),
    message: form.querySelector('#message'),
  };

  function setFieldError(fieldName, message) {
    const row = form.querySelector(`#${fieldName}`).closest('.form-row');
    const errorEl = form.querySelector(`.form-error[data-for="${fieldName}"]`);
    if (message) {
      row.classList.add('has-error');
      errorEl.textContent = message;
    } else {
      row.classList.remove('has-error');
      errorEl.textContent = '';
    }
  }

  function clearErrors() {
    Object.keys(fields).forEach((key) => setFieldError(key, ''));
  }

  function validate() {
    clearErrors();
    let valid = true;

    if (!fields.name.value.trim()) {
      setFieldError('name', 'Please enter your name.');
      valid = false;
    }

    const emailVal = fields.email.value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal) {
      setFieldError('email', 'Please enter your email.');
      valid = false;
    } else if (!emailPattern.test(emailVal)) {
      setFieldError('email', 'Please enter a valid email address.');
      valid = false;
    }

    if (!fields.message.value.trim()) {
      setFieldError('message', 'Please enter a message.');
      valid = false;
    }

    return valid;
  }

  function setLoading(isLoading) {
    submitBtn.classList.toggle('is-loading', isLoading);
    submitBtn.disabled = isLoading;
  }

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `form-status ${type}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showStatus('', '');

    if (!validate()) {
      showStatus('Please fix the highlighted fields.', 'error');
      return;
    }

    const payload = {
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      subject: fields.subject.value.trim(),
      message: fields.message.value.trim(),
    };

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Something went wrong. Please try again.');
      }

      showStatus(data.message || "Message sent — I'll get back to you soon!", 'success');
      form.reset();
    } catch (err) {
      showStatus(err.message || 'Network error. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  });

  // clear individual field errors as the user types
  Object.entries(fields).forEach(([key, el]) => {
    el.addEventListener('input', () => setFieldError(key, ''));
  });
})();
