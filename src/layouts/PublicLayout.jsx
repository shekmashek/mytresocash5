import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import TrezocashLogo from '../components/TrezocashLogo';
import FlagIcon from '../components/FlagIcon';

const PublicLayout = ({ onLogin, onSignUp, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [lang, setLang] = useState('fr');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
        window.scrollTo(0, 0);
    }
  }, [location]);

  const handleNavClick = (path) => {
    if (path.startsWith('/#')) {
      const id = path.substring(2);
      if (location.pathname !== '/') {
        navigate(`/${path}`);
      } else {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      navigate(path);
    }
    setIsMobileMenuOpen(false);
  };

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    setIsLangMenuOpen(false);
  };
  
  const navLinks = [
    { label: 'Fonctionnalités', path: '/#fonctionnalites' },
    { label: 'Tarifs', path: '/#tarifs' },
    { label: 'À propos', path: '/a-propos' },
    { label: 'FAQ', path: '/#faq' },
    { label: 'Contact', path: '/#contact' },
  ];

  return (
    <div className="bg-gray-50 text-gray-800 font-sans flex flex-col min-h-screen">
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg z-50 border-b">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <TrezocashLogo className="w-10 h-10" />
            <span className="text-xl font-bold text-gray-800">Trezocash</span>
          </Link>
          
          <div className="flex items-center">
            <nav className="hidden md:flex items-center gap-6 mr-6">
              <button onClick={() => handleNavClick('/')} className="text-sm font-semibold text-gray-600 hover:text-blue-600">Accueil</button>
              {navLinks.map(link => (
                <button key={link.label} onClick={() => handleNavClick(link.path)} className="text-sm font-semibold text-gray-600 hover:text-blue-600">{link.label}</button>
              ))}
              <div className="relative">
                <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-blue-600">
                  <FlagIcon lang={lang} className="w-6 h-auto rounded-sm" />
                </button>
                <AnimatePresence>
                  {isLangMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg border z-10 p-1"
                    >
                      <button onClick={() => handleLanguageChange('fr')} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
                        <FlagIcon lang="fr" className="w-5 h-auto rounded-sm" />
                        Français
                      </button>
                      <button onClick={() => handleLanguageChange('en')} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
                        <FlagIcon lang="en" className="w-5 h-auto rounded-sm" />
                        English
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <button onClick={onLogin} className="text-sm font-semibold text-gray-600 hover:text-blue-600">
                Se connecter
              </button>
              <button onClick={onSignUp} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Essai Gratuit
              </button>
            </div>

            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-white z-[100] p-6 md:hidden"
          >
            <div className="flex justify-between items-center mb-10">
              <span className="text-xl font-bold text-gray-800">Trezocash</span>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>
            <nav className="flex flex-col items-center gap-8">
              <button onClick={() => handleNavClick('/')} className="text-lg font-semibold text-gray-700">Accueil</button>
              {navLinks.map(link => (
                <button key={link.label} onClick={() => handleNavClick(link.path)} className="text-lg font-semibold text-gray-700">{link.label}</button>
              ))}
              <hr className="w-full my-4" />
              <button onClick={onLogin} className="text-lg font-semibold text-gray-700">Se connecter</button>
              <button onClick={onSignUp} className="w-full px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg">Essai Gratuit</button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="bg-gray-100 border-t">
        <div id="contact" className="container mx-auto px-6 py-12">
          <div className="text-center text-gray-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Contact</h3>
            <p className="max-w-md mx-auto mb-6">Une question ? Une suggestion ? N'hésitez pas à nous contacter. Nous vous répondrons dans les plus brefs délais.</p>
            <a href="mailto:contact@trezocash.com" className="inline-block px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">
              contact@trezocash.com
            </a>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mb-4">
              <Link to="/a-propos" className="text-sm text-gray-500 hover:underline">À propos de nous</Link>
              <Link to="/cgu" className="text-sm text-gray-500 hover:underline">CGU</Link>
              <Link to="/rgpd" className="text-sm text-gray-500 hover:underline">RGPD</Link>
              <Link to="/cookies" className="text-sm text-gray-500 hover:underline">Cookies</Link>
              <Link to="/mentions-legales" className="text-sm text-gray-500 hover:underline">Mentions Légales</Link>
              <Link to="/politique-de-confidentialite" className="text-sm text-gray-500 hover:underline">Politique de Confidentialité</Link>
            </div>
            <TrezocashLogo className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Trezocash. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
