import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';

export function CreateEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    price: '',
    location: '',
    cuisine: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      // Insert into events table
      const eventData = {
        title: form.title,
        description: form.description,
        event_date: new Date(form.date).toISOString(),
        price: parseFloat(form.price) || 0,
        location_name: form.location,
        host_id: session.user.id,
        cuisine_types: form.cuisine.split(',').map(s => s.trim()),
        status: 'published'
      };

      const { error } = await supabase.from('events').insert([eventData]);
      if (error) throw error;

      alert('Evento criado com sucesso!');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      alert('Erro ao criar evento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container flex-col" style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', paddingBottom: 'var(--spacing-xl)' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: 'var(--card-bg)', 
        padding: 'var(--spacing-lg) var(--spacing-lg)', 
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-md)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none' }}>
          <ArrowLeft size={24} color="var(--primary)" />
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Novo Evento</h1>
      </header>

      {/* Form */}
      <main style={{ padding: 'var(--spacing-lg)' }}>
        
        {/* Placeholder for Image Upload */}
        <div style={{
          width: '100%',
          height: '180px',
          backgroundColor: '#EEEEEE',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--spacing-xl)',
          color: 'var(--text-muted)'
        }}>
          <ImageIcon size={48} style={{ marginBottom: '8px' }} />
          <span>Adicionar Foto de Capa</span>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-md">
          <div className="input-container">
            <label className="input-label">Título da Experiência</label>
            <input 
              required
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Ex: Noite de Massas Italianas" 
              className="input-field" 
            />
          </div>

          <div className="input-container">
            <label className="input-label">Descrição</label>
            <textarea 
              required
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Conte o que os convidados vão provar..." 
              className="input-field" 
              style={{ minHeight: '100px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div className="input-container">
              <label className="input-label">Data e Hora</label>
              <input 
                required
                name="date"
                type="datetime-local"
                value={form.date}
                onChange={handleChange}
                className="input-field" 
              />
            </div>
            
            <div className="input-container">
              <label className="input-label">Preço (R$)</label>
              <input 
                required
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                placeholder="Ex: 120.00" 
                className="input-field" 
              />
            </div>
          </div>

          <div className="input-container">
            <label className="input-label">Endereço do Local</label>
            <input 
              required
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Ex: Rua Fictícia, 123 - Centro" 
              className="input-field" 
            />
          </div>

          <div className="input-container mb-lg">
            <label className="input-label">Tipos de Culinária</label>
            <input 
              required
              name="cuisine"
              value={form.cuisine}
              onChange={handleChange}
              placeholder="Ex: Italiana, Massas, Vinhos (separados por vírgula)" 
              className="input-field" 
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Publicando...' : 'Publicar Evento'}
          </button>
        </form>
      </main>
    </div>
  );
}
