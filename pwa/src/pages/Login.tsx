import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function Login() {
  const [loading, setLoading] = useState(false);
  const { isInstallable, triggerInstall, isIOS, isAppInstalled } = useInstallPrompt();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container align-center justify-center flex-col" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', justifyContent: 'center' }}>
      
      <div style={{ marginBottom: '40px' }}>
        <h1 className="text-title" style={{ color: 'var(--primary)', fontSize: '32px' }}>Wellcome</h1>
        <p className="text-subtitle">Sua plataforma de eventos gastronômicos</p>
      </div>

      <div className="card" style={{ width: '100%', marginBottom: 'var(--spacing-xl)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Entrar na conta</h2>
        
        <button 
          className="btn-primary" 
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ backgroundColor: '#DB4437' }} // Google Color
        >
          {loading ? 'Redirecionando...' : 'Entrar com Google'}
        </button>
      </div>

      {!isAppInstalled && (isInstallable || isIOS) && (
        <div className="card" style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--primary)', width: '100%' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '8px' }}>Baixe nosso App!</h3>
          
          {isIOS ? (
            <div style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'left' }}>
              Para instalar o Wellcome no seu iPhone:
              <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li>Toque no ícone de <strong>Compartilhar</strong> na barra do Safari (quadrado com uma seta p/ cima).</li>
                <li>Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.</li>
              </ol>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '14px', marginBottom: '16px' }}>
                Instale o Wellcome na sua tela inicial para uma melhor experiência offline e mais rapidez.
              </p>
              <button className="btn-primary" onClick={triggerInstall}>
                Instalar Aplicativo
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
