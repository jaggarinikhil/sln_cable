export const createAuditTrail = (editedBy, changes) => {
    return {
        editedBy,
        editedAt: new Date().toISOString(),
        changes // Map of { field: [oldValue, newValue] }
    };
};

export const createPermissionHistory = (changedBy, changes) => {
    return {
        changedBy,
        changedAt: new Date().toISOString(),
        changes // Map of { permKey: [oldValue, newValue] }
    };
};
