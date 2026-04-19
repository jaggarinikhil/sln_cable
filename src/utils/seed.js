import { storage } from './storage';
import { OWNER_PRESET, WORKER_PRESET } from './permissions';

export const seedData = () => {
    const users = storage.getUsers();

    if (users.length === 0) {
        const defaultUsers = [
            {
                id: '1',
                username: 'Jaggarinikhil',
                password: 'Nikhil@123',
                name: 'Nikhil',
                role: 'owner',
                permissions: OWNER_PRESET,
                active: true,
                isSuperAdmin: true,
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                username: 'mani',
                password: 'Mani@12',
                name: 'Mani',
                role: 'worker',
                permissions: WORKER_PRESET,
                active: true,
                isSuperAdmin: false,
                createdAt: new Date().toISOString()
            }
        ];
        storage.setUsers(defaultUsers);
        console.log('Database seeded with default users.');
    }
};
