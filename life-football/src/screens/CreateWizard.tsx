// Créateur de joueur : identité, apparence, profil sportif, origines, récapitulatif. Aperçu permanent.
import { useMemo, useState } from 'react';
import { useGame } from '../store/gameStore';
import type { Appearance, AttrKey, Identity, Position, Foot } from '../game/types';
import { defaultAppearance, defaultIdentity, initialAttributes, birthYearFor, START_YEAR } from '../game/create';
import { COUNTRIES, LANGUAGES, country } from '../content/countries';
import { ARCHETYPES, ATTR_LABELS, BACKGROUNDS, ENVIRONMENTS, POSITION_LABELS, archetype, background, environment } from '../content/profiles';
import { possibleSecondNationalities, validateIdentity, secondaryJustification } from '../game/eligibility';
import { Avatar, BEARDS, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from '../ui/Avatar';
import { ATTR_KEYS, overall } from '../game/stats';
import { MONTHS } from '../game/calendar';
import { StatBar } from '../ui/kit';

const STEPS = ['Identité', 'Apparence', 'Profil sportif', 'Origines', 'Récapitulatif'];
const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'ATT'];
const FEET: { id: Foot; label: string }[] = [{ id: 'right', label: 'Droitier' }, { id: 'left', label: 'Gaucher' }, { id: 'both', label: 'Ambidextre' }];
const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
const QUALITY_KEYS: AttrKey[] = ATTR_KEYS;

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={String(o.id)} type="button" className={o.id === value ? 'on' : ''} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

function CountrySelect({ value, onChange, placeholder, allowEmpty }: { value: string | null; onChange: (v: string | null) => void; placeholder?: string; allowEmpty?: boolean }) {
  return (
    <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      {(allowEmpty || !value) && <option value="">{placeholder ?? '— Choisir —'}</option>}
      {SORTED_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
    </select>
  );
}

export function CreateWizard() {
  const saves = useGame((s) => s.saves);
  const newGame = useGame((s) => s.newGame);
  const goMenu = useGame((s) => s.goMenu);
  const [step, setStep] = useState(0);
  const [id, setId] = useState<Identity>(defaultIdentity());
  const [ap, setAp] = useState<Appearance>(defaultAppearance());
  const [startAge, setStartAge] = useState(9);
  const [qualities, setQualities] = useState<AttrKey[]>(['technique', 'passing', 'speed']);
  const freeSlot = saves.findIndex((s) => !s);
  const [slot, setSlot] = useState(freeSlot >= 0 ? freeSlot : 0);

  const upd = (p: Partial<Identity>) => setId((cur) => {
    const n = { ...cur, ...p };
    // Une nationalité secondaire qui n'est plus justifiée est retirée.
    if (n.secondNationality && !secondaryJustification(n, n.secondNationality)) n.secondNationality = null;
    if (n.secondNationality === n.nationality) n.secondNationality = null;
    return n;
  });
  const updAp = (p: Partial<Appearance>) => setAp((cur) => ({ ...cur, ...p }));

  const errors = validateIdentity(id);
  const preview = useMemo(() => initialAttributes({ rng: 12345 }, { identity: id, appearance: ap, qualities, startAge }), [id, ap, qualities, startAge]);
  const ovr = overall(preview, id.position);
  const secondOptions = possibleSecondNationalities(id);
  const nat = id.nationality ? country(id.nationality) : null;

  const toggleQuality = (k: AttrKey) => {
    setQualities((q) => (q.includes(k) ? q.filter((x) => x !== k) : q.length >= 3 ? [...q.slice(1), k] : [...q, k]));
  };

  const start = () => {
    if (errors.length) return;
    newGame({ identity: { ...id, birthYear: birthYearFor(startAge, id.birthMonth) }, appearance: ap, qualities, startAge }, slot);
  };

  const stepValid = step !== 0 || (id.firstName.trim() && id.lastName.trim() && id.nationality);

  return (
    <div className="fullscreen">
      <div className="inner">
        <div className="row between mb">
          <div className="row">
            <div className="brand-logo">LF</div>
            <div>
              <div className="display" style={{ fontSize: 24, fontWeight: 800 }}>Créer ton joueur</div>
              <div className="small muted">Étape {step + 1}/{STEPS.length} · {STEPS[step]}</div>
            </div>
          </div>
          <button className="btn ghost sm" onClick={goMenu}>✕ Retour au menu</button>
        </div>
        <div className="tabs">
          {STEPS.map((s, i) => (
            <button key={s} className={i === step ? 'on' : ''} onClick={() => (i <= step || stepValid ? setStep(i) : undefined)}>{i + 1}. {s}</button>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 300px', alignItems: 'start' }}>
          <div className="card fade-in" key={step}>
            {step === 0 && (
              <div className="grid g2">
                <div className="field"><label>Prénom</label><input className="input" value={id.firstName} maxLength={24} onChange={(e) => upd({ firstName: e.target.value })} placeholder="Ex. Samir" /></div>
                <div className="field"><label>Nom</label><input className="input" value={id.lastName} maxLength={24} onChange={(e) => upd({ lastName: e.target.value })} placeholder="Ex. Delcourt" /></div>
                <div className="field"><label>Surnom (facultatif)</label><input className="input" value={id.nickname} maxLength={20} onChange={(e) => upd({ nickname: e.target.value })} placeholder="Ex. La Fusée" /></div>
                <div className="field">
                  <label>Âge au début de l’histoire</label>
                  <Seg value={startAge} options={[8, 9, 10].map((a) => ({ id: a, label: `${a} ans` }))} onChange={setStartAge} />
                </div>
                <div className="field">
                  <label>Mois de naissance</label>
                  <select className="input" value={id.birthMonth} onChange={(e) => upd({ birthMonth: Number(e.target.value) })}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <span className="tiny dim">Né(e) en {MONTHS[id.birthMonth - 1]} {birthYearFor(startAge, id.birthMonth)} · saison de départ {START_YEAR}-{START_YEAR + 1}</span>
                </div>
                <div className="field">
                  <label>Nationalité principale (choix obligatoire)</label>
                  <CountrySelect value={id.nationality || null} onChange={(v) => upd({ nationality: v ?? '' })} placeholder="— Choisis ta nationalité —" />
                </div>
                <div className="field">
                  <label>Pays de naissance</label>
                  <CountrySelect value={id.birthCountry} onChange={(v) => v && upd({ birthCountry: v, birthCity: country(v).cities[0] })} />
                </div>
                <div className="field">
                  <label>Ville de naissance</label>
                  <select className="input" value={id.birthCity} onChange={(e) => upd({ birthCity: e.target.value })}>
                    {country(id.birthCountry).cities.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Pays où il grandit (clubs et détections)</label>
                  <CountrySelect value={id.growUpCountry} onChange={(v) => v && upd({ growUpCountry: v, language: country(v).languages[0] })} />
                </div>
                <div className="field">
                  <label>Origine d’un parent (facultatif)</label>
                  <CountrySelect value={id.parentOrigin} onChange={(v) => upd({ parentOrigin: v })} placeholder="Même origine / non précisée" allowEmpty />
                </div>
                <div className="field">
                  <label>Nationalité secondaire</label>
                  <select className="input" value={id.secondNationality ?? ''} onChange={(e) => upd({ secondNationality: e.target.value || null })}>
                    <option value="">Aucune</option>
                    {secondOptions.map((c) => <option key={c} value={c}>{country(c).flag} {country(c).name} — {secondaryJustification(id, c)}</option>)}
                  </select>
                  <span className="tiny dim">{secondOptions.length ? 'Proposée car justifiée par ton histoire (naissance, parent, pays de résidence).' : 'Indique un pays de naissance, une origine parentale ou un pays de résidence différent pour débloquer une double nationalité.'}</span>
                </div>
                <div className="field">
                  <label>Langue principale</label>
                  <select className="input" value={id.language} onChange={(e) => upd({ language: e.target.value })}>
                    {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="col" style={{ gap: 16 }}>
                <div className="field"><label>Teint de peau</label><div className="row wrap">{SKIN_TONES.map((c, i) => <button key={c} className={`swatch ${ap.skin === i ? 'on' : ''}`} style={{ background: c }} onClick={() => updAp({ skin: i })} aria-label={`Teint ${i + 1}`} />)}</div></div>
                <div className="field"><label>Coiffure</label><Seg value={ap.hairStyle} options={HAIR_STYLES} onChange={(v) => updAp({ hairStyle: v })} /></div>
                <div className="field"><label>Couleur des cheveux</label><div className="row wrap">{HAIR_COLORS.map((c) => <button key={c} className={`swatch ${ap.hairColor === c ? 'on' : ''}`} style={{ background: c }} onClick={() => updAp({ hairColor: c })} aria-label={c} />)}</div></div>
                <div className="field"><label>Couleur des yeux</label><div className="row wrap">{EYE_COLORS.map((c) => <button key={c} className={`swatch ${ap.eyeColor === c ? 'on' : ''}`} style={{ background: c }} onClick={() => updAp({ eyeColor: c })} aria-label={c} />)}</div></div>
                <div className="field"><label>Forme du visage</label><Seg value={ap.faceShape} options={[{ id: 'oval', label: 'Ovale' }, { id: 'round', label: 'Rond' }, { id: 'square', label: 'Carré' }]} onChange={(v) => updAp({ faceShape: v })} /></div>
                <div className="grid g2">
                  <div className="field"><label>Taille (projection adulte)</label><Seg value={ap.heightClass} options={[{ id: 'small', label: 'Petit' }, { id: 'medium', label: 'Moyen' }, { id: 'tall', label: 'Grand' }]} onChange={(v) => updAp({ heightClass: v })} /><span className="tiny dim">Petit : +vitesse, −force. Grand : +force, +jeu aérien.</span></div>
                  <div className="field"><label>Corpulence</label><Seg value={ap.build} options={[{ id: 'slim', label: 'Fine' }, { id: 'normal', label: 'Normale' }, { id: 'strong', label: 'Puissante' }]} onChange={(v) => updAp({ build: v })} /></div>
                </div>
                <div className="grid g2">
                  <div className="field"><label>Barbe (visible à partir de 16 ans)</label><Seg value={ap.beard} options={BEARDS} onChange={(v) => updAp({ beard: v })} /></div>
                  <div className="field"><label>Numéro de maillot préféré</label><input className="input" type="number" min={1} max={99} value={ap.jerseyNumber} onChange={(e) => updAp({ jerseyNumber: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })} /></div>
                </div>
                <div className="row" style={{ gap: 18 }}>
                  {[startAge, 15, 22].map((a) => (
                    <div key={a} className="center">
                      <Avatar a={ap} age={a} size={90} />
                      <div className="tiny muted">{a} ans</div>
                    </div>
                  ))}
                  <span className="small muted">Ton apparence évoluera avec l’âge.</span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="col" style={{ gap: 16 }}>
                <div className="grid g2">
                  <div className="field"><label>Poste principal</label><Seg value={id.position} options={POSITIONS.map((p) => ({ id: p, label: POSITION_LABELS[p] }))} onChange={(v) => upd({ position: v, secondaryPosition: id.secondaryPosition === v ? null : id.secondaryPosition })} /></div>
                  <div className="field"><label>Poste secondaire</label><Seg value={id.secondaryPosition ?? 'none'} options={[{ id: 'none', label: 'Aucun' }, ...POSITIONS.filter((p) => p !== id.position).map((p) => ({ id: p, label: POSITION_LABELS[p] }))]} onChange={(v) => upd({ secondaryPosition: v === 'none' ? null : (v as Position) })} /></div>
                </div>
                <div className="field"><label>Pied fort</label><Seg value={id.foot} options={FEET} onChange={(v) => upd({ foot: v })} /></div>
                <div className="field">
                  <label>Orientation de départ</label>
                  <div className="grid g3">
                    {ARCHETYPES.map((a) => (
                      <button key={a.id} className={`pick-card ${id.archetype === a.id ? 'on' : ''}`} onClick={() => upd({ archetype: a.id })}>
                        <div style={{ fontSize: 20 }}>{a.icon}</div>
                        <div style={{ fontWeight: 700 }}>{a.label}</div>
                        <div className="tiny muted">{a.description}</div>
                        {a.suggested !== id.position && <div className="tiny orange" style={{ marginTop: 4 }}>Plutôt pensé pour : {POSITION_LABELS[a.suggested]}</div>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Tes 3 premières qualités ({qualities.length}/3)</label>
                  <div className="seg">
                    {QUALITY_KEYS.map((k) => <button key={k} className={qualities.includes(k) ? 'on' : ''} onClick={() => toggleQuality(k)}>{ATTR_LABELS[k]}</button>)}
                  </div>
                  <span className="tiny dim">Ton profil donne des bases différentes, mais ne fixe pas ton potentiel : celui-ci reste caché et se révélera avec le temps.</span>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="col" style={{ gap: 16 }}>
                <div className="field">
                  <label>Milieu familial</label>
                  <div className="grid g2">
                    {BACKGROUNDS.map((b) => (
                      <button key={b.id} className={`pick-card ${id.background === b.id ? 'on' : ''}`} onClick={() => upd({ background: b.id })}>
                        <div className="row"><span style={{ fontSize: 20 }}>{b.icon}</span><b>{b.label}</b></div>
                        <div className="tiny muted" style={{ margin: '4px 0 6px' }}>{b.description}</div>
                        <div className="tiny green">{b.pros.map((p) => `＋ ${p}`).join('  ')}</div>
                        <div className="tiny red" style={{ marginTop: 3 }}>{b.cons.map((p) => `－ ${p}`).join('  ')}</div>
                        <div className="tiny dim" style={{ marginTop: 4 }}>Argent de poche : {b.pocketMoney} €/sem. · Départ : {b.startMoney} €</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Environnement</label>
                  <div className="grid g3">
                    {ENVIRONMENTS.map((e) => (
                      <button key={e.id} className={`pick-card ${id.environment === e.id ? 'on' : ''}`} onClick={() => upd({ environment: e.id })}>
                        <div className="row"><span style={{ fontSize: 20 }}>{e.icon}</span><b>{e.label}</b></div>
                        <div className="tiny muted">{e.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="col">
                {errors.length > 0 && (
                  <div className="card flat" style={{ borderColor: 'rgba(255,107,107,0.4)' }}>
                    {errors.map((e) => <div key={e} className="small red">⚠ {e}</div>)}
                  </div>
                )}
                {[
                  { s: 0, title: 'Identité', lines: [`${id.firstName || '—'} ${id.lastName || '—'}${id.nickname ? ` « ${id.nickname} »` : ''}, ${startAge} ans`, `Nationalité : ${nat ? `${nat.flag} ${nat.name}` : '—'}${id.secondNationality ? ` + ${country(id.secondNationality).flag} ${country(id.secondNationality).name}` : ''}`, `Né à ${id.birthCity} (${country(id.birthCountry).name}) · grandit en ${country(id.growUpCountry).name} · ${id.language}`] },
                  { s: 1, title: 'Apparence', lines: [`${HAIR_STYLES.find((h) => h.id === ap.hairStyle)?.label} · visage ${ap.faceShape === 'oval' ? 'ovale' : ap.faceShape === 'round' ? 'rond' : 'carré'} · ${ap.heightClass === 'tall' ? 'grand' : ap.heightClass === 'small' ? 'petit' : 'taille moyenne'} · n°${ap.jerseyNumber}`] },
                  { s: 2, title: 'Profil sportif', lines: [`${POSITION_LABELS[id.position]}${id.secondaryPosition ? ` / ${POSITION_LABELS[id.secondaryPosition]}` : ''} · ${FEET.find((f) => f.id === id.foot)?.label} · ${archetype(id.archetype).label}`, `Qualités : ${qualities.map((q) => ATTR_LABELS[q]).join(', ')}`] },
                  { s: 3, title: 'Origines', lines: [`${background(id.background).label} · ${environment(id.environment).label}`] },
                ].map((b) => (
                  <div key={b.title} className="card flat" style={{ padding: 14 }}>
                    <div className="row between"><b>{b.title}</b><button className="btn sm ghost" onClick={() => setStep(b.s)}>✎ Modifier</button></div>
                    {b.lines.map((l) => <div key={l} className="small muted">{l}</div>)}
                  </div>
                ))}
                <div className="field">
                  <label>Emplacement de sauvegarde</label>
                  <div className="seg">
                    {saves.map((sv, i) => <button key={i} className={slot === i ? 'on' : ''} onClick={() => setSlot(i)}>Emplacement {i + 1} {sv ? '(écraser)' : '(libre)'}</button>)}
                  </div>
                </div>
                <p className="tiny dim">Une fois la carrière lancée, ton identité (nom, nationalités, origines) ne pourra plus être modifiée librement.</p>
              </div>
            )}

            <div className="row between" style={{ marginTop: 18 }}>
              <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>← Précédent</button>
              {step < STEPS.length - 1 ? (
                <button className="btn primary" disabled={!stepValid} onClick={() => setStep(step + 1)}>Suivant →</button>
              ) : (
                <button className="btn primary lg pulse" disabled={errors.length > 0} onClick={start}>Commencer la carrière ⚽</button>
              )}
            </div>
            {!stepValid && <div className="tiny orange" style={{ marginTop: 6, textAlign: 'right' }}>Renseigne prénom, nom et nationalité pour continuer.</div>}
          </div>

          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div className="center">
              <Avatar a={ap} age={startAge} size={170} />
              <div className="display" style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{id.firstName || 'Prénom'} {id.lastName || 'Nom'}</div>
              {id.nickname && <div className="small green">« {id.nickname} »</div>}
              <div className="small muted">{nat ? `${nat.flag} ${nat.name}` : 'Nationalité ?'}{id.secondNationality ? ` · ${country(id.secondNationality).flag}` : ''} · {startAge} ans · {POSITION_LABELS[id.position]}</div>
            </div>
            <div className="sep" />
            <div className="row between mb"><span className="card-title" style={{ margin: 0 }}>Niveau de départ</span><span className="display" style={{ fontSize: 22, fontWeight: 800 }}>{Math.round(ovr)}</span></div>
            {(['technique', 'passing', 'dribbling', 'shooting', 'defending', 'speed', 'reflexes'] as AttrKey[]).map((k) => (
              <StatBar key={k} label={ATTR_LABELS[k]} value={Math.round(preview[k])} max={60} />
            ))}
            <div className="tiny dim">Aperçu indicatif (légère part d’aléatoire à la création).</div>
          </div>
        </div>
      </div>
    </div>
  );
}
