import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { supabase } from '../utils/supabase';
import { Shield, AlertTriangle, Download, Mail, BookUser, LogOut, Loader, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportUserDataAsJSON } from '../utils/export';

const DeleteAccountPage = () => {
    const { state, dispatch } = useBudget();
    const navigate = useNavigate();
    const [reason, setReason] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);

    const handleExport = () => {
        exportUserDataAsJSON(state);
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Exportation de vos données en cours...', type: 'info' } });
    };

    const handleDeleteAccount = async () => {
        if (confirmText !== 'SUPPRIMER') {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Veuillez taper "SUPPRIMER" pour confirmer.', type: 'error' } });
            return;
        }
        setLoading(true);
        
        const { error: deleteError } = await supabase.rpc('delete_user_account');

        setLoading(false);

        if (deleteError) {
            dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur lors de la suppression : ${deleteError.message}`, type: 'error' } });
        } else {
            await supabase.auth.signOut();
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Shield className="w-8 h-8 text-red-600" />
                    Supprimer Mon Compte
                </h1>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border space-y-8">
                <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg" role="alert">
                    <h3 className="font-bold text-lg flex items-center gap-2"><AlertTriangle /> Attention : Action Définitive</h3>
                    <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                        <li>Toutes vos données (projets, scénarios, historiques) seront <strong>définitivement supprimées</strong>.</li>
                        <li>Cette action est <strong>irréversible</strong>.</li>
                        <li>Vous ne pourrez <strong>plus jamais récupérer ces informations</strong>.</li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Avant de partir...</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={handleExport} className="flex flex-col items-center justify-center p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-center">
                            <Download className="w-6 h-6 mb-2 text-gray-600" />
                            <span className="font-semibold text-sm">Exporter mes données</span>
                            <span className="text-xs text-gray-500">(Format JSON)</span>
                        </button>
                        <button onClick={() => navigate('/app/abonnement')} className="flex flex-col items-center justify-center p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-center">
                            <LogOut className="w-6 h-6 mb-2 text-gray-600" />
                            <span className="font-semibold text-sm">Se désabonner</span>
                            <span className="text-xs text-gray-500">(Gérer votre plan)</span>
                        </button>
                        <a href="mailto:contact@trezocash.com" className="flex flex-col items-center justify-center p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-center">
                            <Mail className="w-6 h-6 mb-2 text-gray-600" />
                            <span className="font-semibold text-sm">Nous contacter</span>
                            <span className="text-xs text-gray-500">(Un problème technique ?)</span>
                        </a>
                    </div>
                </div>

                <div>
                    <label htmlFor="reason" className="block text-lg font-semibold text-gray-700 mb-3">Pourquoi partez-vous ? (Optionnel)</label>
                    <select id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full max-w-md px-3 py-2 border rounded-lg">
                        <option value="">Choisissez une raison...</option>
                        <option value="too_expensive">C'est trop cher</option>
                        <option value="missing_feature">Il manque une fonctionnalité importante</option>
                        <option value="found_alternative">J'ai trouvé une autre solution</option>
                        <option value="other">Autre raison</option>
                    </select>
                </div>

                <div className="pt-8 border-t">
                    <h3 className="text-lg font-semibold text-red-700 mb-3">Confirmation Finale</h3>
                    <p className="text-sm text-gray-600 mb-4">Pour confirmer la suppression définitive de votre compte et de toutes vos données, veuillez taper "SUPPRIMER" dans le champ ci-dessous.</p>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        placeholder='Tapez "SUPPRIMER"'
                    />
                    <button
                        onClick={handleDeleteAccount}
                        disabled={loading || confirmText !== 'SUPPRIMER'}
                        className="mt-4 w-full max-w-md bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader className="animate-spin" /> : <Trash2 />}
                        Confirmer la suppression définitive
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountPage;
