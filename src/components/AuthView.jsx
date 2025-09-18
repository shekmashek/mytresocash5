import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import TrezocashLogo from './TrezocashLogo';
import { LogIn, UserPlus, Loader, ArrowLeft } from 'lucide-react';

const AuthView = ({ initialMode = 'login', fromTrial = false, onBack }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Inscription réussie ! Veuillez vérifier votre e-mail pour confirmer votre compte.');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const signUpTitle = fromTrial ? "Démarrer votre essai de 14 jours" : "Créer un compte";
  const signUpSubtitle = fromTrial ? "Créez votre compte pour commencer votre essai gratuit." : "Rejoignez-nous pour commencer à piloter votre trésorerie.";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
            <TrezocashLogo className="w-24 h-24" />
            <h1 className="mt-4 text-4xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
                Trezocash
            </h1>
            <p className="mt-2 text-gray-600">Votre trésorerie, simplifiée.</p>
        </div>
        
        <div className="bg-white p-8 rounded-xl shadow-lg border relative">
          <button onClick={onBack} className="absolute top-4 left-4 text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex border-b mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Se Connecter
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              S'inscrire
            </button>
          </div>

          <h2 className="text-xl font-bold text-center text-gray-800 mb-2">{isLogin ? 'Bon retour !' : signUpTitle}</h2>
          <p className="text-sm text-gray-500 text-center mb-6">{isLogin ? 'Connectez-vous pour accéder à votre espace.' : signUpSubtitle}</p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="vous@exemple.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="********"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400"
            >
              {loading ? <Loader className="animate-spin" /> : (isLogin ? <LogIn size={18} /> : <UserPlus size={18} />)}
              <span>{loading ? 'Chargement...' : (isLogin ? 'Se Connecter' : 'S\'inscrire')}</span>
            </button>
          </form>

          {error && <p className="mt-4 text-xs text-center text-red-600 bg-red-50 p-2 rounded-md">{error}</p>}
          {message && <p className="mt-4 text-xs text-center text-green-600 bg-green-50 p-2 rounded-md">{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default AuthView;
