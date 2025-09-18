export const exportUserDataAsJSON = (state) => {
    const dataToExport = {
        profile: {
            fullName: state.profile?.fullName,
            email: state.session?.user?.email,
        },
        settings: state.settings,
        projects: state.projects,
        tiers: state.tiers,
        allEntries: state.allEntries,
        allActuals: state.allActuals,
        allCashAccounts: state.allCashAccounts,
        scenarios: state.scenarios,
        scenarioEntries: state.scenarioEntries,
        loans: state.loans,
        notes: state.notes,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(dataToExport, null, 2)
    )}`;
    
    const link = document.createElement("a");
    link.href = jsonString;
    const date = new Date().toISOString().split('T')[0];
    link.download = `trezocash_export_${date}.json`;

    link.click();
};
