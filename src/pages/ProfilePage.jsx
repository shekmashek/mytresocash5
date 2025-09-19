import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { supabase } from '../utils/supabase';
import { User, Save, Loader } from 'lucide-react';

const ProfilePage = () => {
    const { state, dispatch } = useBudget();
    const { session, profile } = state;

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile) {
            setFullName(profile.fullName || 'Levy');
        }
        if (session?.user) {
            setEmail(session.user.email);
        }
    }, [profile, session]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { data: updatedProfile, error: profileError } = await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', session.user.id)
            .select('id, full_name, subscription_status, trial_ends_at, plan_id')
            .single();

        if (profileError) {
            dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${profileError.message}`, type: 'error' } });
            setLoading(false);
            return;
        }

        // Also update auth metadata for consistency
        await supabase.auth.updateUser({ data: { full_name: fullName } });

        // Update local state with the full, fresh profile object
        dispatch({ 
            type: 'SET_PROFILE', 
            payload: {
                id: updatedProfile.id,
                fullName: updatedProfile.full_name,
                subscriptionStatus: updatedProfile.subscription_status,
                trialEndsAt: updatedProfile.trial_ends_at,
                planId: updatedProfile.plan_id,
            } 
        });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Profil mis à jour avec succès.', type: 'success' } });
        
        setLoading(false);
    };

    const handleEmailUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.updateUser({ email });

        if (error) {
            dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
        } else {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Un e-mail de confirmation a été envoyé à votre nouvelle adresse.', type: 'info' } });
        }
        setLoading(false);
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <User className="w-8 h-8 text-blue-600" />
                    Mon Profil
                </h1>
            </div>

            <div className="space-y-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Informations Personnelles</h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nom complet</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:bg-gray-400"
                            >
                                {loading ? <Loader className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                                Enregistrer
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Adresse E-mail</h2>
                    <form onSubmit={handleEmailUpdate} className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">E-mail</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading || email === session?.user?.email}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:bg-gray-400"
                            >
                                {loading ? <Loader className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                                Changer l'e-mail
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
