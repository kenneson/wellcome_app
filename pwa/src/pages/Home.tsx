import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Calendar, DollarSign, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function Home() {
  const navigate = useNavigate();
  const { isInstallable, triggerInstall } = useInstallPrompt();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          host:profiles(full_name, avatar_url)
        `)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });
        
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: '90px' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: 'var(--primary)', 
        padding: 'var(--spacing-lg) var(--spacing-lg)', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Wellcome</h1>
        <button 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'white', 
            cursor: 'pointer' 
          }}
          onClick={() => supabase.auth.signOut()}
        >
          Sair
        </button>
      </header>

      {/* PWA Install Banner */}
      {isInstallable && (
        <div style={{ backgroundColor: 'var(--secondary)', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--primary)' }}>
          <div>
            <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: '16px' }}>Instalar Aplicativo</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Acesso rápido e offline</span>
          </div>
          <button 
            onClick={triggerInstall}
            style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold' }}
          >
            Instalar
          </button>
        </div>
      )}

      {/* Main Content */}
      <main style={{ padding: 'var(--spacing-lg)' }}>
        <h2 className="text-title" style={{ fontSize: '20px', marginBottom: 'var(--spacing-lg)' }}>
          Eventos Gastronômicos
        </h2>

        {loading ? (
          <div className="flex justify-center mt-xl">Carregando eventos...</div>
        ) : events.length === 0 ? (
          <div className="card text-center" style={{ marginTop: 'var(--spacing-xl)' }}>
            <Calendar size={48} color="var(--primary)" style={{ margin: '0 auto var(--spacing-md)' }} />
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Nenhum evento próximo</h3>
            <p className="text-subtitle" style={{ marginBottom: 0 }}>
              Fique ligado, novas experiências estão chegando!
            </p>
          </div>
        ) : (
          <div className="flex-col gap-lg">
            {events.map((event) => (
              <div key={event.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <img 
                  src={event.main_image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500'} 
                  alt={event.title}
                  style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                />
                
                <div style={{ padding: 'var(--spacing-lg)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                    {event.title}
                  </h3>
                  
                  <div className="flex-col gap-sm" style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    <div className="flex items-center gap-sm">
                      <Calendar size={16} />
                      <span>{new Date(event.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </div>
                    
                    <div className="flex items-center gap-sm">
                      <MapPin size={16} />
                      <span>{event.location_name || 'Endereço a confirmar'}</span>
                    </div>

                    <div className="flex items-center gap-sm">
                      <DollarSign size={16} />
                      <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                        {event.price === 0 ? 'Gratuito' : `R$ ${Number(event.price).toFixed(2).replace('.', ',')}`}
                      </span>
                    </div>
                  </div>

                  <button className="btn-secondary" style={{ width: '100%', padding: '10px' }}>
                    Ver Detalhes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button for Create Event */}
      <button 
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          backgroundColor: 'var(--primary)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(255, 140, 66, 0.4)',
          border: 'none',
          cursor: 'pointer'
        }}
        onClick={() => navigate("/create")}
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
