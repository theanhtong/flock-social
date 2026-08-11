import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, User } from '../src/generated/prisma/client.js';
import argon2 from 'argon2';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || 'postgresql://flock_user:flock_pass@localhost:5432/flock_social_db?schema=public',
});
const prisma = new PrismaClient({ adapter });

function generateSnowflake(index: number): bigint {
  const epoch = 1704067200000n; // 2024-01-01
  const now = BigInt(Date.now());
  const diff = now - epoch;
  return (diff << 22n) | (1n << 12n) | BigInt(index);
}

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await argon2.hash('Password123!');

  const usersData = [
    {
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'System Admin',
      bio: 'Platform administrator and lead system operator.',
      role: 'admin' as const,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    },
    {
      username: 'moderator',
      email: 'mod@example.com',
      displayName: 'Community Mod',
      bio: 'Keeping the Flock community safe and productive.',
      role: 'moderator' as const,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    },
    {
      username: 'johndoe',
      email: 'john@example.com',
      displayName: 'John Doe',
      bio: 'Fullstack developer, open source enthusiast & coffee lover ☕',
      location: 'San Francisco, CA',
      role: 'customer' as const,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    },
    {
      username: 'janedoe',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      bio: 'UI/UX Designer creating pixel-perfect digital experiences ✨',
      location: 'New York, NY',
      role: 'customer' as const,
      isVerified: false,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    },
    {
      username: 'alex_dev',
      email: 'alex@example.com',
      displayName: 'Alex Rivera',
      bio: 'Distributed systems & Rust enthusiast. Building the future of Web.',
      location: 'Austin, TX',
      role: 'customer' as const,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
    },
    {
      username: 'sarah_design',
      email: 'sarah@example.com',
      displayName: 'Sarah Connor',
      bio: 'Product manager & AI researcher. Connecting technology with people.',
      location: 'Seattle, WA',
      role: 'customer' as const,
      isVerified: false,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    },
    {
      username: 'michael_b',
      email: 'michael@example.com',
      displayName: 'Michael Brown',
      bio: 'Tech enthusiast, photographer & traveler 📸',
      location: 'London, UK',
      role: 'customer' as const,
      isVerified: false,
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    },
  ];

  const createdUsers: User[] = [];

  for (let i = 0; i < usersData.length; i++) {
    const uData = usersData[i];
    const userId = generateSnowflake(i + 1);

    const user = await prisma.user.upsert({
      where: { username: uData.username },
      update: {
        displayName: uData.displayName,
        bio: uData.bio,
        location: uData.location,
        avatarUrl: uData.avatarUrl,
        isVerified: uData.isVerified,
        role: uData.role,
      },
      create: {
        id: userId,
        username: uData.username,
        email: uData.email,
        passwordHash,
        displayName: uData.displayName,
        bio: uData.bio,
        location: uData.location,
        avatarUrl: uData.avatarUrl,
        role: uData.role,
        isVerified: uData.isVerified,
        status: 'active',
        settings: {
          create: {},
        },
      },
    });

    createdUsers.push(user);
    console.log(`👤 User created/updated: @${user.username} (${user.role})`);
  }

  // Create Follows
  const [admin, mod, john, jane, alex, sarah, michael] = createdUsers;

  const followPairs = [
    [john.id, jane.id],
    [john.id, alex.id],
    [john.id, sarah.id],
    [jane.id, john.id],
    [alex.id, john.id],
    [sarah.id, john.id],
    [michael.id, john.id],
    [alex.id, sarah.id],
    [sarah.id, alex.id],
  ];

  for (const [followerId, followingId] of followPairs) {
    await prisma.follow.upsert({
      where: {
        followerId_followingId: { followerId, followingId },
      },
      update: {},
      create: { followerId, followingId, isPending: false },
    });
  }

  // Update counts
  for (const user of createdUsers) {
    const followersCount = await prisma.follow.count({ where: { followingId: user.id } });
    const followingCount = await prisma.follow.count({ where: { followerId: user.id } });
    await prisma.user.update({
      where: { id: user.id },
      data: { followersCount, followingCount },
    });
  }

  // Create Posts
  const postsData = [
    {
      author: john,
      content: 'Hello Flock Social! Super excited to join this awesome new platform! 🚀 #welcome #tech',
    },
    {
      author: jane,
      content: 'Working on a fresh dark mode design system today. What do you think about deep navy backgrounds? 🎨✨',
    },
    {
      author: alex,
      content: 'Just deployed a new high-throughput event pipeline written in Rust. 🦀 Benchmarks looking super crisp!',
    },
    {
      author: sarah,
      content: 'AI and UX design are merging faster than ever. Are you experimenting with LLMs in your daily workflow?',
    },
    {
      author: admin,
      content: 'Welcome to Flock Social! Please check out community guidelines and stay safe online. 🛡️',
    },
  ];

  for (let i = 0; i < postsData.length; i++) {
    const pData = postsData[i];
    const postId = generateSnowflake(100 + i);

    const post = await prisma.post.upsert({
      where: { id: postId },
      update: {},
      create: {
        id: postId,
        userId: pData.author.id,
        content: pData.content,
        postType: 'post',
        status: 'active',
        audience: 'everyone',
      },
    });

    await prisma.user.update({
      where: { id: pData.author.id },
      data: { postsCount: { increment: 1 } },
    });

    console.log(`📝 Post created by @${pData.author.username}`);
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
