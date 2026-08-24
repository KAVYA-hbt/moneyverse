import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import './LoadingScreen.css';

export default function LoadingScreen({ isReady = false, onEnter, playIntroSting, startAmbience, stopAmbience }) {
  const { t } = useLanguage();
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  // Plays a smooth fade/zoom-out once the player actually taps the button
  // -- the component doesn't just vanish, and onEnter (which reveals the
  // game page) only fires once that transition has actually played.
  const [isExiting, setIsExiting] = useState(false);

  // Opening sting once, the moment this screen actually appears, then the
  // looping ambience underneath for as long as it's up -- torn down on
  // unmount (tapping through, or the component going away for any other
  // reason) so it never keeps playing into the game itself.
  useEffect(() => {
    playIntroSting?.();
    startAmbience?.();
    return () => stopAmbience?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately
    // once on mount only, not on every prop identity change.
  }, []);

  // Joystick touch/mouse movement handlers
  const handleStart = () => {
    setIsDragging(true);
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const base = document.getElementById('joystick-base');
    if (!base) return;
    
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.min(40, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);

    const limitedX = Math.cos(angle) * distance;
    const limitedY = Math.sin(angle) * distance;

    setJoystickPos({ x: limitedX, y: limitedY });
  };

  const handleEnd = () => {
    setIsDragging(false);
    setJoystickPos({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  // Tapping "Start Your Journey" only ever does something once loading is
  // strictly finished (isReady) -- before that it's visibly disabled, so
  // there's no way to slip into the game page early. Once it's ready and
  // tapped, plays the fade/zoom-out transition, THEN calls onEnter.
  const handleStartJourney = () => {
    if (!isReady || isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onEnter?.();
    }, 550);
  };

  return (
    <div className={`star-wars-intro${isExiting ? ' star-wars-intro--exiting' : ''}`}>
      {/* WIDER MOVING LINES COVERING FULL WIDTH */}
      <div className="moving-lines-container">
        {[...Array(40)].map((_, i) => (
          <div 
            key={i} 
            className="moving-line" 
            style={{ 
              left: `${(i / 40) * 100}%`, 
              animationDelay: `${(i % 5) * 0.2}s`,
              animationDuration: `${0.4 + (i % 3) * 0.1}s`
            }}
          ></div>
        ))}
      </div>

      <div className="stars"></div>

      {/* FLOATING DECORATIVE EMOJIS SCATTERED AROUND CORNERS/EDGES */}
      <div className="floating-decorations">
        <span className="decor-emoji emoji-gift">🎁</span>
        <span className="decor-emoji emoji-coin">🪙</span>
        <span className="decor-emoji emoji-game">🎮</span>
        <span className="decor-emoji emoji-sparkle">✨</span>
        <span className="decor-emoji emoji-robot">🤖</span>
        <span className="decor-emoji emoji-city">🏙️</span>
      </div>

      {/* LEFT SIDE: Floating Robot Companion Animation */}
      <div className="side-visual left-visual">
        <div className="robot-container">
          <div className="robot-head">
            <div className="robot-eye left-eye"></div>
            <div className="robot-eye right-eye"></div>
          </div>
          <div className="robot-body"></div>
          <div className="robot-glow"></div>
        </div>
      </div>

      {/* RIGHT SIDE: City Building Animation */}
      <div className="side-visual right-visual">
        <div className="city-container">
          <div className="blueprint-building b1"></div>
          <div className="blueprint-building b2"></div>
          <div className="blueprint-building b3"></div>
          <div className="blueprint-building b4"></div>
        </div>
      </div>

      {/* WIDER TEXT CRAWL CONTAINER COVERING MOST OF THE PAGE */}
      <div className="crawl-container">
        {/* Plays through once and holds -- see .crawl-text in
            LoadingScreen.css (animation is `1 forwards`, not `infinite`) */}
        <div className="crawl-text">
          <div className="intro-title">
            <h1>{t('loading.title')}</h1>
          </div>

          <p>{t('loading.p1')}</p>
          <p>{t('loading.p2')}</p>
          <p>{t('loading.p3')}</p>
          <p>{t('loading.p4')}</p>
          <p>{t('loading.p5')}</p>
          <p>{t('loading.p6')}</p>
        </div>
      </div>

      {/* JOYSTICK ON THE LEFT SIDE */}
      <div className="mobile-joystick-container">
        <div 
          id="joystick-base"
          className="joystick-base"
          onMouseDown={handleStart}
          onTouchStart={handleStart}
        >
          <div 
            className="joystick-stick"
            style={{
              transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`
            }}
          >
            🕹️
          </div>
        </div>
      </div>

      {/* GLOSSY BLUE "START YOUR JOURNEY" BUTTON -- disabled and dimmed
          until the city has actually finished loading (isReady), so this
          can never drop the player into the game before it's strictly
          ready; lights up and becomes tappable the moment it is. */}
      <button
        className={`start-journey-button${!isReady ? ' start-journey-button--disabled' : ''}`}
        onClick={handleStartJourney}
        disabled={!isReady}
        aria-disabled={!isReady}
      >
        {isReady ? t('loading.startJourney') : t('loading.preparing')}
      </button>
    </div>
  );
}