import React from 'react';
import { useAuth } from '../context/AuthContext';

const RequirePermission = ({ perm, children, fallback = null }) => {
    const { user } = useAuth();

    if (!user || (perm && !user.permissions[perm])) {
        return fallback;
    }

    return children;
};

export default RequirePermission;
