import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { useBudget } from '../context/BudgetContext';
import { Users, UserPlus, Mail, Trash2, Loader, AlertTriangle } from 'lucide-react';
import EmptyState from '../components/EmptyState';

const CollaborationPage = () => {
    const { state, dispatch } = useBudget();
    const { activeProjectId, projects } = state;
    const [collaborators, setCollaborators] = useState([]);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('viewer');
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);

    const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
    const isConsolidated = !activeProject || activeProject.isConsolidated;

    const fetchCollaborators = async () => {
        if (isConsolidated || !activeProjectId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('project_collaborators')
            .select(`
                id,
                role,
                user:users(id, email, raw_user_meta_data)
            `)
            .eq('project_id', activeProjectId);

        if (error) {
            dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
        } else {
            setCollaborators(data.map(c => ({
                id: c.id,
                role: c.role,
                email: c.user.email,
                name: c.user.raw_user_meta_data?.full_name || c.user.email.split('@')[0],
            })));
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCollaborators();
    }, [activeProjectId]);

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviting(true);
        try {
            const { data: invitedUser, error: userError } = await supabase.rpc('get_user_id_from_email', { p_email: email });
            if (userError || !invitedUser) {
                throw new Error("L'utilisateur avec cet e-mail n'existe pas dans Trezocash.");
            }

            const { error: inviteError } = await supabase
                .from('project_collaborators')
                .insert({
                    project_id: activeProjectId,
                    user_id: invitedUser,
                    role: role,
                    invited_by: state.session.user.id
                });
            
            if (inviteError) throw inviteError;

            dispatch({ type: 'ADD_TOAST', payload: { message: 'Invitation envoyée !', type: 'success' } });
            setEmail('');
            fetchCollaborators();
        } catch (error) {
            dispatch({ type: 'ADD_TOAST', payload: { message: error.message, type: 'error' } });
        }
        setInviting(false);
    };
    
    const handleRemove = async (collaborationId) => {
        dispatch({
            type: 'OPEN_CONFIRMATION_MODAL',
            payload: {
                title: 'Retirer le collaborateur ?',
                message: "Cette personne n'aura plus accès à ce projet.",
                onConfirm: async () => {
                    const { error } = await supabase.from('project_collaborators').delete().eq('id', collaborationId);
                    if (error) {
                        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
                    } else {
                        dispatch({ type: 'ADD_TOAST', payload: { message: 'Collaborateur retiré.', type: 'success' } });
                        fetchCollaborators();
                    }
                },
            }
        });
    };

    if (isConsolidated) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold">Vue Consolidée</h4>
                        <p className="text-sm">La gestion des collaborateurs se fait par projet. Veuillez sélectionner un projet spécifique pour gérer les accès.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-600" />
                    Collaborateurs
                </h1>
                <p className="text-gray-600 mt-1">Gérez qui peut accéder au projet "{activeProject?.name}".</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Inviter un nouveau collaborateur</h2>
                <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail du collaborateur</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nom@exemple.com" className="w-full px-3 py-2 border rounded-lg" required />
                    </div>
                    <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                        <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white">
                            <option value="viewer">Lecteur</option>
                            <option value="editor">Éditeur (Délégation)</option>
                        </select>
                    </div>
                    <button type="submit" disabled={inviting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-400">
                        {inviting ? <Loader className="animate-spin w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                        Inviter
                    </button>
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Collaborateurs Actuels</h2>
                {loading ? (
                    <div className="text-center py-8"><Loader className="animate-spin mx-auto text-blue-600" /></div>
                ) : collaborators.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {collaborators.map(c => (
                            <li key={c.id} className="py-3 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-800">{c.name}</p>
                                    <p className="text-sm text-gray-500">{c.email}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${c.role === 'editor' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {c.role === 'editor' ? 'Éditeur' : 'Lecteur'}
                                    </span>
                                    <button onClick={() => handleRemove(c.id)} className="p-1 text-gray-400 hover:text-red-600" title="Retirer l'accès">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState icon={Users} title="Aucun collaborateur" message="Vous êtes la seule personne à avoir accès à ce projet pour le moment." />
                )}
            </div>
        </div>
    );
};

export default CollaborationPage;
