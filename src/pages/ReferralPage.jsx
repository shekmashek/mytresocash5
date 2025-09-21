import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { supabase } from '../utils/supabase';
import { Gift, Mail, Copy, Loader, Users, CheckCircle } from 'lucide-react';

const ReferralPage = () => {
    const { state, dispatch } = useBudget();
    const { profile, session } = state;
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    const referralCode = profile?.referral_code;

    useEffect(() => {
        const fetchReferrals = async () => {
            if (!referralCode || !session?.user) {
                setLoading(false);
                return;
            }
            setLoading(true);
            const { data, error } = await supabase
                .from('referrals')
                .select('id, status, referred_user_id, created_at, profiles(full_name, email)')
                .eq('referrer_user_id', session.user.id);

            if (error) {
                dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
            } else {
                setReferrals(data.map(r => ({
                    id: r.id,
                    status: r.status,
                    date: r.created_at,
                    refereeName: r.profiles?.full_name || r.profiles?.email.split('@')[0] || 'Utilisateur invité',
                })));
            }
            setLoading(false);
        };
        fetchReferrals();
    }, [referralCode, session?.user?.id, dispatch]);

    const handleCopyToClipboard = () => {
        if (referralCode) {
            navigator.clipboard.writeText(referralCode);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Code de parrainage copié !', type: 'success' } });
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviting(true);
        // This is a mock implementation. In a real scenario, you would invoke a Supabase Edge Function.
        setTimeout(() => {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Invitation envoyée !', type: 'success' } });
            setInviteEmail('');
            setInviting(false);
        }, 1000);
    };

    const rewardsEarned = referrals.filter(r => r.status === 'completed').length;

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Gift className="w-8 h-8 text-blue-600" />
                    Parrainage
                </h1>
                <p className="text-gray-600 mt-1">Invitez vos amis et recevez des récompenses !</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Votre Code de Parrainage</h2>
                        <p className="text-sm text-gray-500 mb-4">Partagez ce code avec vos amis. Ils bénéficieront de 50% de réduction sur leur premier abonnement, et vous aussi !</p>
                        <div className="flex items-center gap-2 p-3 bg-gray-100 border-2 border-dashed rounded-lg">
                            <span className="text-lg font-bold text-gray-700 flex-grow">{referralCode || 'Génération...'}</span>
                            <button onClick={handleCopyToClipboard} disabled={!referralCode} className="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50">
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Inviter par E-mail</h2>
                        <form onSubmit={handleInvite} className="flex gap-2">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                placeholder="ami@exemple.com"
                                className="w-full px-3 py-2 border rounded-lg"
                                required
                            />
                            <button type="submit" disabled={inviting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-400">
                                {inviting ? <Loader className="animate-spin w-5 h-5" /> : <Mail className="w-5 h-5" />}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Vos Parrainages</h2>
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-4 text-center">
                        <p className="text-sm">Récompenses accumulées</p>
                        <p className="text-3xl font-bold">{rewardsEarned}</p>
                        <p className="text-xs">(1 récompense = 50% sur votre prochaine facture)</p>
                    </div>
                    
                    {loading ? (
                        <div className="text-center py-8"><Loader className="animate-spin mx-auto text-blue-600" /></div>
                    ) : referrals.length > 0 ? (
                        <ul className="space-y-3 max-h-60 overflow-y-auto">
                            {referrals.map(r => (
                                <li key={r.id} className="p-3 border rounded-md flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-700">{r.refereeName}</p>
                                        <p className="text-xs text-gray-500">Invité le {new Date(r.date).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {r.status === 'completed' ? 'Terminé' : 'En attente'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-8">Vous n'avez pas encore parrainé personne.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReferralPage;
