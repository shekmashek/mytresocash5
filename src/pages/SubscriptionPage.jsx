import React, { useMemo, useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { CreditCard, CheckCircle, Clock, Loader } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useSearchParams } from 'react-router-dom';

const SubscriptionPage = () => {
    const { state, dispatch } = useBudget();
    const { session, profile } = state;
    const [searchParams] = useSearchParams();
    const [loadingPlan, setLoadingPlan] = useState(null);

    useEffect(() => {
        if (searchParams.get('session_id')) {
            dispatch({
                type: 'ADD_TOAST',
                payload: { message: 'Abonnement réussi ! Merci pour votre confiance.', type: 'success', duration: 5000 }
            });
            // TODO: Optionally refetch profile to update status immediately
        }
    }, [searchParams, dispatch]);

    const subscriptionStatus = profile?.subscription_status || 'trialing';
    
    const trialEndDate = useMemo(() => {
        if (profile?.trial_ends_at) {
            return new Date(profile.trial_ends_at);
        }
        if (session?.user?.created_at) {
            const createdDate = new Date(session.user.created_at);
            return new Date(createdDate.setDate(createdDate.getDate() + 14));
        }
        return null;
    }, [session, profile]);

    const trialDaysLeft = useMemo(() => {
        if (!trialEndDate) return 0;
        const diff = trialEndDate.getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }, [trialEndDate]);

    const handleSubscribe = async (plan) => {
        setLoadingPlan(plan.id);
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: { priceId: plan.priceId },
            });

            if (error) throw error;

            window.location.href = data.url;

        } catch (error) {
            dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
            setLoadingPlan(null);
        }
    };

    const featuresList = [
        "Suivi de trésorerie complet", "Prévisions et Simulations (Scénarios)", "Analyse des données avancée",
        "Gestion multi-projets", "Consolidation des projets", "Support client prioritaire", "Toutes les futures mises à jour"
    ];

    const plans = [
        { id: 'monthly', priceId: 'YOUR_MONTHLY_PRICE_ID', name: 'Mensuel', price: '12$', per: '/ mois', description: 'Flexibilité totale, sans engagement.', badge: null, buttonText: "S'abonner", buttonClass: 'bg-blue-100 text-blue-600 hover:bg-blue-200' },
        { id: 'annual', priceId: 'YOUR_ANNUAL_PRICE_ID', name: 'Annuel', price: '96$', per: '/ an', description: 'La meilleure offre pour un engagement à long terme.', badge: 'ÉCONOMISEZ 33%', buttonText: "S'abonner", buttonClass: 'bg-blue-600 text-white hover:bg-blue-700' },
        { id: 'lifetime', priceId: 'YOUR_LIFETIME_PRICE_ID', name: 'Accès à Vie', price: '499$', per: '/ à vie', description: 'Offre exclusive. Plus jamais à ce prix.', badge: 'Offre de Lancement', buttonText: 'Devenir un Visionnaire', buttonClass: 'bg-gradient-to-r from-amber-300 to-yellow-400 text-gray-900 hover:opacity-90' }
    ];

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-blue-600" />
                    Mon Abonnement
                </h1>
            </div>

            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-6 rounded-lg mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                        {subscriptionStatus === 'trialing' ? <Clock className="w-6 h-6 text-blue-600" /> : <CheckCircle className="w-6 h-6 text-blue-600" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Votre statut actuel</h2>
                        {subscriptionStatus === 'trialing' && trialDaysLeft > 0 && (
                            <p className="font-semibold text-lg">Essai gratuit - {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} restant{trialDaysLeft > 1 ? 's' : ''}</p>
                        )}
                        {subscriptionStatus === 'monthly' && <p className="font-semibold text-lg">Abonné Mensuel</p>}
                        {subscriptionStatus === 'annual' && <p className="font-semibold text-lg">Abonné Annuel</p>}
                        {subscriptionStatus === 'lifetime' && <p className="font-semibold text-lg">Accès à Vie</p>}
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row justify-center items-stretch gap-8">
                {plans.map(plan => {
                    const isCurrent = profile?.plan_id === plan.priceId;
                    return (
                        <div key={plan.id} className={`w-full max-w-sm p-8 bg-white rounded-2xl shadow-lg border flex flex-col ${isCurrent ? 'border-2 border-blue-600' : ''}`}>
                            <div className="flex-grow">
                                <div className="h-7 mb-4 flex justify-center">
                                    {plan.badge && <span className={`px-3 py-1 text-xs font-semibold rounded-full ${plan.id === 'lifetime' ? 'bg-gradient-to-r from-amber-300 to-yellow-400 text-gray-900' : 'text-blue-800 bg-blue-100'}`}>{plan.badge}</span>}
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 text-center">{plan.name}</h3>
                                <p className="text-sm text-gray-500 mt-2 text-center">{plan.description}</p>
                                <div className="my-8 h-28 flex flex-col justify-center text-center">
                                    <div>
                                        <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
                                        <span className="text-xl font-medium text-gray-500"> {plan.per}</span>
                                    </div>
                                    {plan.id === 'annual' && <p className="text-sm font-semibold text-blue-600 mt-1">Soit 8$ par mois</p>}
                                </div>
                            </div>
                            <div>
                                <button
                                    onClick={() => handleSubscribe(plan)}
                                    disabled={isCurrent || loadingPlan}
                                    className={`w-full px-6 py-3 font-semibold rounded-lg transition-colors shadow-lg disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center ${plan.buttonClass}`}
                                >
                                    {loadingPlan === plan.id ? <Loader className="animate-spin w-5 h-5" /> : (isCurrent ? 'Plan Actuel' : plan.buttonText)}
                                </button>
                                {plan.id === 'lifetime' && <p className="text-center text-xs text-yellow-600 font-bold mt-4 h-10 flex items-center justify-center">⚠️ Offre limitée aux 100 premiers visionnaires.</p>}
                                <hr className="my-8" />
                                <ul className="space-y-3 text-sm">{featuresList.map((feature, index) => (<li key={index} className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span className="text-gray-700">{feature}</span></li>))}</ul>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SubscriptionPage;
