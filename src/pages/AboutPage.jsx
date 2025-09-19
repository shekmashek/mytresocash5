import React from 'react';
import { Award, Briefcase, UserCheck } from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Votre Trésorerie, Enfin <span className="text-blue-600">Sereine</span>.
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Par un Expert qui a Vécu Vos Galères.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
          <div className="md:col-span-1 flex justify-center">
            <img 
              src="https://img-wrapper.vercel.app/image?url=https://placehold.co/400x400/e2e8f0/475569?text=Levy+R." 
              alt="Levy Raveloson, Fondateur de Trezocash" 
              className="rounded-full w-48 h-48 md:w-64 md:h-64 object-cover shadow-2xl border-4 border-white"
            />
          </div>
          <div className="md:col-span-2">
            <p className="text-lg text-gray-700 leading-relaxed">
              Mon nom est <strong className="text-gray-900">Levy Raveloson</strong>. Je suis comptable de formation, contrôleur de gestion et entrepreneur depuis 2007.
            </p>
            <p className="mt-4 text-gray-700 leading-relaxed">
              J'ai formé et accompagné plus de 400 entreprises à Madagascar. Une frustration revenait sans cesse : voir des dirigeants passionnés perdre un temps fou et prendre des risques à cause d'une trésorerie mal gérée.
            </p>
            <p className="mt-4 text-gray-700 leading-relaxed">
              Excel, les oublis, la vision en tunnel... J'ai vécu ça moi-même. C'est pour mettre fin à ce casse-tête que j'ai créé Trezocash.
            </p>
          </div>
        </div>

        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Notre différence ? Une expertise terrain, pas théorique.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-gray-50 p-6 rounded-lg border">
              <Award className="w-10 h-10 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-gray-800">Diplômé de l'INSCAE</h3>
              <p className="text-sm text-gray-600 mt-2">La référence en gestion à Madagascar, pour des bases solides.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border">
              <UserCheck className="w-10 h-10 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-gray-800">Comptable & Contrôleur de Gestion</h3>
              <p className="text-sm text-gray-600 mt-2">Mon métier : aider les entreprises à anticiper leur futur, pas juste à enregistrer leur passé.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border">
              <Briefcase className="w-10 h-10 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-gray-800">Entrepreneur</h3>
              <p className="text-sm text-gray-600 mt-2">J'ai été à votre place. Je connais la peur de l'impayé et la complexité des flux.</p>
            </div>
          </div>
        </div>

        <div className="mt-20 text-center bg-blue-50 p-10 rounded-2xl">
          <p className="text-xl text-gray-800 leading-relaxed max-w-3xl mx-auto">
            "Trezocash condense ces 20 ans d'expérience en un outil simple, visuel et hyper-spécialisé pour vous offrir la <strong className="text-blue-600">vision claire</strong> et la <strong className="text-blue-600">tranquillité d'esprit</strong> que vous méritez."
          </p>
          <div className="mt-8">
            <p className="font-bold text-gray-900">Levy Raveloson</p>
            <p className="text-sm text-gray-600">Fondateur de Trezocash | Expert-comptable, Contrôleur de Gestion & Entrepreneur</p>
            <p className="text-sm text-gray-600 mt-1">WhatsApp : +261 34 79 719 45</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
