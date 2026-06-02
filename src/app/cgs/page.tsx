import { LegalPageWrapper } from "@/components/legal/legal-page-wrapper";
import { BRAND } from "@/lib/constants";

export default function CGSPage() {
  return (
    <LegalPageWrapper title="Conditions Generales de Vente et d'Utilisation" lastUpdated="1er janvier 2025">
      <h2>1. Objet</h2>
      <p>
        Les presentes Conditions Generales de Vente et d&apos;Utilisation (ci-apres &quot;CGV&quot;)
        ont pour objet de definir les conditions dans lesquelles {BRAND.company.name}{" "}
        {BRAND.company.legalForm} met a disposition de ses clients la plateforme{" "}
        {BRAND.name}.
      </p>
      <p>
        La plateforme {BRAND.name} est une solution SaaS multi-locataires destinee a
        la billetterie numerique, au suivi de colis, a l&apos;affichage gare et a la
        gestion operationnelle des societes de transport en Afrique.
      </p>
      <p>
        Toute utilisation de la plateforme implique l&apos;acceptation sans reserve des
        presentes CGV.
      </p>

      <h2>2. Inscription</h2>
      <p>
        L&apos;acces a la plateforme {BRAND.name} est conditionne par la creation d&apos;un
        compte. L&apos;inscription implique la fourniture d&apos;informations exactes et
        a jour.
      </p>
      <p>
        {BRAND.name} fonctionne sur un modele multi-locataires. Chaque transporteur
        dispose d&apos;un espace isole (tenant) garantissant la confidentialite et
        l&apos;independance de ses donnees.
      </p>
      <p>
        L&apos;administrateur du compte est responsable de :
      </p>
      <ul>
        <li>La gestion des utilisateurs au sein de son organisation</li>
        <li>La verification des informations saisies par son equipe</li>
        <li>La securite de ses identifiants de connexion</li>
        <li>Le respect des reglementations locales de transport</li>
      </ul>

      <h2>3. Services</h2>
      <p>
        La plateforme {BRAND.name} propose les services suivants :
      </p>
      <ul>
        <li>
          <strong>Billetterie numerique :</strong> generation de billets pre-imprimes,
          activation au guichet, controle QR par les controleurs, reprogrammation
        </li>
        <li>
          <strong>Gestion des colis :</strong> enregistrement au guichet, suivi en temps
          reel, livraison avec code PIN securise, confirmation par l&apos;administrateur
        </li>
        <li>
          <strong>Affichage gare :</strong> ecran d&apos;affichage temps reel des departs,
          messages d&apos;information, Priorisation des urgences
        </li>
        <li>
          <strong>PWA hors-ligne :</strong> application mobile progressive permettant le
          fonctionnement sans connexion internet, synchronisation automatique
        </li>
        <li>
          <strong>Rapports et statistiques :</strong> tableaux de bord, export PDF/CSV,
          indicateurs de performance, suivi des ventes
        </li>
      </ul>

      <h2>4. Tarification</h2>
      <p>
        Les tarifs de la plateforme {BRAND.name} sont exprimes en{" "}
        {BRAND.currency} (Francs CFA). Les conditions tarifaires sont communiquees
        lors de la souscription et peuvent etre revues annuellement.
      </p>
      <p>
        La facturation est realisee selon les conditions prevues au contrat de
        souscription. Le reglement s&apos;effectue par virement bancaire ou mobile money.
      </p>
      <p>
        Tout retard de paiement peut entrainer la suspension temporaire de l&apos;acces a
        la plateforme apres notification.
      </p>

      <h2>5. Obligations de l&apos;utilisateur</h2>
      <p>L&apos;utilisateur s&apos;engage a :</p>
      <ul>
        <li>
          Fournir des donnees exactes, a jour et conformes a la reglementation
          lors de l&apos;enregistrement des passagers et des colis
        </li>
        <li>
          Se conformer aux reglementations locales en matiere de transport de
          voyageurs et de marchandises
        </li>
        <li>
          Ne pas utiliser la plateforme a des fins illicit, frauduleuses ou
          contraires a l&apos;ordre public
        </li>
        <li>
          Ne pas tenter d&apos;acceder aux donnees d&apos;un autre transporteur (tenant)
        </li>
        <li>
          Informer immediatement {BRAND.name} de toute utilisation non autorisee
          de son compte
        </li>
        <li>
          Respecter les conditions de transport propres a chaque ligne et trajet
        </li>
      </ul>

      <h2>6. Responsabilite</h2>
      <p>
        {BRAND.company.name} {BRAND.company.legalForm} fournit une plateforme de
        gestion et de billetterie numerique. A ce titre :
      </p>
      <ul>
        <li>
          {BRAND.name} n&apos;est pas transporteur et ne saurait etre tenu responsable
          des retards, annulations ou incidents de transport lies a des causes
          externes (intemperies, etat des routes, grves, etc.)
        </li>
        <li>
          {BRAND.name} ne peut etre tenu responsable en cas de force majeure
          definie conformement a l&apos;article 1243 du Code des Obligations Civiles et
          Commerciales du Senegal
        </li>
        <li>
          La responsabilite de {BRAND.name} est limitee aux dysfonctionnements
          directs de la plateforme logicielle
        </li>
        <li>
          {BRAND.name} ne garantit pas une disponibilite continue de la plateforme
          ( interruptions programmee, maintenance, pannes reseau)
        </li>
      </ul>
      <p>
        Le transporteur reste seul responsable de la bonne execution du transport
        (securite des passagers, conditions de voyage, assurance, conformite
        reglementaire).
      </p>

      <h2>7. Donnees personnelles</h2>
      <p>
        Le traitement des donnees personnelles est regi par la{" "}
        <a href="/confidentialite">Politique de Confidentialite</a> de {BRAND.name}.
        L&apos;utilisateur reconnat avoir pris connaissance de cette politique et en
        accepter les termes.
      </p>
      <p>
        Pour plus d&apos;informations sur vos droits et la protection de vos donnees,
        consultez notre page{" "}
        <a href="/rgpd">Protection des Donnees Personnelles (RGPD / Loi 2019-09)</a>.
      </p>

      <h2>8. Propriete intellectuelle</h2>
      <p>
        L&apos;ensemble des elements composant la plateforme {BRAND.name} (logiciels,
        interfaces, graphismes, marques, logos, documentation) est la propriete
        exclusive de {BRAND.company.name} {BRAND.company.legalForm}.
      </p>
      <p>
        L&apos;utilisateur beneficie d&apos;un droit d&apos;utilisation non exclusif, non
        cessible et limité a l&apos;usage de la plateforme dans le cadre de son abonnement.
      </p>

      <h2>9. Modification</h2>
      <p>
        {BRAND.company.name} {BRAND.company.legalForm} se reserve le droit de modifier
        les presentes CGV a tout moment. Les modifications entrent en vigueur des leur
        publication sur la plateforme.
      </p>
      <p>
        Les utilisateurs seront informes de toute modification substantielle par email
        ou notification sur la plateforme au minimum 15 jours avant leur entree en
        vigueur.
      </p>
      <p>
        L&apos;utilisation continue de la plateforme apres la publication des modifications
        vaut acceptation des nouvelles conditions.
      </p>

      <h2>10. Litiges</h2>
      <p>
        En cas de litige relatif a l&apos;interpretation ou a l&apos;execution des presentes
        CGV, les parties s&apos;engagent a rechercher prioritairement une resolution
        amiable par voie de negociation directe.
      </p>
      <p>
        A defaut de resolution amiable dans un delai de 30 jours, le litige sera soumis
        aux tribunaux competents de Dakar, Senegal, conformement a la loi senegalaise.
      </p>

      <h2>11. Contact</h2>
      <p>
        Pour toute question relative aux presentes conditions, vous pouvez nous
        contacter :
      </p>
      <ul>
        <li>
          <strong>Email :</strong>{" "}
          <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>
        </li>
        <li>
          <strong>Telephone :</strong>{" "}
          <a href={`tel:+${BRAND.supportPhone}`}>+{BRAND.supportPhone}</a>
        </li>
        <li>
          <strong>WhatsApp :</strong>{" "}
          <a href={`https://wa.me/${BRAND.whatsappBusiness}`}>
            wa.me/+{BRAND.whatsappBusiness}
          </a>
        </li>
        <li><strong>Adresse :</strong> {BRAND.company.address}</li>
      </ul>
    </LegalPageWrapper>
  );
}
