import { Alert } from '../components/Ui.jsx';

function Block({ title, items }) {
  return (
    <section className="section-box">
      <h2>{title}</h2>
      {items.map((p, i) => (
        <p key={i} className="legal-p">{p}</p>
      ))}
    </section>
  );
}

const CONTENT = {
  legal: {
    title: 'Mentions légales',
    intro: 'Informations relatives à l’éditeur du site Prestata.',
    blocks: [
      {
        title: 'Éditeur',
        items: [
          'Le site Prestata est édité par [À COMPLÉTER — raison sociale, forme juridique, siège social, n° SIREN/RCCM].',
          'Adresse postale : [À COMPLÉTER].',
          'Contact : [À COMPLÉTER — e-mail] — Pour toute question, écrivez-nous depuis la page de contact.',
        ],
      },
      {
        title: 'Direction de la publication',
        items: [
          'Directeur de la publication : [À COMPLÉTER — prénom et nom].',
        ],
      },
      {
        title: 'Hébergement',
        items: [
          'Le site est hébergé par Render (prestata.onrender.com) — 525 Braman Street, San Francisco, CA 94107, États-Unis.',
          'La base de données est hébergée par Neon Inc. (données situées sur des serveurs sécurisés, chiffrées en transit).',
        ],
      },
      {
        title: 'Propriété intellectuelle',
        items: [
          'L’ensemble des éléments du site Prestata (textes, logos, interface) est protégé par les droits de propriété intellectuelle. Toute reproduction sans autorisation est interdite.',
          'Les contenus publiés par les utilisateurs (profils, devis, offres d’emploi, avis) relèvent de la seule responsabilité de leurs auteurs.',
        ],
      },
    ],
  },
  terms: {
    title: "Conditions générales d'utilisation",
    intro: 'En accédant au site Prestata, vous acceptez les présentes conditions.',
    blocks: [
      {
        title: '1. Objet',
        items: [
          'Prestata est une plateforme de mise en relation entre clients et prestataires (artisans, freelances) et propose également une bourse d’emploi où les utilisateurs peuvent publier des offres et y candidater.',
          'Prestata ne fournit pas lui-même les prestations : il met en relation, sans intervenir dans l’exécution des travaux ou des contrats.',
        ],
      },
      {
        title: '2. Compte',
        items: [
          'La création d’un compte nécessite un numéro de téléphone valide. Une partie des fonctions (publier une offre, postuler, envoyer une demande) exige un numéro confirmé.',
          'Vous êtes responsable de la confidentialité de votre mot de passe. Toute activité réalisée depuis votre compte est réputée être la vôtre.',
          'Les fausses informations, usurpations et messages abusifs peuvent entraîner la suspension du compte.',
        ],
      },
      {
        title: '3. Mise en relation (services)',
        items: [
          'Le client décrit son besoin et peut recevoir des devis. L’acceptation d’un devis crée une prestation entre le client et le prestataire.',
          'Le paiement en ligne (Orange Money / Moov Money) s’effectue directement, sans escrow. Les parties restent responsables du bon déroulement de la prestation.',
          'Un avis est demandé après chaque prestation payée pour garantir la fiabilité de la communauté.',
        ],
      },
      {
        title: '4. Offres d’emploi',
        items: [
          'Tout utilisateur confirmé peut publier une offre d’emploi. Le contenu doit être exact et ne pas être discriminatoire ni contraire à la loi.',
          'Les candidatures sont transmises à l’auteur de l’offre. Un utilisateur ne peut pas postuler à sa propre offre.',
          'L’auteur de l’offre est seul responsable du recrutement et des informations publiées.',
        ],
      },
      {
        title: '5. Responsabilités',
        items: [
          'Prestata met en œuvre les moyens nécessaires au bon fonctionnement du service mais ne peut garantir l’absence de défaillance technique, ni être tenu responsable des litiges entre utilisateurs.',
          'L’utilisateur s’engage à ne pas diffuser de contenus illicites, frauduleux ou portant atteinte aux droits des tiers.',
        ],
      },
      {
        title: '6. Modifications',
        items: [
          'Les présentes conditions peuvent évoluer. La version applicable est celle en ligne au moment de l’utilisation du service.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Politique de confidentialité',
    intro: 'Comment Prestata collecte, utilise et protège vos données personnelles.',
    blocks: [
      {
        title: '1. Données collectées',
        items: [
          'Nom, numéro de téléphone, mot de passe (chiffré), données de profil prestataire (compétences, ville, tarifs), contenu des demandes, messages, candidatures et paiements.',
          'Les éventuelles photos envoyées sont stockées dans la base de données (format image), jamais vendues.',
        ],
      },
      {
        title: '2. Finalités',
        items: [
          'Créer et sécuriser votre compte (confirmation par SMS), vous mettre en relation avec d’autres utilisateurs, gérer les offres et candidatures, traiter les paiements, détecter les fraudes et améliorer le service.',
        ],
      },
      {
        title: '3. Base légale et partage',
        items: [
          'Les données sont traitées sur la base de votre consentement et de l’exécution du contrat (création de compte, mise en relation).',
          'Vos données ne sont jamais vendues. Elles peuvent être transmises aux prestataires techniques (hébergement, SMS, paiement) strictement pour fournir le service.',
          'Votre numéro de téléphone n’est communiqué aux autres utilisateurs que lorsque c’est nécessaire à la mise en relation (devis accepté, candidature).',
        ],
      },
      {
        title: '4. Durée de conservation',
        items: [
          'Votre compte est conservé tant qu’il est actif. Vous pouvez demander sa suppression à tout moment.',
          'Certaines données (paiements, avis) sont conservées pour des raisons légales et de sécurité.',
        ],
      },
      {
        title: '5. Vos droits',
        items: [
          'Vous disposez d’un droit d’accès, de rectification, d’opposition, de limitation et de suppression de vos données, à exercer en écrivant à [À COMPLÉTER — e-mail du responsable des données].',
          'Vous pouvez demander la portabilité de vos données ainsi que la clôture de votre compte à tout moment.',
        ],
      },
      {
        title: '6. Sécurité',
        items: [
          'Le site est servi en HTTPS, les mots de passe sont hachés, et des mesures de protection (limitation des requêtes, journalisation) limitent les abus.',
          'Nous ne pouvons garantir une sécurité absolue ; utilisez un mot de passe fort et ne le partagez jamais.',
        ],
      },
      {
        title: '7. Contact',
        items: [
          'Pour toute question relative à vos données : [À COMPLÉTER — e-mail].',
        ],
      },
    ],
  },
};

export default function Legal({ page }) {
  const c = CONTENT[page] || CONTENT.legal;
  return (
    <div className="page container narrow">
      <h1>{c.title}</h1>
      <p className="muted" style={{ marginTop: -4 }}>{c.intro}</p>
      <Alert tone="warning">
        ⚠️ Les mentions <code>[À COMPLÉTER]</code> (identité légale, e-mail de contact) doivent être remplacées par
        les informations réelles de votre entreprise avant mise en service publique.
      </Alert>
      {c.blocks.map((b) => (
        <Block key={b.title} title={b.title} items={b.items} />
      ))}
    </div>
  );
}