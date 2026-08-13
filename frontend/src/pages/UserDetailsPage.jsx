import { useState, useRef, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { useFBX, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

import cityView from '../assets/backgrounds/city_view.png';
import previewOne from '../assets/backgrounds/avatar_view.png';
import previewTwo from '../assets/backgrounds/checkpoint.png';
import ConsentModal from './ConsentModal';
import { saveUserProfile, getUserProfile } from '../utils/gameStorage';
import { cdnUrl } from '../config/assetCdn.js';
import './UserDetailsPage.css';

export const AVATARS = [
  {
    id: 'avatar_1',
    name: 'Adventurer Man',
    url: cdnUrl('avatar/adventurerman.fbx'),
  },
  {
    id: 'avatar_2',
    name: 'Adventurer Girl',
    url: cdnUrl('avatar/adventurergirl.fbx'),
  },
  {
    id: 'avatar_3',
    name: 'Casual Hoodie',
    url: cdnUrl('avatar/casual_hoodie.fbx'),
  },
  {
    id: 'avatar_4',
    name: 'Punk',
    url: cdnUrl('avatar/punk.fbx'),
  },
  {
    id: 'avatar_5',
    name: 'Suit Girl',
    url: cdnUrl('avatar/Suitgirl.fbx'),
  },
  {
    id: 'avatar_6',
    name: 'Suit Man',
    url: cdnUrl('avatar/Suitman.fbx'),
  },
  {
    id: 'avatar_7',
    name: 'Shubam',
    url: cdnUrl('avatar/Shubam.fbx'),
  },
];

const SCENARIOS = {
  student: {
    label: 'College Student',
    icon: '🎓',
  },
  employee: {
    label: 'New Employee',
    icon: '💼',
  },
};

function findClipByName(animations, targetName) {
  if (!animations) return null;
  return animations.find((clip) => {
    const shortName = clip.name.includes('|')
      ? clip.name.split('|').pop()
      : clip.name;
    return shortName.toLowerCase() === targetName.toLowerCase();
  });
}

function CanvasLoader() {
  return (
    <Html center>
      <div style={{ color: '#1e8bff', fontWeight: 600, fontSize: '11px', fontFamily: 'Sora, sans-serif', whiteSpace: 'nowrap' }}>
        Loading...
      </div>
    </Html>
  );
}

function AvatarPreview({ modelUrl, isLocked }) {
  const fbx = useFBX(modelUrl);
  const mixerRef = useRef();
  const currentActionRef = useRef(null);

  useEffect(() => {
    if (!fbx) return;

    fbx.scale.set(1, 1, 1);
    fbx.position.set(0, 0, 0);

    const box = new THREE.Box3().setFromObject(fbx);
    const size = box.getSize(new THREE.Vector3());
    const targetHeight = 1.8;
    const scaleFactor = size.y > 0 ? targetHeight / size.y : 1;
    fbx.scale.setScalar(scaleFactor);

    const scaledBox = new THREE.Box3().setFromObject(fbx);
    const center = scaledBox.getCenter(new THREE.Vector3());
    fbx.position.x = -center.x;
    fbx.position.y = -center.y;
    fbx.position.z = -center.z;

    fbx.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material && !child.material.map) {
          const name = child.name.toLowerCase();
          let color = '#d1d5db';

          if (
            name.includes('skin') ||
            name.includes('head') ||
            name.includes('hand')
          ) {
            color = '#e0b090';
          } else if (name.includes('hair')) {
            color = '#4a2f1e';
          } else if (name.includes('shirt') || name.includes('top')) {
            color = '#38bdf8';
          } else if (name.includes('suit') || name.includes('jacket')) {
            color = '#334155';
          } else if (name.includes('pant') || name.includes('trouser')) {
            color = '#1e293b';
          } else if (name.includes('tie')) {
            color = '#f43f5e';
          }

          child.material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.6,
            metalness: 0.1,
          });
        }
      }
    });

    mixerRef.current = new THREE.AnimationMixer(fbx);

    const idleClip = findClipByName(fbx.animations, 'Idle');
    const walkClip = findClipByName(fbx.animations, 'Walk');

    const targetClip = isLocked
      ? idleClip || fbx.animations[0]
      : walkClip || idleClip || fbx.animations[0];

    if (targetClip) {
      const action = mixerRef.current.clipAction(targetClip);
      action.reset().fadeIn(0.25).play();
      currentActionRef.current = action;
    }

    return () => {
      currentActionRef.current?.fadeOut(0.25);
    };
  }, [fbx, isLocked, modelUrl]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return <primitive object={fbx} />;
}

export default function UserDetailsPage() {
  const navigate = useNavigate();
  const existingProfile = getUserProfile();

  const [form, setForm] = useState({
    name: existingProfile.name !== 'Player' ? existingProfile.name : '',
    email: existingProfile.email !== 'demo@sbi.com' ? existingProfile.email : '',
  });

  const [scenario, setScenario] = useState(existingProfile.scenario || 'student');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen tracking
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(document.fullscreenElement || document.webkitFullscreenElement)
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen();
        }
        if (window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  useEffect(() => {
    AVATARS.forEach((avatar) => {
      useFBX.preload(avatar.url);
    });
  }, []);

  const currentAvatar = AVATARS[avatarIndex];
  const canContinue = form.name.trim() !== '' && form.email.trim() !== '' && isLocked;

  const handleField = (field) => (e) =>
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));

  const handleNextAvatar = () => {
    if (isLocked || avatarIndex >= AVATARS.length - 1) return;
    setAvatarIndex((prev) => prev + 1);
  };

  const handlePrevAvatar = () => {
    if (isLocked || avatarIndex <= 0) return;
    setAvatarIndex((prev) => prev - 1);
  };

  return (
    <div className="details">
      <div className="details__bg" style={{ backgroundImage: `url(${cityView})` }} />
      <div className="details__scrim" />

      <svg className="details__route" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
        <path className="details__route-path" d="M -50 900 C 300 750, 250 550, 500 480 S 900 350, 850 200 S 1100 60, 1650 20" />
      </svg>

      <div className="details__particles" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className="details__particle" style={{ '--i': i }} />
        ))}
      </div>

      <div className="details__content">
        {/* LEFT PANEL */}
        <div className="details__left">
          {/* HEADER ROW WITH FULLSCREEN BUTTON */}
          <div className="details__header-row">
            <div className="details__header-group">
              <h1 className="details__title">💫 Choose Your Persona ✨</h1>
            </div>
            
            <button
              type="button"
              className="details__fullscreen-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>

          {/* 3D AVATAR STAGE */}
          <div className="avatar-stage">
            <div className="avatar-stage__badge">{currentAvatar.name}</div>

            <Canvas className="avatar-stage__canvas" camera={{ position: [0, 0, 2.7], fov: 45 }}>
              <ambientLight intensity={1.8} />
              <directionalLight position={[5, 8, 5]} intensity={2.2} />

              <Suspense fallback={<CanvasLoader />}>
                <AvatarPreview key={currentAvatar.id} modelUrl={currentAvatar.url} isLocked={isLocked} />
              </Suspense>

              <OrbitControls enableZoom={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 3} />
            </Canvas>

            {avatarIndex > 0 && (
              <button
                type="button"
                className="avatar-arrow avatar-arrow--prev"
                disabled={isLocked}
                onClick={handlePrevAvatar}
                aria-label="Previous Avatar"
              >
                &#10094;
              </button>
            )}

            {avatarIndex < AVATARS.length - 1 && (
              <button
                type="button"
                className="avatar-arrow avatar-arrow--next"
                disabled={isLocked}
                onClick={handleNextAvatar}
                aria-label="Next Avatar"
              >
                &#10095;
              </button>
            )}

            <button
              type="button"
              className={`avatar-lock-btn ${isLocked ? 'avatar-lock-btn--locked' : ''}`}
              onClick={() => setIsLocked(!isLocked)}
            >
              {isLocked ? '🔒 Avatar Locked' : '🔓 Lock Selected Avatar'}
            </button>
          </div>

          {/* FORM FIELDS */}
          <div className="details__form">
            <Field label="Avatar Name">
              <input
                type="text"
                placeholder="e.g. Ananya Sharma"
                value={form.name}
                onChange={handleField('name')}
              />
            </Field>

            <Field label="Email Address">
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleField('email')}
              />
            </Field>
          </div>

          {/* SCENARIOS */}
          <div className="details__scenario">
            <h3>Choose your scenario</h3>
            <div className="details__scenario-grid">
              {Object.entries(SCENARIOS).map(([key, s]) => (
                <ScenarioCard
                  key={key}
                  scenario={s}
                  selected={scenario === key}
                  onSelect={() => setScenario(key)}
                />
              ))}
            </div>
          </div>

          {/* CONTINUE BUTTON */}
          <button
            type="button"
            className="details__continue"
            disabled={!canContinue}
            onClick={() => setShowConsent(true)}
          >
            {isLocked ? 'Continue' : 'Lock Avatar First'}
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div className="details__right">
          <div className="details__preview-card details__preview-card--one">
            <img src={previewOne} alt="Game Preview One" />
          </div>

          <div className="details__preview-card details__preview-card--two">
            <img src={previewTwo} alt="Game Preview Two" />
          </div>
        </div>
      </div>

      {showConsent && (
        <ConsentModal
          onCancel={() => setShowConsent(false)}
          onAgree={() => {
            const profileData = {
              ...form,
              scenario,
              selectedAvatar: currentAvatar,
              coins: 120,
            };
            saveUserProfile(profileData);
            navigate('/game', {
              state: {
                profile: profileData,
                selectedAvatar: currentAvatar,
              },
            });
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}

function ScenarioCard({ scenario, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`scenario-card${selected ? ' scenario-card--selected' : ''}`}
      onClick={onSelect}
    >
      <div className="scenario-card__icon">{scenario.icon}</div>
      <h3 className="scenario-card__title">{scenario.label}</h3>
    </button>
  );
}