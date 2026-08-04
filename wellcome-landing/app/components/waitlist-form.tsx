'use client';

import { FormEvent, useState } from 'react';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export function WaitlistForm() {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get('email') || '').trim(),
      intent: String(form.get('intent') || 'DISCOVER'),
      website: String(form.get('website') || ''),
    };

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Nao foi possivel registrar seu e-mail agora.');
      }

      event.currentTarget.reset();
      setStatus('success');
      setMessage('Pronto. Quando a Wellcome abrir, voce sera um dos primeiros a saber.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel registrar seu e-mail agora.');
    }
  }

  return (
    <form className="waitlist-form" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="waitlist-email">Seu melhor e-mail</label>
      <input id="waitlist-email" name="email" type="email" autoComplete="email" placeholder="seuemail@exemplo.com" required disabled={status === 'submitting'} />
      <label className="sr-only" htmlFor="waitlist-intent">Como voce quer usar a Wellcome</label>
      <select id="waitlist-intent" name="intent" defaultValue="DISCOVER" disabled={status === 'submitting'}>
        <option value="DISCOVER">Quero descobrir experiencias</option>
        <option value="HOST">Quero receber pessoas</option>
        <option value="BOTH">Quero os dois</option>
      </select>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" className="button button-dark" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Entrando...' : 'Entrar na lista'}
      </button>
      <p className={`form-message ${status}`} aria-live="polite">{message}</p>
    </form>
  );
}
