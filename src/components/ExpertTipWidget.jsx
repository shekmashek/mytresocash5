import React, { useState, useEffect } from 'react';
import { Lightbulb, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const expertTips = [
  {
    title: "Épargne de Sécurité",
    content: "Constituez une épargne de sécurité pour couvrir 3 à 6 mois de charges fixes. Cela vous aidera à rester serein face aux imprévus et aux baisses d'activité."
  },
  {
    title: "Analyse 80/20",
    content: "Analysez vos 3 plus grosses dépenses chaque mois. C'est souvent là que se cachent les plus grandes opportunités d'optimisation (loi de Pareto)."
  },
  {
    title: "Suivi Régulier",
    content: "N'attendez pas la fin du mois pour suivre votre trésorerie. Un coup d'œil rapide chaque semaine peut éviter bien des surprises et vous permettre de réagir à temps."
  },
  {
    title: "Relance Client",
    content: "Une facture client en retard de 30 jours a une probabilité élevée de ne jamais être payée. Mettez en place un processus de relance systématique et courtois."
  },
  {
    title: "Séparez les Comptes",
    content: "Même en tant qu'auto-entrepreneur, ouvrez un compte bancaire dédié à votre activité. Cela simplifie radicalement le suivi et la gestion de votre trésorerie professionnelle."
  }
];

const ExpertTipWidget = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Show a random tip on each page load
    setCurrentIndex(Math.floor(Math.random() * expertTips.length));
  }, []);

  const handleNextTip = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % expertTips.length);
  };

  const tip = expertTips[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-4 rounded-lg flex items-start gap-4 relative"
    >
      <div className="bg-yellow-100 p-2 rounded-full mt-1">
        <Lightbulb className="w-5 h-5 text-yellow-600" />
      </div>
      <div className="flex-grow">
        <h4 className="font-bold text-sm">Le Conseil de l'Expert</h4>
        <AnimatePresence mode="wait">
          <motion.p
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-sm mt-1"
          >
            {tip.content}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-1 absolute top-3 right-3">
        <button
          onClick={handleNextTip}
          className="p-1 rounded-full text-yellow-700 hover:bg-yellow-200 transition-colors"
          title="Conseil suivant"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};

export default ExpertTipWidget;
