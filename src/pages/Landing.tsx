import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLanguageStore } from '../store/languageStore';
import { useStoreConfigStore } from '../store/storeConfigStore';
import { to12h } from '../utils/time';
import logo from '../assets/malhame-horizontal-logo.svg';
import {
  CATEGORIES,
  DAY_NAMES,
  COPY,
  STATS,
  STEPS,
  TICKER,
  VALUES,
  WHATSAPP_DISPLAY,
  WHATSAPP_NUMBER,
} from '../data/landingContent';
import './Landing.css';

const ORDER_PATH = '/menu';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

/** Copy strings carry inline <br>/<em>/<strong>, so they render as raw HTML. */
function html(value: string) {
  return { __html: value };
}

export function Landing() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const c = COPY[language];

  // Opening hours come from the same store_config row the menu reads.
  const openTime = useStoreConfigStore((s) => s.open_time);
  const closeTime = useStoreConfigStore((s) => s.close_time);
  const closedDays = useStoreConfigStore((s) => s.closed_days);
  const fetchConfig = useStoreConfigStore((s) => s.fetchConfig);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const hours = `${to12h(openTime)} – ${to12h(closeTime)}`;
  const closedLabel = closedDays.length
    ? `${language === 'ar' ? 'مغلق' : 'Closed'}: ${closedDays
        .map((d) => DAY_NAMES[language][d])
        .join(language === 'ar' ? '، ' : ', ')}`
    : '';

  const rootRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [showFab, setShowFab] = useState(false);

  // Reveal sections as they enter the viewport.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>('.rv'));
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Solid header + floating WhatsApp button past a scroll threshold.
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
        setShowFab(window.scrollY > 500);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Animate in-page jumps (#menu, #story, …) instead of teleporting.
  const handleAnchorClick = (e: MouseEvent<HTMLDivElement>) => {
    const link = (e.target as HTMLElement).closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute('href')!.slice(1);
    const target = id === 'top' ? document.body : document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    } else {
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const ticker = [...TICKER[language], ...TICKER[language]];

  return (
    <div className="lp" ref={rootRef} onClick={handleAnchorClick}>
      <header className={`lp-header${scrolled ? ' solid' : ''}`}>
        <div className="wrap bar">
          <a className="brand" href="#top">
            <img src={logo} alt="Boucherie &amp; Grill Parisienne" className="brand-logo" />
          </a>
          <nav>
            <a className="nl" href="#menu">{c.navMenu}</a>
            <a className="nl" href="#story">{c.navStory}</a>
            <a className="nl" href="#visit">{c.navVisit}</a>
            <button
              className="lang"
              type="button"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            >
              {c.swap}
            </button>
            <Link className="nav-order" to={ORDER_PATH}>{c.navOrder}</Link>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* hero */}
        <div className="hero">
          <div className="hero-bg">
            <img src="/landing/grilled.jpg" alt="" fetchPriority="high" />
          </div>
          <div className="grain" />
          <div className="hero-in">
            <div className="wrap">
              <span className="eyebrow on-dark rv">{c.eyebrow}</span>
              <h1 className="display rv d1" dangerouslySetInnerHTML={html(c.heroTitle)} />
              <p className="lede rv d2">{c.heroSub}</p>
              <div className="hero-cta rv d3">
                <Link className="btn btn-gold" to={ORDER_PATH}>
                  <span>{c.ctaOrder}</span>
                  <span className="arw">→</span>
                </Link>
                <a className="btn btn-line" href="#menu">{c.ctaMenu}</a>
              </div>
            </div>
          </div>
          <div className="scroll-hint">
            <span>{c.scroll}</span>
            <i />
          </div>
        </div>

        {/* ticker */}
        <div className="marquee">
          <div className="mq-track">
            {ticker.map((word, i) => (
              <span key={`${word}-${i}`}>{word}</span>
            ))}
          </div>
        </div>

        {/* heritage */}
        <section id="story" className="story">
          <div className="wrap story-grid">
            <div className="rv">
              <span className="year">
                1930<small>{c.yearLabel}</small>
              </span>
            </div>
            <div className="story-body rv d1">
              <span className="eyebrow">{c.storyEyebrow}</span>
              <h2 className="display" style={{ marginTop: 16 }}>{c.storyTitle}</h2>
              <p dangerouslySetInnerHTML={html(c.storyP1)} />
              <p dangerouslySetInnerHTML={html(c.storyP2)} />
              <div className="stats">
                {STATS.map((s) => (
                  <div className="stat" key={s.en[1]}>
                    <span className="k">{s[language][0]}</span>
                    <span className="l">{s[language][1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* menu bento */}
        <section id="menu">
          <div className="wrap">
            <div className="sec-head rv">
              <span className="eyebrow">{c.menuEyebrow}</span>
              <h2 className="display">{c.menuTitle}</h2>
              <p>{c.menuSub}</p>
            </div>
            <div className="bento rv d1">
              {CATEGORIES.map((cat) => (
                <Link className={`tile ${cat.cls}`} to={ORDER_PATH} key={cat.en}>
                  <img src={cat.img} alt={cat[language]} loading="lazy" />
                  <span className="cap">
                    <h3>{cat[language]}</h3>
                    <span className="go">→</span>
                  </span>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 44 }} className="rv d2">
              <Link className="btn btn-navy" to={ORDER_PATH}>
                <span>{c.ctaFullMenu}</span>
                <span className="arw">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* values */}
        <section className="values">
          <div className="wrap">
            <div className="sec-head rv">
              <span className="eyebrow">{c.whyEyebrow}</span>
              <h2 className="display">{c.whyTitle}</h2>
            </div>
            <div className="vgrid">
              {VALUES.map((v, i) => (
                <div className={`v rv${i ? ` d${i}` : ''}`} key={v.en[0]}>
                  <div className="v-media">
                    <img src={v.img} alt={v[language][0]} loading="lazy" />
                  </div>
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{v[language][0]}</h3>
                  <p>{v[language][1]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* how to order */}
        <section>
          <div className="wrap split">
            <div className="rv">
              <span className="eyebrow">{c.howEyebrow}</span>
              <h2 className="display" style={{ fontSize: 'clamp(1.9rem,4.4vw,3rem)', margin: '16px 0 14px' }}>
                {c.howTitle}
              </h2>
              <p style={{ color: 'var(--muted)', fontWeight: 300 }}>{c.howSub}</p>
              <ol className="steps">
                {STEPS.map((s, i) => (
                  <li key={s.en[0]}>
                    <span className="n">{i + 1}</span>
                    <div>
                      <h4>{s[language][0]}</h4>
                      <p>{s[language][1]}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div style={{ marginTop: 30 }}>
                <Link className="btn btn-gold" to={ORDER_PATH}>
                  <span>{c.ctaStart}</span>
                  <span className="arw">→</span>
                </Link>
              </div>
            </div>
            <div className="split-media rv d2">
              <img src="/landing/sandwiches.jpg" alt="" loading="lazy" />
            </div>
          </div>
        </section>

        {/* visit */}
        <section id="visit" className="visit">
          <div className="wrap">
            <div className="sec-head rv">
              <span className="eyebrow on-dark">{c.visitEyebrow}</span>
              <h2 className="display">{c.visitTitle}</h2>
              <p>{c.visitSub}</p>
            </div>
            <div className="vinfo">
              <div className="vcard rv">
                <h3>{c.infoAddrT}</h3>
                <p dangerouslySetInnerHTML={html(c.infoAddr)} />
              </div>
              <div className="vcard rv d1">
                <h3>{c.infoHoursT}</h3>
                <p>
                  {hours}
                  {closedLabel && (
                    <>
                      <br />
                      <span className="lp-dim">{closedLabel}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="vcard rv d2">
                <h3>{c.infoPhoneT}</h3>
                <p>
                  <a href={WHATSAPP_URL} dir="ltr" target="_blank" rel="noopener noreferrer">
                    {WHATSAPP_DISPLAY}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* closer */}
        <div className="closer">
          <div className="closer-bg">
            <img src="/landing/lahm-b-aajin.jpg" alt="" loading="lazy" />
          </div>
          <div className="grain" />
          <div className="closer-in wrap">
            <h2 className="display rv">{c.closerTitle}</h2>
            <p className="rv d1">{c.closerSub}</p>
            <div className="rv d2">
              <Link className="btn btn-gold" to={ORDER_PATH}>
                <span>{c.ctaOrder2}</span>
                <span className="arw">→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="lp-footer">
        <div className="wrap frow">
          <span>{c.footL.replace('{year}', String(new Date().getFullYear()))}</span>
          <a href={WHATSAPP_URL} dir="ltr" target="_blank" rel="noopener noreferrer">
            {WHATSAPP_DISPLAY}
          </a>
        </div>
      </footer>

      <a
        className={`fab${showFab ? ' show' : ''}`}
        href={WHATSAPP_URL}
        aria-label="WhatsApp"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg viewBox="0 0 24 24">
          <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.2s-.7 1-.9 1.2c-.2.2-.3.2-.6.1s-1.3-.5-2.4-1.5c-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5s0-.4 0-.6c-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.3c.2.2 2.3 3.5 5.5 4.9.8.3 1.4.5 1.8.7.8.2 1.5.2 2 .1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.6-.4zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
        </svg>
      </a>
    </div>
  );
}
