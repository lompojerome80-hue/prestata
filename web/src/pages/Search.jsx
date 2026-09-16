import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import ProviderCard from '../components/ProviderCard.jsx';
import { Spinner, Empty } from '../components/Ui.jsx';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const cat = params.get('category') || '';
  const city = params.get('city') || '';
  const mode = params.get('mode') || '';
  const q = params.get('q') || '';

  const [categories, setCategories] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [cityInput, setCityInput] = useState(city);

  useEffect(() => {
    api('/api/categories').then((d) => setCategories(d.categories));
  }, []);

  useEffect(() => {
    setData(null);
    const p = new URLSearchParams();
    if (cat) p.set('category', cat);
    if (city) p.set('city', city);
    if (mode) p.set('mode', mode);
    if (q) p.set('q', q);
    api(`/api/search?${p.toString()}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [cat, city, mode, q]);

  const update = (next) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (v) p.set(k, v);
      else p.delete(k);
    });
    setParams(p);
  };

  const currentCat = categories.find((c) => c.slug === cat);

  return (
    <div className="page container">
      <div className="search-page-head">
        <h1>
          {currentCat ? (
            <>
              {currentCat.icon} {currentCat.name}
            </>
          ) : mode === 'DIGITAL' ? (
            '💻 Freelances à distance'
          ) : (
            'Tous les prestataires'
          )}
        </h1>
        <p className="muted">
          {data ? (
            <>
              {data.total} résultat{data.total > 1 ? 's' : ''}
              {city ? <> à {city}</> : ''}
            </>
          ) : (
            'Recherche…'
          )}
        </p>
      </div>

      {/* Barre de filtres */}
      <div className="filter-bar">
        <select value={cat} onChange={(e) => update({ category: e.target.value })}>
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Ville / quartier"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && update({ city: cityInput })}
        />
        <div className="seg">
          <button type="button" className={!mode ? 'on' : ''} onClick={() => update({ mode: '' })}>Tous</button>
          <button type="button" className={mode === 'DOMICILE' ? 'on' : ''} onClick={() => update({ mode: 'DOMICILE' })}>À domicile</button>
          <button type="button" className={mode === 'DIGITAL' ? 'on' : ''} onClick={() => update({ mode: 'DIGITAL' })}>À distance</button>
        </div>
      </div>

      {error ? <Empty icon="⚠️" title="Erreur" text={error} /> : null}

      {!data ? (
        <Spinner />
      ) : data.providers.length === 0 ? (
        <Empty
          icon="🔍"
          title="Aucun prestataire trouvé"
          text="Essayez d'élargir votre recherche (autre ville, ou mode « À distance »)."
        />
      ) : (
        <div className="provider-grid">
          {data.providers.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      )}
    </div>
  );
}