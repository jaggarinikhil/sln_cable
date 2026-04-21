import { storage } from './storage';
import { OWNER_PRESET, WORKER_PRESET } from './permissions';

export const seedData = async () => {
  const users = await storage.getUsers();

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
        createdAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
      },
    ];
    await storage.setUsers(defaultUsers);
    console.log('Database seeded with default users.');
  }
};
