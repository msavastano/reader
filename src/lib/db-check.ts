
import { db } from '@/db';
import { users } from '@/db/schema';
import { count } from 'drizzle-orm';

export async function checkDatabase() {
  try {
    console.log('Checking database connection...');
    const userCount = await db.select({ count: count() }).from(users);
    console.log('Database connected. User count:', userCount[0].count);
    return { success: true, count: userCount[0].count };
  } catch (error) {
    console.error('Database check failed:', error);
    return { success: false, error };
  }
}
