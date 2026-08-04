import Image from 'next/image';
import { WaitlistForm } from './components/waitlist-form';

const howItWorks = [
  ['01', 'Escolha a sua cena', 'Encontre mesas, menus e pessoas que combinam com a sua vontade de sair do comum.'],
  ['02', 'Confirme o encontro', 'Reserve sua vaga e receba tudo o que precisa saber para chegar, participar e aproveitar.'],
  ['03', 'Guarde a historia', 'Viva uma noite boa de contar e descubra novas experiencias sempre que quiser.'],
];

export default function Home() {
  return (
    <main>
      <section className="hero-section" aria-labelledby="hero-title">
        <Image
          src="/images/hero-table.png"
          alt="Pessoas compartilhando uma refeicao em uma mesa ao ar livre"
          fill
          priority
          sizes="100vw"
          className="hero-image"
        />
        <div className="hero-scrim" aria-hidden="true" />
        <header className="site-header shell">
          <a className="wordmark" href="#inicio" aria-label="Wellcome, inicio">wellcome<span>.</span></a>
          <nav className="site-nav" aria-label="Navegacao principal">
            <a href="#como-funciona">Como funciona</a>
            <a href="#para-quem-e">Para voce</a>
            <a className="nav-cta" href="#lista">Lista de espera</a>
          </nav>
        </header>

        <div className="hero-copy shell" id="inicio">
          <p className="eyebrow">NOVAS MESAS, NOVAS HISTORIAS</p>
          <h1 id="hero-title">Experiencias gastronomicas para viver e criar.</h1>
          <p className="hero-description">A Wellcome aproxima quem quer sair para comer de quem tem uma mesa, uma receita e vontade de receber.</p>
          <div className="hero-actions">
            <a className="button button-dark" href="#lista">Quero entrar na lista</a>
            <a className="text-link" href="#como-funciona">Entender a Wellcome <span aria-hidden="true">-&gt;</span></a>
          </div>
        </div>

        <div className="hero-note shell" aria-label="Mensagem de lancamento">
          <span className="hero-note-mark" />
          <p>Chegando para transformar um jantar em um encontro.</p>
        </div>
      </section>

      <section className="statement-section shell" id="como-funciona" aria-labelledby="statement-title">
        <p className="eyebrow">A CIDADE TEM MAIS SABOR QUANDO A GENTE SE ENCONTRA</p>
        <div className="statement-grid">
          <h2 id="statement-title">Nem restaurante. Nem rolê de sempre. Uma mesa aberta para a sua proxima boa historia.</h2>
          <p>Na Wellcome, cada encontro junta comida de verdade, anfitrioes locais e pessoas com vontade de fazer algo diferente. Voce escolhe como quer chegar: para descobrir ou para receber.</p>
        </div>
      </section>

      <section className="steps-section" aria-labelledby="steps-title">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">SEM COMPLICAR O QUE JA E BOM</p>
            <h2 id="steps-title">Do seu jeito, na sua cidade.</h2>
          </div>
          <ol className="steps-list">
            {howItWorks.map(([number, title, description]) => (
              <li key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="audience-section shell" id="para-quem-e" aria-labelledby="audience-title">
        <div className="section-heading audience-heading">
          <p className="eyebrow">UMA PLATAFORMA, DUAS FORMAS DE PERTENCER</p>
          <h2 id="audience-title">Venha para a mesa. Ou prepare a sua.</h2>
        </div>
        <div className="audience-grid">
          <article className="audience-card discover-card">
            <p className="card-index">PARA QUEM QUER IR</p>
            <h3>Descubra lugares que nao aparecem no seu feed.</h3>
            <p>Encontre jantares, almocos, cafes e experiencias criadas por gente de verdade perto de voce.</p>
            <a className="text-link" href="#lista">Quero descobrir <span aria-hidden="true">-&gt;</span></a>
          </article>
          <article className="audience-card host-card">
            <p className="card-index">PARA QUEM QUER RECEBER</p>
            <h3>Transforme sua mesa em uma experiencia memoravel.</h3>
            <p>Crie encontros com o seu menu, suas regras e o tipo de gente que voce quer conhecer.</p>
            <a className="text-link" href="#lista">Quero receber <span aria-hidden="true">-&gt;</span></a>
          </article>
        </div>
      </section>

      <section className="product-section" aria-labelledby="product-title">
        <div className="shell product-grid">
          <div className="product-copy">
            <p className="eyebrow eyebrow-light">UM CONVITE QUE CABE NO BOLSO</p>
            <h2 id="product-title">A experiencia comeca antes do primeiro brinde.</h2>
            <p>Veja detalhes, cardapio, anfitriao e o clima do encontro antes de reservar. Simples para quem participa, completo para quem recebe.</p>
            <a className="button button-cream" href="#lista">Quero receber o convite</a>
          </div>
          <div className="phone-stage">
            <div className="phone-frame">
              <Image
                src="/images/app-event.png"
                alt="Tela do aplicativo Wellcome mostrando os detalhes de um evento"
                width={260}
                height={2067}
                sizes="(max-width: 768px) 190px, 260px"
              />
            </div>
            <p className="phone-caption">Escolha com calma. Chegue com vontade.</p>
          </div>
        </div>
      </section>

      <section className="waitlist-section shell" id="lista" aria-labelledby="waitlist-title">
        <div className="waitlist-copy">
          <p className="eyebrow">A PRIMEIRA MESA E SUA</p>
          <h2 id="waitlist-title">Entre antes. Encontre melhor.</h2>
          <p>Deixe seu e-mail e conte como voce quer viver a Wellcome. Quando abrirmos as portas, a gente chama voce primeiro.</p>
        </div>
        <WaitlistForm />
      </section>

      <footer className="site-footer shell">
        <a className="wordmark footer-wordmark" href="#inicio">wellcome<span>.</span></a>
        <p>Comida boa. Gente interessante. Uma cidade mais viva.</p>
        <a href="mailto:oi@wellcome.app">oi@wellcome.app</a>
      </footer>
    </main>
  );
}
