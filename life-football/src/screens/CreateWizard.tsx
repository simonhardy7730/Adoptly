// Créateur de joueur : identité, apparence, profil sportif, origines, récapitulatif.
// Aperçu permanent (silhouette + caractéristiques réelles), validation par étape, impossible de sauter une étape incomplète.
import { useMemo, useState, type ReactNode } from 'react';
import { useGame } from '../store/gameStore';
import type { Appearance, AttrKey, Identity, Position, Foot } from '../game/types';
import { defaultAppearance, defaultIdentity, initialAttributes, birthYearFor, START_YEAR, POSITION_MODS, FOOT_MODS } from '../game/create';
import { COUNTRIES, LANGUAGES, country } from '../content/countries';
import { ARCHETYPES, ATTR_LABELS, BACKGROUNDS, ENVIRONMENTS, POSITION_LABELS, archetype, background, environment } from '../content/profiles';
import { possibleSecondNationalities, secondaryJustification } from '../game/eligibility';
import { CREATION_STEPS, archetypesFor, firstInvalidStep, harmonizeProfile, validateStep, type CreationDraft } from '../game/creation';
import { Avatar, PlayerFigure, ACCESSORIES, BEARDS, BOOT_COLORS, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, KIT_COLORS, KIT_PATTERNS, SKIN_TONES } from '../ui/Avatar';
import { ATTR_GROUPS } from '../content/profiles';
import { overall } from '../game/stats';
import { MONTHS } from '../game/calendar';
import { StatBar } from '../ui/kit';

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'ATT'];
const FEET: { id: Foot; label: string; desc: string }[] = [
  { id: 'right', label: 'Droitier', desc: 'Passe et frappe un peu plus sûres.' },
  { id: 'left', label: 'Gaucher', desc: 'Dribble et vision un peu plus fins.' },
  { id: 'both', label: 'Ambidextre', desc: 'Technique et frappe, mais moins de rigueur.' },
];
const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
const newSeed = () => (Math.floor(Math.random() * 2 ** 31) ^ Date.now()) | 0;

function Seg<T extends string | number>({ value, options, onChange, disabled }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; disabled?: (v: T) => boolean }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button key={String(o.id)} type="button" role="radio" aria-checked={o.id === value} className={o.id === value ? 'on' : ''} disabled={disabled?.(o.id)} style={disabled?.(o.id) ? { opacity: 0.35, cursor: 'not-allowed' } : undefined} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

function Swatches({ value, colors, onChange, label }: { value: string | number; colors: string[]; onChange: (i: number) => void; label: string }) {
  return (
    <div className="row wrap" role="radiogroup" aria-label={label}>
      {colors.map((c, i) => <button key={c} type="button" className={`swatch ${value === c || value === i ? 'on' : ''}`} style={{ background: c, borderColor: value === c || value === i ? undefined : c === '#ffffff' ? '#2f4a3e' : undefined }} onClick={() => onChange(i)} aria-label={`${label} ${i + 1}`} />)}
    </div>
  );
}

function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`} id={id}>
      <label>{label}</label>
      {children}
      {error ? <span className="field-error">⚠ {error}</span> : hint ? <span className="tiny dim">{hint}</span> : null}
    </div>
  );
}

function CountrySelect({ value, onChange, placeholder, allowEmpty, invalid }: { value: string | null; onChange: (v: string | null) => void; placeholder?: string; allowEmpty?: boolean; invalid?: boolean }) {
  return (
    <select className="input" aria-invalid={invalid} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
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
  const [draft, setDraft] = useState<CreationDraft>(() => ({ identity: defaultIdentity(), appearance: defaultAppearance(), qualities: ['technique', 'passing', 'speed'], startAge: 9, seed: newSeed() }));
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<'figure' | 'bust'>('figure');
  const freeSlot = saves.findIndex((s) => !s);
  const [slot, setSlot] = useState(freeSlot >= 0 ? freeSlot : 0);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const id = draft.identity;
  const ap = draft.appearance;
  const { qualities, startAge } = draft;

  const upd = (p: Partial<Identity>) => setDraft((d) => {
    let n = { ...d.identity, ...p };
    // Une nationalité secondaire qui n'est plus justifiée par l'histoire est retirée, avec un message.
    if (n.secondNationality && (n.secondNationality === n.nationality || !secondaryJustification(n, n.secondNationality))) {
      setNotice(`La nationalité secondaire (${country(n.secondNationality).name}) a été retirée : elle n’est plus justifiée par ton histoire.`);
      n.secondNationality = null;
    }
    n = harmonizeProfile(n);
    const q = n.position !== 'GK' ? d.qualities.filter((x) => x !== 'reflexes') : d.qualities;
    return { ...d, identity: n, qualities: q };
  });
  const updAp = (p: Partial<Appearance>) => setDraft((d) => ({ ...d, appearance: { ...d.appearance, ...p } }));

  const errors = validateStep(step, draft);
  const allErrors = validateStep(4, draft);
  const reachable = firstInvalidStep(draft);
  const show = (k: string) => (attempted[step] ? errors[k] : undefined);
  const preview = useMemo(() => initialAttributes({ rng: draft.seed }, { identity: id, appearance: ap, qualities, startAge }), [draft.seed, id, ap, qualities, startAge]);
  const ovr = overall(preview, id.position);
  const secondOptions = possibleSecondNationalities(id);
  const nat = id.nationality ? country(id.nationality) : null;
  const allowedArch = archetypesFor(id.position);

  const toggleQuality = (k: AttrKey) => setDraft((d) => {
    const q = d.qualities.includes(k) ? d.qualities.filter((x) => x !== k) : d.qualities.length >= 3 ? d.qualities : [...d.qualities, k];
    return { ...d, qualities: q };
  });

  const next = () => {
    if (Object.keys(errors).length) {
      setAttempted((a) => ({ ...a, [step]: true }));
      return;
    }
    setStep(step + 1);
  };

  const start = () => {
    if (Object.keys(allErrors).length) {
      setAttempted({ 0: true, 1: true, 2: true, 3: true, 4: true });
      return;
    }
    if (saves[slot] && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    newGame({ identity: { ...id, firstName: id.firstName.trim(), lastName: id.lastName.trim(), nickname: id.nickname.trim(), birthYear: birthYearFor(startAge, id.birthMonth) }, appearance: ap, qualities, startAge, seed: draft.seed }, slot);
  };

  // Ce qui influence les caractéristiques de départ (affiché pour que le joueur comprenne ses choix).
  const influences: { label: string; mods: Partial<Record<AttrKey, number>> }[] = [
    { label: `Poste : ${POSITION_LABELS[id.position]}`, mods: POSITION_MODS[id.position] },
    { label: `Pied : ${FEET.find((f) => f.id === id.foot)!.label}`, mods: FOOT_MODS[id.foot] },
    { label: `Profil : ${archetype(id.archetype).label}`, mods: archetype(id.archetype).bonus },
    { label: 'Qualités', mods: Object.fromEntries(qualities.map((q) => [q, 4])) },
  ];

  return (
    <div className="fullscreen">
      <div className="inner">
        <div className="row between mb">
          <div className="row">
            <div className="brand-logo">LF</div>
            <div>
              <div className="display" style={{ fontSize: 24, fontWeight: 800 }}>Créer ton joueur</div>
              <div className="small muted">Étape {step + 1}/{CREATION_STEPS.length} · {CREATION_STEPS[step]}</div>
            </div>
          </div>
          <button className="btn ghost sm" onClick={goMenu}>✕ Retour au menu</button>
        </div>
        <div className="tabs" role="tablist">
          {CREATION_STEPS.map((s, i) => {
            const ok = i < step && Object.keys(validateStep(i, draft)).length === 0;
            const locked = i > reachable && i > step;
            return (
              <button key={s} role="tab" aria-selected={i === step} className={i === step ? 'on' : ''} disabled={locked} title={locked ? 'Complète d’abord les étapes précédentes' : ''} style={locked ? { opacity: 0.4, cursor: 'not-allowed' } : undefined} onClick={() => !locked && setStep(i)}>
                {ok ? '✓' : `${i + 1}.`} {s}
              </button>
            );
          })}
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 320px', alignItems: 'start' }}>
          <div className="card fade-in" key={step}>
            {step === 0 && (
              <div className="grid g2">
                <Field label="Prénom *" error={show('firstName')}><input className="input" aria-invalid={!!show('firstName')} value={id.firstName} maxLength={24} onChange={(e) => upd({ firstName: e.target.value })} placeholder="Ex. Samir" /></Field>
                <Field label="Nom *" error={show('lastName')}><input className="input" aria-invalid={!!show('lastName')} value={id.lastName} maxLength={24} onChange={(e) => upd({ lastName: e.target.value })} placeholder="Ex. Delcourt" /></Field>
                <Field label="Surnom (facultatif)" error={show('nickname')} hint="Ce que crieront les supporters."><input className="input" value={id.nickname} maxLength={20} onChange={(e) => upd({ nickname: e.target.value })} placeholder="Ex. La Fusée" /></Field>
                <Field label="Âge au début de l’histoire" hint="Plus tôt = plus de temps pour progresser, mais un niveau de départ plus bas.">
                  <Seg value={startAge} options={[8, 9, 10].map((a) => ({ id: a, label: `${a} ans` }))} onChange={(v) => setDraft((d) => ({ ...d, startAge: v }))} />
                </Field>
                <Field label="Mois de naissance" hint={`Né(e) en ${MONTHS[id.birthMonth - 1]} ${birthYearFor(startAge, id.birthMonth)} · saison de départ ${START_YEAR}-${START_YEAR + 1}`}>
                  <select className="input" value={id.birthMonth} onChange={(e) => upd({ birthMonth: Number(e.target.value) })}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Nationalité principale *" error={show('nationality')} hint="Elle détermine ta sélection nationale principale.">
                  <CountrySelect invalid={!!show('nationality')} value={id.nationality || null} onChange={(v) => upd({ nationality: v ?? '' })} placeholder="— Choisis ta nationalité —" />
                </Field>
                <Field label="Pays de naissance" error={show('birthCountry')}>
                  <CountrySelect value={id.birthCountry} onChange={(v) => v && upd({ birthCountry: v, birthCity: country(v).cities[0] })} />
                </Field>
                <Field label="Ville de naissance" error={show('birthCity')}>
                  <select className="input" value={id.birthCity} onChange={(e) => upd({ birthCity: e.target.value })}>
                    {country(id.birthCountry).cities.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Pays où il grandit" error={show('growUpCountry')} hint="C’est là que se trouvent tes clubs, tes détections et ta vie quotidienne.">
                  <CountrySelect value={id.growUpCountry} onChange={(v) => v && upd({ growUpCountry: v, language: country(v).languages[0] })} />
                </Field>
                <Field label="Origine d’un parent (facultatif)" hint="Une histoire familiale peut ouvrir une seconde nationalité.">
                  <CountrySelect value={id.parentOrigin} onChange={(v) => upd({ parentOrigin: v })} placeholder="Même origine / non précisée" allowEmpty />
                </Field>
                <Field label="Nationalité secondaire (facultatif)" error={show('secondNationality')} hint={secondOptions.length ? 'Proposée car justifiée par ton histoire.' : 'Indique un pays de naissance, une origine parentale ou un pays de résidence différent pour débloquer une double nationalité.'}>
                  <select className="input" value={id.secondNationality ?? ''} onChange={(e) => { setNotice(null); upd({ secondNationality: e.target.value || null }); }} disabled={!secondOptions.length}>
                    <option value="">Aucune</option>
                    {secondOptions.map((c) => <option key={c} value={c}>{country(c).flag} {country(c).name} — {secondaryJustification(id, c)}</option>)}
                  </select>
                </Field>
                <Field label="Langue principale" error={show('language')}>
                  <select className="input" value={id.language} onChange={(e) => upd({ language: e.target.value })}>
                    {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </Field>
                {notice && <div className="pill gold span2" style={{ whiteSpace: 'normal' }}>{notice}</div>}
              </div>
            )}

            {step === 1 && (
              <div className="col" style={{ gap: 14 }}>
                <div className="card-title">Visage</div>
                <div className="grid g2">
                  <Field label="Teint de peau"><Swatches label="Teint" value={ap.skin} colors={SKIN_TONES} onChange={(i) => updAp({ skin: i })} /></Field>
                  <Field label="Couleur des yeux"><Swatches label="Yeux" value={ap.eyeColor} colors={EYE_COLORS} onChange={(i) => updAp({ eyeColor: EYE_COLORS[i] })} /></Field>
                  <Field label="Forme du visage"><Seg value={ap.faceShape} options={[{ id: 'oval', label: 'Ovale' }, { id: 'round', label: 'Rond' }, { id: 'square', label: 'Carré' }]} onChange={(v) => updAp({ faceShape: v })} /></Field>
                  <Field label="Barbe" hint="Visible à partir de 16 ans."><Seg value={ap.beard} options={BEARDS} onChange={(v) => updAp({ beard: v })} /></Field>
                </div>
                <Field label="Coiffure" error={show('hairStyle')}><Seg value={ap.hairStyle} options={HAIR_STYLES} onChange={(v) => updAp({ hairStyle: v })} /></Field>
                <Field label="Couleur des cheveux"><Swatches label="Cheveux" value={ap.hairColor} colors={HAIR_COLORS} onChange={(i) => updAp({ hairColor: HAIR_COLORS[i] })} /></Field>
                <div className="card-title">Morphologie</div>
                <div className="grid g2">
                  <Field label="Taille (projection adulte)" hint="Petit : +vitesse, −force. Grand : +force, jeu aérien."><Seg value={ap.heightClass} options={[{ id: 'small', label: 'Petit' }, { id: 'medium', label: 'Moyen' }, { id: 'tall', label: 'Grand' }]} onChange={(v) => updAp({ heightClass: v })} /></Field>
                  <Field label="Corpulence" hint="Fine : vitesse, endurance. Puissante : force."><Seg value={ap.build} options={[{ id: 'slim', label: 'Fine' }, { id: 'normal', label: 'Normale' }, { id: 'strong', label: 'Puissante' }]} onChange={(v) => updAp({ build: v })} /></Field>
                </div>
                <div className="card-title">Équipement</div>
                <div className="grid g2">
                  <Field label="Couleur principale du maillot"><Swatches label="Maillot" value={ap.kitColor} colors={KIT_COLORS} onChange={(i) => updAp({ kitColor: KIT_COLORS[i] })} /></Field>
                  <Field label="Couleur secondaire"><Swatches label="Couleur secondaire" value={ap.kitColor2} colors={KIT_COLORS} onChange={(i) => updAp({ kitColor2: KIT_COLORS[i] })} /></Field>
                  <Field label="Motif" error={show('kitPattern')}><Seg value={ap.kitPattern} options={KIT_PATTERNS} onChange={(v) => updAp({ kitPattern: v })} /></Field>
                  <Field label="Numéro de maillot préféré" error={show('jerseyNumber')}><input className="input" type="number" min={1} max={99} aria-invalid={!!show('jerseyNumber')} value={Number.isNaN(ap.jerseyNumber) ? '' : ap.jerseyNumber} onChange={(e) => updAp({ jerseyNumber: e.target.value === '' ? NaN : Math.trunc(Number(e.target.value)) })} /></Field>
                  <Field label="Couleur des crampons" hint="Purement esthétique : tu achèteras de vrais crampons en jeu."><Swatches label="Crampons" value={ap.bootsColor} colors={BOOT_COLORS} onChange={(i) => updAp({ bootsColor: BOOT_COLORS[i] })} /></Field>
                  <Field label="Accessoire"><Seg value={ap.accessory} options={ACCESSORIES} onChange={(v) => updAp({ accessory: v })} /></Field>
                </div>
                <div className="row" style={{ gap: 18, alignItems: 'flex-end' }}>
                  {[startAge, 15, 22].map((a) => (
                    <div key={a} className="center">
                      <PlayerFigure a={ap} age={a} height={150} position={id.position} />
                      <div className="tiny muted">{a} ans</div>
                    </div>
                  ))}
                  <span className="small muted">Ta silhouette grandit avec toi. Le maillot de ton club remplacera ces couleurs quand tu signeras.</span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="col" style={{ gap: 14 }}>
                <div className="grid g2">
                  <Field label="Poste principal *" error={show('position')} hint="Influence directement tes caractéristiques et les épreuves de détection."><Seg value={id.position} options={POSITIONS.map((p) => ({ id: p, label: POSITION_LABELS[p] }))} onChange={(v) => upd({ position: v })} /></Field>
                  <Field label="Poste secondaire" error={show('secondaryPosition')} hint={id.position === 'GK' ? 'Un gardien ne peut dépanner qu’en défense.' : undefined}>
                    <Seg value={id.secondaryPosition ?? 'none'} options={[{ id: 'none', label: 'Aucun' }, ...POSITIONS.filter((p) => p !== id.position).map((p) => ({ id: p, label: POSITION_LABELS[p] }))]} disabled={(v) => id.position === 'GK' && v !== 'none' && v !== 'DEF'} onChange={(v) => upd({ secondaryPosition: v === 'none' ? null : (v as Position) })} />
                  </Field>
                </div>
                <Field label="Pied fort">
                  <div className="grid g3">
                    {FEET.map((f) => <button key={f.id} type="button" className={`pick-card ${id.foot === f.id ? 'on' : ''}`} onClick={() => upd({ foot: f.id })}><b>{f.label}</b><div className="tiny muted">{f.desc}</div></button>)}
                  </div>
                </Field>
                <Field label="Profil sportif *" error={show('archetype')}>
                  <div className="grid g3">
                    {ARCHETYPES.map((a) => {
                      const ok = allowedArch.includes(a.id);
                      return (
                        <button key={a.id} type="button" disabled={!ok} className={`pick-card ${id.archetype === a.id ? 'on' : ''}`} style={!ok ? { opacity: 0.35, cursor: 'not-allowed' } : undefined} onClick={() => upd({ archetype: a.id })}>
                          <div style={{ fontSize: 20 }}>{a.icon}</div>
                          <div style={{ fontWeight: 700 }}>{a.label}</div>
                          <div className="tiny muted">{a.description}</div>
                          {!ok && <div className="tiny orange" style={{ marginTop: 4 }}>{a.id === 'keeper' ? 'Réservé aux gardiens' : 'Indisponible pour un gardien'}</div>}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label={`Tes 3 premières qualités (${qualities.length}/3) *`} error={show('qualities')} hint="+4 dans chaque qualité choisie. Clique à nouveau pour retirer.">
                  <div className="seg">
                    {(Object.keys(ATTR_LABELS) as AttrKey[]).filter((k) => k !== 'reflexes' || id.position === 'GK').map((k) => {
                      const on = qualities.includes(k);
                      return <button key={k} type="button" className={on ? 'on' : ''} disabled={!on && qualities.length >= 3} style={!on && qualities.length >= 3 ? { opacity: 0.4 } : undefined} onClick={() => toggleQuality(k)}>{ATTR_LABELS[k]}</button>;
                    })}
                  </div>
                </Field>
                <div className="card flat" style={{ padding: 12 }}>
                  <div className="row between"><b className="small">Variation naturelle</b><button type="button" className="btn sm" onClick={() => setDraft((d) => ({ ...d, seed: newSeed() }))}>🎲 Relancer</button></div>
                  <div className="tiny muted">Une légère variation aléatoire, équilibrée (le total reste identique), rend chaque joueur unique. L’aperçu à droite correspond exactement au joueur qui sera créé.</div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="col" style={{ gap: 16 }}>
                <Field label="Milieu familial *" error={show('background')}>
                  <div className="grid g2">
                    {BACKGROUNDS.map((b) => (
                      <button key={b.id} type="button" className={`pick-card ${id.background === b.id ? 'on' : ''}`} onClick={() => upd({ background: b.id })}>
                        <div className="row"><span style={{ fontSize: 20 }}>{b.icon}</span><b>{b.label}</b></div>
                        <div className="tiny muted" style={{ margin: '4px 0 6px' }}>{b.description}</div>
                        <div className="tiny green">{b.pros.map((p) => `＋ ${p}`).join('  ')}</div>
                        <div className="tiny red" style={{ marginTop: 3 }}>{b.cons.map((p) => `－ ${p}`).join('  ')}</div>
                        <div className="tiny dim" style={{ marginTop: 4 }}>Argent de poche : {b.pocketMoney} €/sem. · Départ : {b.startMoney} €{b.slotMod ? ` · ${b.slotMod} action/sem.` : ''}</div>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Environnement *" error={show('environment')}>
                  <div className="grid g3">
                    {ENVIRONMENTS.map((e) => (
                      <button key={e.id} type="button" className={`pick-card ${id.environment === e.id ? 'on' : ''}`} onClick={() => upd({ environment: e.id })}>
                        <div className="row"><span style={{ fontSize: 20 }}>{e.icon}</span><b>{e.label}</b></div>
                        <div className="tiny muted">{e.description}</div>
                      </button>
                    ))}
                  </div>
                </Field>
                <p className="tiny dim">Ces choix décident de ta famille, de ton argent, de tes premiers événements et de la distance qui te sépare des clubs. Ton histoire commencera par un prologue où tu les découvriras.</p>
              </div>
            )}

            {step === 4 && (
              <div className="col">
                {Object.keys(allErrors).length > 0 && (
                  <div className="card flat" style={{ borderColor: 'var(--red)' }}>
                    {Object.values(allErrors).map((e) => <div key={e} className="small red">⚠ {e}</div>)}
                  </div>
                )}
                {[
                  { s: 0, title: 'Identité', lines: [`${id.firstName || '—'} ${id.lastName || '—'}${id.nickname ? ` « ${id.nickname} »` : ''}, ${startAge} ans`, `Nationalité : ${nat ? `${nat.flag} ${nat.name}` : '—'}${id.secondNationality ? ` + ${country(id.secondNationality).flag} ${country(id.secondNationality).name}` : ''}`, `Né à ${id.birthCity} (${country(id.birthCountry).name}) · grandit en ${country(id.growUpCountry).name} · ${id.language}`] },
                  { s: 1, title: 'Apparence', lines: [`${HAIR_STYLES.find((h) => h.id === ap.hairStyle)?.label} · visage ${ap.faceShape === 'oval' ? 'ovale' : ap.faceShape === 'round' ? 'rond' : 'carré'} · ${ap.heightClass === 'tall' ? 'grand' : ap.heightClass === 'small' ? 'petit' : 'taille moyenne'} · corpulence ${ap.build === 'slim' ? 'fine' : ap.build === 'strong' ? 'puissante' : 'normale'}`, `Maillot ${KIT_PATTERNS.find((k) => k.id === ap.kitPattern)?.label.toLowerCase()} n°${Number.isNaN(ap.jerseyNumber) ? '?' : ap.jerseyNumber} · accessoire : ${ACCESSORIES.find((x) => x.id === ap.accessory)?.label.toLowerCase()}`] },
                  { s: 2, title: 'Profil sportif', lines: [`${POSITION_LABELS[id.position]}${id.secondaryPosition ? ` / ${POSITION_LABELS[id.secondaryPosition]}` : ''} · ${FEET.find((f) => f.id === id.foot)?.label} · ${archetype(id.archetype).label}`, `Qualités : ${qualities.map((q) => ATTR_LABELS[q]).join(', ') || '—'}`] },
                  { s: 3, title: 'Origines', lines: [`${background(id.background).label} · ${environment(id.environment).label}`] },
                ].map((b) => {
                  const bad = Object.keys(validateStep(b.s, draft)).length > 0;
                  return (
                    <div key={b.title} className="card flat" style={{ padding: 14, borderColor: bad ? 'var(--red)' : undefined }}>
                      <div className="row between"><b>{bad ? '⚠' : '✓'} {b.title}</b><button type="button" className="btn sm ghost" onClick={() => setStep(b.s)}>✎ Modifier</button></div>
                      {b.lines.map((l) => <div key={l} className="small muted">{l}</div>)}
                    </div>
                  );
                })}
                <Field label="Emplacement de sauvegarde">
                  <div className="seg">
                    {saves.map((sv, i) => <button key={i} type="button" className={slot === i ? 'on' : ''} onClick={() => { setSlot(i); setConfirmOverwrite(false); }}>Emplacement {i + 1} {sv ? `(écraser ${sv.name})` : '(libre)'}</button>)}
                  </div>
                </Field>
                {confirmOverwrite && <div className="pill red" style={{ whiteSpace: 'normal' }}>L’emplacement {slot + 1} contient déjà la partie de {saves[slot]?.name}. Clique à nouveau sur « Commencer » pour l’écraser définitivement.</div>}
                <p className="tiny dim">Une fois la carrière lancée, ton identité (nom, nationalités, origines) ne pourra plus être modifiée.</p>
              </div>
            )}

            <div className="row between" style={{ marginTop: 18 }}>
              <button type="button" className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>← Précédent</button>
              {step < 4 ? (
                <button type="button" className="btn primary" onClick={next}>Suivant →</button>
              ) : (
                <button type="button" className="btn primary lg pulse" onClick={start}>{confirmOverwrite ? 'Écraser et commencer' : 'Commencer la carrière ⚽'}</button>
              )}
            </div>
            {attempted[step] && Object.keys(errors).length > 0 && <div className="small red" style={{ marginTop: 8, textAlign: 'right' }}>Complète les champs signalés pour passer à l’étape suivante.</div>}
          </div>

          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div className="row between"><span className="card-title" style={{ margin: 0 }}>Aperçu</span>
              <div className="seg"><button type="button" className={view === 'figure' ? 'on' : ''} onClick={() => setView('figure')}>Silhouette</button><button type="button" className={view === 'bust' ? 'on' : ''} onClick={() => setView('bust')}>Portrait</button></div>
            </div>
            <div className="center" style={{ minHeight: 230 }}>
              {view === 'figure' ? <PlayerFigure a={ap} age={startAge} height={230} position={id.position} /> : <Avatar a={ap} age={startAge} size={190} />}
            </div>
            <div className="center">
              <div className="display" style={{ fontSize: 22, fontWeight: 800 }}>{id.firstName || 'Prénom'} {id.lastName || 'Nom'}</div>
              {id.nickname && <div className="small green">« {id.nickname} »</div>}
              <div className="small muted">{nat ? `${nat.flag} ${nat.name}` : 'Nationalité ?'}{id.secondNationality ? ` · ${country(id.secondNationality).flag}` : ''} · {startAge} ans · {POSITION_LABELS[id.position]}</div>
            </div>
            <div className="sep" />
            <div className="row between mb"><span className="card-title" style={{ margin: 0 }}>Niveau de départ</span><span className="display" style={{ fontSize: 24, fontWeight: 800 }}>{Math.round(ovr)}</span></div>
            {ATTR_GROUPS.map((gr) => (
              <div key={gr.label}>
                {gr.keys.filter((k) => k !== 'reflexes' || id.position === 'GK').map((k) => <StatBar key={k} label={ATTR_LABELS[k]} value={Math.round(preview[k])} max={60} />)}
              </div>
            ))}
            <details className="tiny muted">
              <summary style={{ cursor: 'pointer' }}>D’où viennent ces valeurs ?</summary>
              <div className="col" style={{ gap: 4, marginTop: 6 }}>
                <div>Base selon l’âge ({startAge} ans) + variation équilibrée.</div>
                {influences.map((inf) => <div key={inf.label}><b>{inf.label}</b> : {Object.entries(inf.mods).filter(([, v]) => v).map(([k, v]) => `${ATTR_LABELS[k as AttrKey]} ${v! > 0 ? '+' : ''}${v}`).join(', ') || '—'}</div>)}
                <div><b>Origines et morphologie</b> : effets visibles en changeant ces options.</div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
