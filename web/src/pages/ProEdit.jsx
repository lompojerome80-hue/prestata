import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Spinner } from '../components/Ui.jsx';

const emptyExp = () => ({ title: '', company: '', city: '', startDate: '', endDate: '', current: false, description: '' });
const emptyEdu = () => ({ school: '', degree: '', field: '', startYear: '', endYear: '', current: false });

export default function ProEdit() {
  const { token, user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [sector, setSector] = useState('');
  const [website, setWebsite] = useState('');
  const [cvPublic, setCvPublic] = useState(true);
  const [experiences, setExperiences] = useState([]);
  const [educations, setEducations] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    api('/api/profiles/me', { token })
      .then((d) => {
        const p = d.profile;
        setHeadline(p.headline || '');
        setBio(p.bio || '');
        setCity(p.city || '');
        setSector(p.sector || '');
        setWebsite(p.website || '');
        setCvPublic(p.cvPublic !== false);
        setExperiences((p.experiences || []).map((e) => ({
          title: e.title,
          company: e.company,
          city: e.city || '',
          startDate: e.startDate || '',
          endDate: e.current ? '' : (e.endDate || ''),
          current: e.current,
          description: e.description || '',
        })));
        setEducations((p.educations || []).map((ed) => ({
          school: ed.school,
          degree: ed.degree || '',
          field: ed.field || '',
          startYear: ed.startYear != null ? String(ed.startYear) : '',
          endYear: ed.endYear != null ? String(ed.endYear) : '',
          current: ed.current,
        })));
        setSkills((p.skills || []).map((s) => s.name));
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoaded(true));
  }, []);

  const setExp = (i, patch) => setExperiences((list) => list.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const setEdu = (i, patch) => setEducations((list) => list.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const addSkill = () => {
    const name = skillInput.trim();
    if (!name) return;
    setSkills((list) => (list.some((s) => s.toLowerCase() === name.toLowerCase()) ? list : [...list, name]));
    setSkillInput('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api('/api/profiles/me', {
        method: 'PUT',
        token,
        body: {
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          city: city.trim() || null,
          sector: sector.trim() || null,
          website: website.trim() || null,
          cvPublic,
          experiences: experiences
            .filter((e) => e.title && e.company && e.startDate)
            .map((e) => ({
              title: e.title,
              company: e.company,
              city: e.city.trim() || null,
              startDate: e.startDate,
              endDate: e.current ? null : (e.endDate || null),
              current: e.current,
              description: e.description.trim() || null,
            })),
          educations: educations
            .filter((e) => e.school)
            .map((e) => ({
              school: e.school,
              degree: e.degree.trim() || null,
              field: e.field.trim() || null,
              startYear: e.startYear ? Number(e.startYear) : null,
              endYear: e.current ? null : (e.endYear ? Number(e.endYear) : null),
              current: e.current,
            })),
          skills,
        },
      });
      setSaved(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="page"><Spinner /></div>;

  return (
    <div className="page container narrow">
      <h1>Mon profil professionnel</h1>
      <p className="muted">Complétez votre profil « type CV » : c'est ce que les recruteurs et clients verront.</p>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {saved ? <Alert tone="success">✅ Profil enregistré. <Link to={`/profil/${user?.id}`}>Voir mon profil public</Link></Alert> : null}

      <section className="section-box">
        <h2>Informations de base</h2>
        <div className="form">
          <label>Poste actuel / titre professionnel
            <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Ex : Développeur Web full-stack, Plombier senior…" maxLength={150} />
          </label>
          <div className="grid-2">
            <label>Secteur d'activité
              <input type="text" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Ex : BTP, Numérique, Santé…" maxLength={80} />
            </label>
            <label>Ville
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex : Cotonou" maxLength={80} />
            </label>
          </div>
          <label>Site web / portfolio
            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" maxLength={200} />
          </label>
          <label>À propos (visible publiquement)
            <textarea rows={5} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Présentez votre parcours, vos atouts, vos objectifs…" maxLength={5000} />
          </label>
          <label className="check">
            <input type="checkbox" checked={cvPublic} onChange={(e) => setCvPublic(e.target.checked)} />
            Profil public : visible par tous (décoché = profil masqué, seulement pour vous)
          </label>
        </div>
      </section>

      <section className="section-box">
        <h2>Expériences professionnelles</h2>
        {experiences.length === 0 ? <p className="muted">Aucune expérience ajoutée.</p> : null}
        <div className="pro-edit-list">
          {experiences.map((e, i) => (
            <div key={i} className="exp-card">
              <div className="grid-2">
                <label>Intitulé du poste
                  <input type="text" value={e.title} onChange={(ev) => setExp(i, { title: ev.target.value })} />
                </label>
                <label>Entreprise / organisation
                  <input type="text" value={e.company} onChange={(ev) => setExp(i, { company: ev.target.value })} />
                </label>
              </div>
              <label>Ville
                <input type="text" value={e.city} onChange={(ev) => setExp(i, { city: ev.target.value })} />
              </label>
              <div className="grid-2">
                <label>Début
                  <input type="month" value={e.startDate} onChange={(ev) => setExp(i, { startDate: ev.target.value })} />
                </label>
                <label>Fin
                  <input type="month" value={e.current ? '' : e.endDate} disabled={e.current} onChange={(ev) => setExp(i, { endDate: ev.target.value })} />
                </label>
              </div>
              <label className="check">
                <input type="checkbox" checked={e.current} onChange={(ev) => setExp(i, { current: ev.target.checked })} />
                Poste actuel
              </label>
              <label>Description (missions, résultats…)
                <textarea rows={2} value={e.description} onChange={(ev) => setExp(i, { description: ev.target.value })} maxLength={3000} />
              </label>
              <button type="button" className="link-btn" onClick={() => setExperiences((l) => l.filter((_, idx) => idx !== i))}>✕ Supprimer cette expérience</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-outline small" onClick={() => setExperiences((l) => [...l, emptyExp()])}>＋ Ajouter une expérience</button>
      </section>

      <section className="section-box">
        <h2>Formation</h2>
        {educations.length === 0 ? <p className="muted">Aucune formation ajoutée.</p> : null}
        <div className="pro-edit-list">
          {educations.map((ed, i) => (
            <div key={i} className="exp-card">
              <div className="grid-2">
                <label>Établissement
                  <input type="text" value={ed.school} onChange={(ev) => setEdu(i, { school: ev.target.value })} />
                </label>
                <label>Diplôme
                  <input type="text" value={ed.degree} onChange={(ev) => setEdu(i, { degree: ev.target.value })} placeholder="Ex : Master, CAP…" />
                </label>
              </div>
              <label>Domaine / filière
                <input type="text" value={ed.field} onChange={(ev) => setEdu(i, { field: ev.target.value })} />
              </label>
              <div className="grid-2">
                <label>Année de début
                  <input type="number" min="1950" max="2100" value={ed.startYear} onChange={(ev) => setEdu(i, { startYear: ev.target.value })} />
                </label>
                <label>Année de fin
                  <input type="number" min="1950" max="2100" value={ed.current ? '' : ed.endYear} disabled={ed.current} onChange={(ev) => setEdu(i, { endYear: ev.target.value })} />
                </label>
              </div>
              <label className="check">
                <input type="checkbox" checked={ed.current} onChange={(ev) => setEdu(i, { current: ev.target.checked })} />
                Formation en cours
              </label>
              <button type="button" className="link-btn" onClick={() => setEducations((l) => l.filter((_, idx) => idx !== i))}>✕ Supprimer cette formation</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-outline small" onClick={() => setEducations((l) => [...l, emptyEdu()])}>＋ Ajouter une formation</button>
      </section>

      <section className="section-box">
        <h2>Compétences</h2>
        <div className="skills-editor">
          <input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} placeholder="Ex : Gestion de projet, CSS…" />
          <button type="button" className="btn btn-outline small" onClick={addSkill}>＋ Ajouter</button>
        </div>
        {skills.length ? (
          <div className="chips" style={{ marginTop: 12 }}>
            {skills.map((s, i) => (
              <span key={i} className="chip chip-link">
                {s}
                <button type="button" className="chip-x" onClick={() => setSkills((l) => l.filter((_, idx) => idx !== i))} aria-label={`Retirer ${s}`}>✕</button>
              </span>
            ))}
          </div>
        ) : (
          <p className="muted small" style={{ marginTop: 10 }}>Ajoutez vos compétences (elles apparaissent sur votre profil et votre CV).</p>
        )}
      </section>

      <div className="form-sub">
        <button type="button" className="btn btn-primary full" disabled={saving} onClick={save}>
          {saving ? 'Enregistrement…' : '💾 Enregistrer mon profil'}
        </button>
        {user?.id ? <p className="center muted small" style={{ marginTop: 10 }}><Link to={`/profil/${user.id}`}>Voir mon profil public</Link></p> : null}
      </div>
    </div>
  );
}