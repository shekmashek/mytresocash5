import React, { useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { Star, ShieldCheck, Clock } from 'lucide-react';

const SubscriptionBadge = () => {
    const { state } = useBudget();
    const { profile, session } = state;

    const subscriptionInfo = useMemo(() => {
        if (!profile) return null;

        const status = profile.subscriptionStatus;

        if (status === 'lifetime') {
            return { text: 'À Vie', color: 'bg-amber-400 text-amber-900', icon: Star };
        }
        if (status === 'active') {
            return { text: 'Pro', color: 'bg-green-400 text-green-900', icon: ShieldCheck };
        }
        
        // Trial logic
        const trialEndDate = profile.trialEndsAt ? new Date(profile.trialEndsAt) :
                             session?.user?.created_at ? new Date(new Date(session.user.created_at).setDate(new Date(session.user.created_at).getDate() + 14)) : null;

        if (trialEndDate) {
            const daysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
            if (daysLeft > 0) {
                return { text: 'Essai', color: 'bg-blue-400 text-blue-900', icon: Clock };
            }
        }

        return null; // No badge if trial is over and not subscribed
    }, [profile, session]);

    if (!subscriptionInfo) return null;

    const Icon = subscriptionInfo.icon;

    return (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${subscriptionInfo.color}`}>
            <Icon className="w-3 h-3" />
            <span>{subscriptionInfo.text}</span>
        </div>
    );
};

export default SubscriptionBadge;
