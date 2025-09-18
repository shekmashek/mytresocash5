import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useBudget } from '../context/BudgetContext';
import { Shield, Save, Loader } from 'lucide-react';

const SecurityPage = () => {
    const { dispatch } = useBudget();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Le mot de passe doit faire au moins 6 caractères.', type: 'error' } });
            return;
        }
        if (password !== confirmPassword) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Les mots de passe ne correspondent pas.', type: 'error' } });
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
        } else {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Mot de passe mis à jour avec succès.', type: 'success' } });
            setPassword('');
            setConfirmPassword('');
        }
        setLoading(false);
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-600" />
                    Mot de Passe et Sécurité
                </h1>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Changer de mot de passe</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border rounded-lg"
                            placeholder="Nouveau mot de passe (min. 6 caractères)"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirmer le nouveau mot de passe</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border rounded-lg"
                            placeholder="Confirmer le mot de passe"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:bg-gray-400"
                        >
                            {loading ? <Loader className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                            Changer le mot de passe
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SecurityPage;
