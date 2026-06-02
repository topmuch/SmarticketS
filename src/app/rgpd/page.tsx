// @ts-nocheck
import { LegalPageWrapper } from "@/components/legal/legal-page-wrapper";
import { BRAND } from "@/lib/constants";

export default function RGPDPage() {
  return (
    <LegalPageWrapper title="Protection des Donnees Personnelles (RGPD / Loi 2019-09)" lastUpdated="1er janvier 2025">
      <h2>1. Introduction</h2>
      <p>
        {BRAND.company.name} {BRAND.company.legalForm} (&quot;{BRAND.name}&quot;) s&apos;engage a
        proteger les donnees personnelles de ses utilisateurs conformement a :
      </p>
      <ul>
        <li>
          La <strong>Loi n° 2019-09</strong> du Senegal relative a la protection des
          donnees personnelles
        </li>
        <li>
          Le <strong>Reglement General sur la Protection des Donnees (RGPD)</strong> de
          l&apos;Union Europeenne (Reglement (UE) 2016/679), dans la mesure ou la plateforme
          peut etre accessible depuis l&apos;espace europeen
        </li>
      </ul>
      <p>
        La presente page d&apos;information detaille les mesures mises en place par{" "}
        {BRAND.name} pour garantir la conformite avec ces textes et proteger les droits
        des personnes concernees.
      </p>

      <h2>2. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des donnees personnelles est :
      </p>
      <ul>
        <li><strong>Raison sociale :</strong> {BRAND.company.name} {BRAND.company.legalForm}</li>
        <li><strong>RCCM :</strong> {BRAND.company.rccm}</li>
        <li><strong>NINEA :</strong> {BRAND.company.ninea}</li>
        <li><strong>Adresse :</strong> {BRAND.company.address}</li>
        <li>
          <strong>DPO :</strong>{" "}
          <a href={`mailto:${BRAND.dpo.email}`}>{BRAND.dpo.email}</a>
        </li>
      </ul>

      <h2>3. Donnees personnelles traitees</h2>

      <h3>a) Donnees des passagers</h3>
      <ul>
        <li>Nom et prenom</li>
        <li>Numero de telephone</li>
        <li>Numero de piece d&apos;identite (CNI, passeport, carte consulaire)</li>
        <li>Numero de siege attribue</li>
        <li>Destination et ligne de transport</li>
      </ul>

      <h3>b) Donnees des colis</h3>
      <ul>
        <li>Nom et telephone de l&apos;expediteur</li>
        <li>Nom et telephone du destinataire</li>
        <li>Description du contenu</li>
        <li>Poids et dimensions</li>
        <li>Destination (gare d&apos;arrivee)</li>
      </ul>

      <h3>c) Donnees des comptes</h3>
      <ul>
        <li>Nom complet</li>
        <li>Adresse email</li>
        <li>Role au sein de l&apos;organisation (administrateur, operateur, controleur, chauffeur)</li>
        <li>Logs de connexion (date, heure, adresse IP)</li>
      </ul>

      <h3>d) Donnees techniques</h3>
      <ul>
        <li>Adresse IP</li>
        <li>Type et version du navigateur</li>
        <li>Logs techniques du serveur</li>
        <li>Identifiants de session (jetons JWT)</li>
      </ul>

      <h2>4. Finalites du traitement</h2>
      <p>
        Le tableau ci-dessous presente les finalites du traitement, les donnees
        concernees, la base legale et la duree de conservation :
      </p>
      <table className="w-full border-collapse text-sm mt-4 mb-4">
        <thead>
          <tr className="bg-[#1e3a8a] text-white">
            <th className="border border-gray-200 px-3 py-2 text-left">Finalite</th>
            <th className="border border-gray-200 px-3 py-2 text-left">Donnees</th>
            <th className="border border-gray-200 px-3 py-2 text-left">Base legale</th>
            <th className="border border-gray-200 px-3 py-2 text-left">Duree</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-200 px-3 py-2">Emission et activation de billets</td>
            <td className="border border-gray-200 px-3 py-2">Passagers, billets</td>
            <td className="border border-gray-200 px-3 py-2">Execution du contrat</td>
            <td className="border border-gray-200 px-3 py-2">3 ans</td>
          </tr>
          <tr className="bg-gray-50">
            <td className="border border-gray-200 px-3 py-2">Controle et validation des billets</td>
            <td className="border border-gray-200 px-3 py-2">Passagers, billets, comptes</td>
            <td className="border border-gray-200 px-3 py-2">Execution du contrat</td>
            <td className="border border-gray-200 px-3 py-2">3 ans</td>
          </tr>
          <tr>
            <td className="border border-gray-200 px-3 py-2">Enregistrement et suivi des colis</td>
            <td className="border border-gray-200 px-3 py-2">Colis, passagers</td>
            <td className="border border-gray-200 px-3 py-2">Execution du contrat</td>
            <td className="border border-gray-200 px-3 py-2">3 ans</td>
          </tr>
          <tr className="bg-gray-50">
            <td className="border border-gray-200 px-3 py-2">Notifications WhatsApp et email</td>
            <td className="border border-gray-200 px-3 py-2">Passagers, colis</td>
            <td className="border border-gray-200 px-3 py-2">Interet legitime</td>
            <td className="border border-gray-200 px-3 py-2">3 ans</td>
          </tr>
          <tr>
            <td className="border border-gray-200 px-3 py-2">Gestion des comptes utilisateurs</td>
            <td className="border border-gray-200 px-3 py-2">Comptes</td>
            <td className="border border-gray-200 px-3 py-2">Execution du contrat</td>
            <td className="border border-gray-200 px-3 py-2">Contrat + 3 ans</td>
          </tr>
          <tr className="bg-gray-50">
            <td className="border border-gray-200 px-3 py-2">Securite et prevention de la fraude</td>
            <td className="border border-gray-200 px-3 py-2">Comptes, techniques</td>
            <td className="border border-gray-200 px-3 py-2">Interet legitime</td>
            <td className="border border-gray-200 px-3 py-2">1 an</td>
          </tr>
          <tr>
            <td className="border border-gray-200 px-3 py-2">Statistiques et rapports</td>
            <td className="border border-gray-200 px-3 py-2">Billets, colis (anonymises)</td>
            <td className="border border-gray-200 px-3 py-2">Interet legitime</td>
            <td className="border border-gray-200 px-3 py-2">3 ans</td>
          </tr>
          <tr className="bg-gray-50">
            <td className="border border-gray-200 px-3 py-2">Audit et conformite</td>
            <td className="border border-gray-200 px-3 py-2">Comptes, techniques</td>
            <td className="border border-gray-200 px-3 py-2">Obligation legale</td>
            <td className="border border-gray-200 px-3 py-2">5 ans</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Droits des personnes concernees</h2>
      <p>
        Conformement a la Loi n° 2019-09 et au RGPD, vous disposez des droits
        suivants sur vos donnees personnelles :
      </p>

      <h3>a) Droit d&apos;acces (Art. 15 RGPD / Art. 15 Loi 2019-09)</h3>
      <p>
        Vous avez le droit d&apos;obtenir la confirmation que des donnees vous concernant
        sont traitees ou non, ainsi qu&apos;une copie de ces donnees.
      </p>
      <p>
        <strong>Comment l&apos;exercer :</strong> Envoyez un email a{" "}
        <a href={`mailto:${BRAND.dpo.email}`}>{BRAND.dpo.email}</a> avec pour objet
        &quot;Demande d&apos;acces aux donnees&quot; et indiquez votre nom, prenom et numero de
        telephone.
      </p>

      <h3>b) Droit de rectification (Art. 16 RGPD / Art. 16 Loi 2019-09)</h3>
      <p>
        Vous avez le droit d&apos;obtenir la rectification de donnees inexactes ou
        incompletes vous concernant.
      </p>
      <p>
        <strong>Comment l&apos;exercer :</strong> Envoyez un email a{" "}
        <a href={`mailto:${BRAND.dpo.email}`}>{BRAND.dpo.email}</a> avec pour objet
        &quot;Demande de rectification&quot; en precisant les donnees a corriger et les
        informations exactes.
      </p>

      <h3>c) Droit a l&apos;effacement (Art. 17 RGPD / Art. 17 Loi 2019-09)</h3>
      <p>
        Vous avez le droit d&apos;obtenir l&apos;effacement de vos donnees personnelles dans
        les cas prevus par la loi (donnees erronees, traitement illicite, opposition,
        etc.).
      </p>
      <p>
        <strong>Comment l&apos;exercer :</strong> Envoyez un email a{" "}
        <a href={`mailto:${BRAND.dpo.email}`}>{BRAND.dpo.email}</a> avec pour objet
        &quot;Demande de suppression&quot;. L&apos;effacement sera effectue dans un delai de 30
        jours.
      </p>

      <h3>d) Droit a la limitation du traitement (Art. 18 RGPD / Art. 18 Loi 2019-09)</h3>
      <p>
        Vous avez le droit d&apos;obtenir la limitation du traitement de vos donnees dans
        les cas suivants : contestation de l&apos;exactitude des donnees, traitement illicite,
        besoin des donnees pour un contentieux.
      </p>
      <p>
        <strong>Comment l&apos;exercer :</strong> Envoyez un email a{" "}
        <a href={`mailto:${BRAND.dpo.email}`}>{BRAND.dpo.email}</a> avec pour objet
        &quot;Demande de limitation du traitement&quot; en indiquant les motifs.
      </p>

      <h3>e) Droit a la portabilite (Art. 20 RGPD / Art. 19 Loi 2019-09)</h3>
      <p>
        Vous avez le droit de recevoir vos donnees personnelles dans un format
        structure, couramment utilise et lisible par machine (JSON, CSV).
      </p>
      <p>
        <strong>Comment l&apos;exercer :</strong> Envoyez un email a{" "}
        <a href={`mailto:${BRAND.dpo.email}`}>{BRAND.dpo.email}</a> avec pour objet
        &quot;Demande de portabilite&quot;. Vous recevrez vos donnees au format demande dans
        un delai de 30 jours.
      </p>

      <h3>f) Droit d&apos;opposition (Art. 21 RGPD / Art. 20 Loi 2019-09)</h3>
      <p>
        Vous avez le droit de vous opposer au traitement de vos donnees personnelles
        pour des motifs legitimes, ou au traitement effectue a des fins de prospection
        ou de statistiques.
      </p>
      <p>
        <strong>Comment l&apos;exercer :</strong> Envoyez un email a{" "}
        <a href={`mailto:${BRAND.dpo.email}`}>{BRAND.dpo.email}</a> avec pour objet
        &quot;Opposition au traitement&quot; en detaillant les motifs de votre opposition.
      </p>

      <h2>6. Delai de reponse</h2>
      <p>
        Conformement a la reglementation, {BRAND.name} s&apos;engage a traiter votre
        demande dans un delai maximum de <strong>30 jours</strong> a compter de la
        reception de votre requete.
      </p>
      <p>
        Si votre demande est complexe ou si vous avez soumis plusieurs demandes, ce
        delai peut etre prolonge de 60 jours supplementaires. Dans ce cas, vous serez
        informe dans les 30 premiers jours.
      </p>

      <h2>7. Plainte aupres de la CNDP</h2>
      <p>
        Si vous estimez que le traitement de vos donnees personnelles par{" "}
        {BRAND.name} ne respecte pas la legislation, vous avez le droit d&apos;introduire
        une plainte aupres de l&apos;autorite de controle competente :
      </p>
      <ul>
        <li>
          <strong>Commission Nationale des Donnees Personnelles (CNDP)</strong> du
          Senegal
        </li>
        <li><strong>Adresse :</strong> Dakar, Senegal</li>
      </ul>
      <p>
        La CNDP est chargee de veiller a la protection des donnees personnelles et
        peut etre saisie en cas de manquement ou de refus de reponse de notre part.
      </p>

      <h2>8. Mesures de securite</h2>
      <p>
        {BRAND.name} met en oeuvre les mesures techniques et organisationnelles
        suivantes pour proteger vos donnees personnelles :
      </p>
      <ul>
        <li>
          <strong>Chiffrement :</strong> les mots de passe sont haches avec bcrypt.
          Les jetons d&apos;authentification sont signes cryptographiquement (HMAC-SHA256).
        </li>
        <li>
          <strong>Controle d&apos;acces :</strong> authentification JWT avec verification
          systematique, roles bases sur les permissions (RBAC), expiration des jetons
          (15 minutes pour l&apos;acces, 7 jours pour le rafraichissement).
        </li>
        <li>
          <strong>Journaux d&apos;audit :</strong> toutes les operations sensibles sont
          enregistrees avec horodatage, utilisateur et adresse IP.
        </li>
        <li>
          <strong>Isolation multi-locataires :</strong> chaque transporteur (tenant)
          dispose d&apos;un espace strictement isole. Aucune donnee n&apos;est partagee entre
          les locataires.
        </li>
        <li>
          <strong>Codes QR securises :</strong> les codes de controle des billets et
          colis sont generes de maniere cryptographiquement securisee avec{" "}
          <code>crypto.randomInt()</code>.
        </li>
        <li>
          <strong>Limitation du taux :</strong> protection contre les attaques par force
          brute (5 tentatives de connexion / 15 minutes par adresse IP).
        </li>
        <li>
          <strong>Blocage des jetons :</strong> mecanisme de liste noire pour les jetons
          revokes (deconnexion, changement de mot de passe).
        </li>
      </ul>

      <h2>9. Transferts de donnees</h2>
      <p>
        {BRAND.name} heberge et traite les donnees exclusivement sur des serveurs
        situes au Senegal (via OVH SAS, Roubaix, France). Les donnees ne sont pas
        transferees en dehors du Senegal sans le consentement exprès des personnes
        concernees.
      </p>
      <p>
        En cas de besoin de transfert international, {BRAND.name} s&apos;assurera que des
        garanties appropriees soient en place (clauses contractuelles types,
        decisions d&apos;adequation) conformement aux articles 44 et suivants de la Loi
        2019-09 et au chapitre V du RGPD.
      </p>

      <h2>10. Contact DPO</h2>
      <p>
        Pour toute question, demande ou reclamation relative a la protection de vos
        donnees personnelles, vous pouvez contacter notre Delegue a la Protection des
        Donnees (DPO) :
      </p>
      <ul>
        <li>
          <strong>Email :</strong>{" "}
          <a href={`mailto:${BRAND.dpo.email}`}>{BRAND.dpo.email}</a>
        </li>
        <li>
          <strong>Telephone :</strong>{" "}
          <a href={`tel:+${BRAND.supportPhone}`}>+{BRAND.supportPhone}</a>
        </li>
        <li><strong>Adresse :</strong> {BRAND.company.address}</li>
      </ul>

      <h2>11. Mises a jour</h2>
      <p>
        La presente politique de protection des donnees personnelles est mise a jour
        regulierement afin de refléter les evolutions legislatives et reglementaires
        ainsi que les ameliorations de nos pratiques.
      </p>
      <p>
        <strong>Derniere mise a jour :</strong> 1er janvier 2025.
      </p>
      <p>
        Nous vous invitons a consulter regulierement cette page pour rester informe
        des modifications. Toute modification substantielle sera notifiee aux
        utilisateurs par email ou via la plateforme.
      </p>
    </LegalPageWrapper>
  );
}
