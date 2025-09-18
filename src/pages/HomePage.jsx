import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Calendar, Layers, PieChart, Table, Briefcase, User, CheckCircle, Zap, Plus, BarChart, Lock } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description, color }) => {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        red: 'bg-red-100 text-red-600',
    };
    const selectedColor = colorClasses[color] || colorClasses.blue;

    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center">
        <div className="flex justify-center mb-4">
          <div className={`${selectedColor} p-3 rounded-full`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    );
};

const TargetAudienceCard = ({ icon: Icon, title, description }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
                <Icon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
    </div>
);

const AccordionItem = ({ title, children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className="border-b border-gray-200">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center py-5 text-left gap-4">
        <span className="text-gray-800">{title}</span>
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 flex items-center justify-center flex-shrink-0 ml-4">
            <Plus className={`w-4 h-4 text-blue-600 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
        </div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="pb-5 pt-1 text-gray-600 text-sm pr-10">
          <p>{children}</p>
        </div>
      </motion.div>
    </div>
  );
};

const HomePage = ({ onSignUp }) => {
    const features = [
        { icon: Table, title: "Trezo", description: "Votre tableau de trésorerie complet pour une vision détaillée de vos flux.", color: "blue" },
        { icon: AreaChart, title: "Flux", description: "Visualisez vos entrées, sorties et l'évolution de votre solde en un clin d'œil.", color: "green" },
        { icon: Calendar, title: "Échéancier", description: "Anticipez et gérez vos paiements à venir grâce à une vue calendaire intuitive.", color: "blue" },
        { icon: Layers, title: "Scénarios", description: "Simulez l'impact de vos décisions futures (embauche, investissement...) sans risque.", color: "indigo" },
        { icon: PieChart, title: "Analyse", description: "Plongez dans vos données pour comprendre où va votre argent et optimiser vos budgets.", color: "red" },
    ];

    const audiences = [
        {
            icon: Briefcase,
            title: "PME & PMI",
            description: "Parce qu'une trésorerie mal anticipée est la première cause de faillite des entreprises ; Trezocash vous donne la vision globale et prévisionnelle pour piloter sereinement et éviter le danger."
        },
        {
            icon: User,
            title: "Auto-entrepreneurs & Freelances",
            description: "Parce que votre revenu est variable et imprévisible ; Trezocash vous permet de simuler vos mois à venir pour savoir exactement quoi facturer et quand, et ainsi vivre votre activité sans stress."
        },
        {
            icon: Zap,
            title: "Particuliers avec plusieurs activités",
            description: "Parce que gérer son patrimoine (compte courant, investissements, projets) dans plusieurs fichiers Excel est un casse-tête ; Trezocash unifie tout pour vous offrir une vision claire et consolidée de votre santé financière globale."
        },
        {
            icon: Briefcase,
            title: "Dirigeants de Startups",
            description: "Parce que chaque euro compte et doit être alloué stratégiquement ; Trezocash vous permet de modéliser l'impact de vos décisions de recrutement ou d'investissement sur votre runway, pour grandir en toute sécurité."
        }
    ];

    const faqItems = [
        { q: "Puis-je utiliser Trezocash pour mes finances personnelles et professionnelles ?", a: "Absolument. C'est la force de notre système multi-projets. Vous pouvez créer un projet pour votre budget personnel et un autre pour votre entreprise, chacun avec ses propres comptes et catégories, puis obtenir une vue consolidée de l'ensemble." },
        { q: "Je ne maîtrise pas la comptabilité, puis-je utiliser Trezocash ?", a: "Oui, absolument. Trezocash est conçu pour être intuitif, même sans connaissances comptables. Nous nous concentrons sur la trésorerie (les entrées et sorties d'argent) de manière simple et visuelle, sans jargon complexe." },
        { q: "Mes données financières sont-elles en sécurité ?", a: "La sécurité de vos données est notre priorité absolue. Nous utilisons une infrastructure sécurisée (Supabase) avec un chiffrement de niveau bancaire et des politiques de sécurité strictes qui garantissent que vous seul avez accès à vos informations." },
        { q: "Comment construisez-vous les prédictions de flux futurs ?", a: "Nos prédictions se basent sur les écritures récurrentes que vous configurez (salaires, loyers, abonnements...) et les échéances de factures à venir. Le système projette ces flux dans le temps pour vous donner une vision claire de votre trésorerie future." },
        { q: "Puis-je annuler mon abonnement à tout moment ?", a: "Oui. L'abonnement mensuel est sans engagement et peut être annulé à tout moment depuis les paramètres de votre compte. L'abonnement annuel vous engage pour une durée d'un an." },
        { q: "Que se passe-t-il après les 14 jours d'essai gratuit ?", a: "À la fin de votre période d'essai, nous vous inviterons à choisir l'un de nos plans pour continuer à utiliser Trezocash. Vos données ne seront pas perdues." }
    ];
    const half = Math.ceil(faqItems.length / 2);
    const firstHalf = faqItems.slice(0, half);
    const secondHalf = faqItems.slice(half);

    const featuresList = [
        "Suivi de trésorerie complet", "Prévisions et Simulations (Scénarios)", "Analyse des données avancée",
        "Gestion multi-projets", "Consolidation des projets", "Support client prioritaire", "Toutes les futures mises à jour"
    ];

    return (
        <div className="container mx-auto px-6">
            <section id="accueil" className="text-center py-16 sm:py-24">
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
                    Votre <span className="text-blue-600">Tour de Contrôle</span> Financière
                </motion.h1>
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
                    Pilotez, anticipez et maîtrisez votre trésorerie. Trezocash centralise tous vos projets pour une vision claire et des décisions éclairées.
                </motion.p>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="mt-10 flex justify-center gap-4">
                    <button onClick={onSignUp} className="px-8 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">
                        Démarrer mon essai gratuit (14 jours)
                    </button>
                </motion.div>
                 <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.7, delay: 0.6 }}
                    className="mt-12"
                >
                    <div className="relative max-w-5xl mx-auto">
                        <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-purple-600 rounded-lg blur-xl opacity-25"></div>
                        <img 
                            src="https://i.ibb.co/D8dYg7T/trezocash-og-image.png" 
                            alt="Aperçu du tableau de bord de Trezocash" 
                            className="relative w-full rounded-lg shadow-2xl border border-gray-200"
                        />
                    </div>
                </motion.div>
            </section>

            <section id="fonctionnalites" className="py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900">Cinq Outils Puissants, Une Seule Interface</h2>
                    <p className="mt-4 max-w-xl mx-auto text-gray-600">De la vision détaillée à la simulation, tout ce dont vous avez besoin pour une gestion financière proactive.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} />
                    ))}
                </div>
            </section>

            <section className="py-16 bg-gray-100 rounded-2xl my-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="px-8">
                        <div className="mb-4">
                            <h3 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 inline-block">
                                Le Super-Pouvoir
                            </h3>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Centralisez Tout. Vraiment Tout.</h2>
                        <p className="text-gray-600 mb-6">Gérez plusieurs activités, projets personnels ou entreprises séparément, puis consolidez-les en un clic pour une vue d'ensemble de votre patrimoine financier. C'est la puissance de la tour de contrôle.</p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Projets multiples illimités</span></div>
                            <div className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Consolidation instantanée</span></div>
                            <div className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Vision globale de votre trésorerie</span></div>
                        </div>
                    </div>
                    <div className="px-8"><img src="https://i.ibb.co/L8y8DqM/multi-project.png" alt="Illustration de la consolidation multi-projets" className="rounded-lg shadow-xl" /></div>
                </div>
            </section>

            <section id="pourquoi-trezocash" className="py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900">Pourquoi Trezocash ?</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-gray-600">
                        Reprenez le contrôle de votre trésorerie, simplement.
                    </p>
                </div>
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="bg-indigo-100 p-4 rounded-full">
                                <Layers className="w-8 h-8 text-indigo-600" />
                            </div>
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-4 h-12 flex items-center justify-center">"Fatigué de jongler entre dix fichiers Excel ?"</h3>
                        <p className="text-sm text-gray-600">
                            <span className="font-bold text-blue-600">La solution Trezocash :</span> Une vue consolidée. Tous vos projets dans un seul dashboard.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="bg-green-100 p-4 rounded-full">
                                <BarChart className="w-8 h-8 text-green-600" />
                            </div>
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-4 h-12 flex items-center justify-center">"Inquiet de savoir si vous pourrez payer vos charges le mois prochain ?"</h3>
                        <p className="text-sm text-gray-600">
                            <span className="font-bold text-blue-600">La solution Trezocash :</span> Une prévision précise. Simulez l'impact de vos décisions.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="bg-blue-100 p-4 rounded-full">
                                <Lock className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-4 h-12 flex items-center justify-center">"Perdu dans la vision de votre patrimoine global ?"</h3>
                        <p className="text-sm text-gray-600">
                            <span className="font-bold text-blue-600">La solution Trezocash :</span> Un contrôle total. Saisie manuelle pour une prise de conscience et une confidentialité maximale.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900">Conçu pour les Bâtisseurs</h2>
                    <p className="mt-4 max-w-xl mx-auto text-gray-600">Que vous soyez seul ou à la tête d'une équipe, Trezocash s'adapte à votre réalité.</p>
                </div>
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                    {audiences.map((audience, index) => (
                        <TargetAudienceCard key={index} {...audience} />
                    ))}
                </div>
            </section>

            <section id="tarifs" className="py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900">Une Offre Simple et Transparente</h2>
                    <p className="mt-4 max-w-xl mx-auto text-gray-600">Toutes les fonctionnalités, sans limite. Choisissez le plan qui vous convient.</p>
                </div>
                <div className="flex flex-col lg:flex-row justify-center items-stretch gap-8">
                    {/* Mensuel */}
                    <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-lg border flex flex-col">
                        <div className="flex-grow">
                            <div className="h-7 mb-4"></div> {/* Badge Placeholder */}
                            <h3 className="text-xl font-semibold text-gray-800 text-center">Mensuel</h3>
                            <p className="text-sm text-gray-500 mt-2 text-center">Flexibilité totale, sans engagement.</p>
                            <div className="my-8 h-28 flex flex-col justify-center text-center">
                                <div>
                                    <span className="text-5xl font-extrabold text-gray-900">12$</span>
                                    <span className="text-xl font-medium text-gray-500"> / mois</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <button onClick={onSignUp} className="w-full px-6 py-3 font-semibold text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">Démarrer l'essai de 14 jours</button>
                            <div className="h-10 mt-4"></div> {/* Urgency Placeholder */}
                            <hr className="my-8" />
                            <ul className="space-y-3 text-sm">{featuresList.map((feature, index) => (<li key={index} className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span className="text-gray-700">{feature}</span></li>))}</ul>
                        </div>
                    </div>
                    {/* Annuel */}
                    <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-xl border-2 border-blue-600 flex flex-col">
                        <div className="flex-grow">
                            <div className="h-7 mb-4 flex justify-center"><span className="px-3 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">ÉCONOMISEZ 33%</span></div>
                            <h3 className="text-xl font-semibold text-gray-800 text-center">Annuel</h3>
                            <p className="text-sm text-gray-500 mt-2 text-center">La meilleure offre pour un engagement à long terme.</p>
                            <div className="my-8 h-28 flex flex-col justify-center text-center">
                                <p className="text-gray-500 line-through">144$</p>
                                <div>
                                    <span className="text-5xl font-extrabold text-gray-900">96$</span>
                                    <span className="text-xl font-medium text-gray-500"> / an</span>
                                </div>
                                <p className="text-sm font-semibold text-blue-600 mt-1">Soit 8$ par mois</p>
                            </div>
                        </div>
                        <div>
                            <button onClick={onSignUp} className="w-full px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-lg">Démarrer l'essai de 14 jours</button>
                            <div className="h-10 mt-4"></div> {/* Urgency Placeholder */}
                            <hr className="my-8" />
                            <ul className="space-y-3 text-sm">{featuresList.map((feature, index) => (<li key={index} className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span className="text-gray-700">{feature}</span></li>))}</ul>
                        </div>
                    </div>
                    {/* Lifetime */}
                    <div className="w-full max-w-sm p-8 bg-gray-800 text-white rounded-2xl shadow-2xl border-2 border-amber-400 flex flex-col">
                        <div className="flex-grow">
                            <div className="h-7 mb-4 flex justify-center"><span className="px-4 py-1 text-sm font-semibold text-gray-900 bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full">Offre de Lancement</span></div>
                            <h3 className="text-xl font-semibold text-white text-center">Accès à Vie</h3>
                            <p className="text-sm text-gray-300 mt-2 text-center">Offre exclusive. Plus jamais à ce prix.</p>
                            <div className="my-8 h-28 flex flex-col justify-center text-center">
                                <div>
                                    <span className="text-5xl font-extrabold text-white">499$</span>
                                    <span className="text-xl font-medium text-gray-400"> / à vie</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <button onClick={onSignUp} className="w-full px-6 py-3 font-semibold text-gray-900 bg-gradient-to-r from-amber-300 to-yellow-400 rounded-lg hover:opacity-90 transition-opacity shadow-lg">Devenir un Visionnaire</button>
                            <p className="text-center text-xs text-yellow-400 font-bold mt-4 h-10 flex items-center justify-center">⚠️ Offre limitée aux 100 premiers visionnaires.</p>
                            <hr className="my-8 border-gray-600" />
                            <ul className="space-y-3 text-sm">{featuresList.map((feature, index) => (<li key={index} className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-400" /><span className="text-gray-300">{feature}</span></li>))}</ul>
                        </div>
                    </div>
                </div>
            </section>

            <section id="faq" className="py-16">
                <div className="text-center mb-12"><h2 className="text-3xl font-bold text-gray-900">Questions fréquentes</h2></div>
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-16">
                    <div className="space-y-0">{firstHalf.map((item, index) => (<AccordionItem key={index} title={item.q}>{item.a}</AccordionItem>))}</div>
                    <div className="space-y-0">{secondHalf.map((item, index) => (<AccordionItem key={index} title={item.q}>{item.a}</AccordionItem>))}</div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
