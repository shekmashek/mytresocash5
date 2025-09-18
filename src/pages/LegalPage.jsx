import React from 'react';

const legalContent = {
  cgu: {
    title: "Conditions Générales d'Utilisation (CGU)",
    content: `
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">1. Objet</h3>
      <p class="mb-4">Les présentes CGU ont pour objet de définir les modalités de mise à disposition du service Trezocash et ses conditions d'utilisation par l'Utilisateur.</p>
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">2. Accès au service</h3>
      <p class="mb-4">Le service est accessible 24h/24, 7j/7, sauf en cas de force majeure ou de maintenance. L'accès au service nécessite un compte utilisateur et un abonnement valide après la période d'essai.</p>
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">3. Propriété Intellectuelle</h3>
      <p class="mb-4">La structure générale de Trezocash, ainsi que les textes, graphiques, images, sons et vidéos la composant, sont la propriété de l'éditeur. Toute représentation et/ou reproduction et/ou exploitation partielle ou totale de ce site, par quelque procédé que ce soit, sans l'autorisation préalable et par écrit de l'éditeur est strictement interdite.</p>
    `
  },
  rgpd: {
    title: "Politique RGPD",
    content: `
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">1. Responsable du traitement</h3>
      <p class="mb-4">Trezocash est le responsable du traitement des données personnelles collectées sur le site.</p>
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">2. Données collectées</h3>
      <p class="mb-4">Nous collectons votre adresse e-mail pour la création du compte. Toutes les données financières que vous saisissez sont votre propriété et sont chiffrées.</p>
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">3. Vos droits</h3>
      <p class="mb-4">Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Vous pouvez exercer ces droits en nous contactant à l'adresse e-mail de contact.</p>
    `
  },
  cookies: {
    title: "Politique de Cookies",
    content: `
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">1. Qu'est-ce qu'un cookie ?</h3>
      <p class="mb-4">Un cookie est un petit fichier texte déposé sur votre ordinateur lors de la visite d'un site. Trezocash utilise des cookies strictement nécessaires au fonctionnement du service.</p>
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">2. Cookies utilisés</h3>
      <p class="mb-4">Nous utilisons uniquement des cookies de session pour maintenir votre connexion sécurisée. Nous n'utilisons aucun cookie de suivi ou publicitaire.</p>
    `
  },
  mentions: {
    title: "Mentions Légales",
    content: `
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">1. Éditeur du site</h3>
      <p class="mb-4">Trezocash<br/>Adresse : 123 Rue Fictive, 75001 Paris, France<br/>Email : contact@trezocash.com</p>
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">2. Hébergement</h3>
      <p class="mb-4">Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133 Walnut, CA 91789.</p>
    `
  },
  privacy: {
    title: "Politique de Confidentialité",
    content: `
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">1. Collecte de l'information</h3>
      <p class="mb-4">Nous recueillons des informations lorsque vous vous inscrivez sur notre site. Les informations recueillies incluent votre adresse e-mail.</p>
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">2. Utilisation des informations</h3>
      <p class="mb-4">Toute information que nous recueillons auprès de vous peut être utilisée pour : personnaliser votre expérience, fournir le service, et vous contacter par e-mail.</p>
      <h3 class="text-xl font-semibold mt-6 mb-2 text-gray-800">3. Confidentialité</h3>
      <p class="mb-4">Nous sommes les seuls propriétaires des informations recueillies sur ce site. Vos informations personnelles ne seront pas vendues, échangées, transférées, ou données à une autre société sans votre consentement.</p>
    `
  }
};

const LegalPage = ({ type }) => {
  const { title, content } = legalContent[type] || { title: 'Page non trouvée', content: '<p>Le contenu de cette page est introuvable.</p>' };

  return (
    <div className="bg-white">
        <div className="container mx-auto px-6 py-16">
            <div className="bg-white p-8 md:p-12 rounded-lg max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">{title}</h1>
                <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: content }} />
            </div>
        </div>
    </div>
  );
};

export default LegalPage;
