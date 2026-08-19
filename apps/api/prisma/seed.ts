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
  console.log('🌱 Seeding rich comprehensive database dataset...');

  // Clean old sample data to prevent duplicate seeds
  await prisma.postMedia.deleteMany({});
  await prisma.commentLike.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.postLike.deleteMany({});
  await prisma.bookmark.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.messageMedia.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.userSanction.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.auditLog.deleteMany({});

  const passwordHash = await argon2.hash('Password123!');

  // 1. Seed Users (Roles: admin, moderator, customer, bot_system. Statuses: active, suspended, banned)
  const usersData = [
    {
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'System Admin',
      bio: 'Platform administrator and lead system operator 🛡️',
      role: 'admin' as const,
      status: 'active' as const,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    },
    {
      username: 'moderator',
      email: 'mod@example.com',
      displayName: 'Community Mod',
      bio: 'Keeping the Flock community safe, productive and clean ✨',
      role: 'moderator' as const,
      status: 'active' as const,
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
      status: 'active' as const,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    },
    {
      username: 'janedoe',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      bio: 'UI/UX Designer creating pixel-perfect digital experiences 🎨',
      location: 'New York, NY',
      role: 'customer' as const,
      status: 'active' as const,
      isVerified: false,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    },
    {
      username: 'alex_dev',
      email: 'alex@example.com',
      displayName: 'Alex Rivera',
      bio: 'Distributed systems & Rust enthusiast. Building the future of Web. 🦀',
      location: 'Austin, TX',
      role: 'customer' as const,
      status: 'active' as const,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
    },
    {
      username: 'sarah_design',
      email: 'sarah@example.com',
      displayName: 'Sarah Connor',
      bio: 'Product manager & AI researcher. Connecting technology with people. 💡',
      location: 'Seattle, WA',
      role: 'customer' as const,
      status: 'active' as const,
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
      status: 'active' as const,
      isVerified: false,
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    },
    {
      username: 'suspended_user',
      email: 'suspended@example.com',
      displayName: 'Suspended Account',
      bio: 'This account is currently suspended for policy violations.',
      role: 'customer' as const,
      status: 'suspended' as const,
      isVerified: false,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    },
    {
      username: 'banned_user',
      email: 'banned@example.com',
      displayName: 'Banned Account',
      bio: 'This account is permanently banned.',
      role: 'customer' as const,
      status: 'banned' as const,
      isVerified: false,
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
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
        status: uData.status,
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
        status: uData.status,
        settings: {
          create: {},
        },
      },
    });

    createdUsers.push(user);
    console.log(`👤 User created/updated: @${user.username} (Role: ${user.role}, Status: ${user.status})`);
  }

  const [admin, mod, john, jane, alex, sarah, michael, suspendedUser, bannedUser] = createdUsers;

  // 2. Seed Follows
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
    [mod.id, john.id],
    [admin.id, john.id],
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

  // Update follow counts
  for (const user of createdUsers) {
    const followersCount = await prisma.follow.count({ where: { followingId: user.id } });
    const followingCount = await prisma.follow.count({ where: { followerId: user.id } });
    await prisma.user.update({
      where: { id: user.id },
      data: { followersCount, followingCount },
    });
  }

  // 3. Seed Media Assets
  const sampleMedia1Id = generateSnowflake(801);
  const sampleMedia2Id = generateSnowflake(802);
  const sampleMedia3Id = generateSnowflake(803);
  const sampleMedia4Id = generateSnowflake(804);
  const sampleMedia5Id = generateSnowflake(805);

  const media1 = await prisma.media.upsert({
    where: { id: sampleMedia1Id },
    update: {},
    create: {
      id: sampleMedia1Id,
      uploaderId: alex.id,
      mediaType: 'image',
      originalUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
      width: 1200,
      height: 800,
      status: 'ready',
    },
  });

  const media2 = await prisma.media.upsert({
    where: { id: sampleMedia2Id },
    update: {},
    create: {
      id: sampleMedia2Id,
      uploaderId: jane.id,
      mediaType: 'image',
      originalUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=300&q=80',
      width: 1200,
      height: 800,
      status: 'ready',
    },
  });

  const media3 = await prisma.media.upsert({
    where: { id: sampleMedia3Id },
    update: {},
    create: {
      id: sampleMedia3Id,
      uploaderId: michael.id,
      mediaType: 'image',
      originalUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=300&q=80',
      width: 1200,
      height: 800,
      status: 'ready',
    },
  });

  const media4 = await prisma.media.upsert({
    where: { id: sampleMedia4Id },
    update: {},
    create: {
      id: sampleMedia4Id,
      uploaderId: jane.id,
      mediaType: 'image',
      originalUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=80',
      width: 1200,
      height: 800,
      status: 'ready',
    },
  });

  const media5 = await prisma.media.upsert({
    where: { id: sampleMedia5Id },
    update: {},
    create: {
      id: sampleMedia5Id,
      uploaderId: michael.id,
      mediaType: 'image',
      originalUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80',
      width: 1200,
      height: 800,
      status: 'ready',
    },
  });

  // 4. Seed Posts (Original, Reposts, Edited, Media)
  const post1Id = generateSnowflake(101);
  const post2Id = generateSnowflake(102);
  const post3Id = generateSnowflake(103);
  const post4Id = generateSnowflake(104);
  const post5Id = generateSnowflake(105);
  const post6Id = generateSnowflake(106);
  const post7Id = generateSnowflake(107);
  const post8Id = generateSnowflake(108);
  const post9Id = generateSnowflake(109);
  const post10Id = generateSnowflake(110);
  const post11Id = generateSnowflake(111);
  const post12Id = generateSnowflake(112);
  const post13Id = generateSnowflake(113);
  const post14Id = generateSnowflake(114);
  const post15Id = generateSnowflake(115);

  const post1 = await prisma.post.upsert({
    where: { id: post1Id },
    update: {},
    create: {
      id: post1Id,
      userId: john.id,
      content: 'Hello Flock Social! Super excited to join this awesome platform! 🚀 #welcome #tech',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
      likeCount: 4,
      commentCount: 2,
      repostCount: 1,
    },
  });

  const post2 = await prisma.post.upsert({
    where: { id: post2Id },
    update: {},
    create: {
      id: post2Id,
      userId: alex.id,
      content: 'Just deployed a new high-performance system architecture. Check out this abstract tech render! 🦀✨',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
      likeCount: 3,
      commentCount: 1,
      media: {
        create: [{ mediaId: media1.id, displayOrder: 0 }],
      },
    },
  });

  const post3 = await prisma.post.upsert({
    where: { id: post3Id },
    update: {},
    create: {
      id: post3Id,
      userId: jane.id,
      content: 'Exploring modern UI design systems with Tailwind CSS & Glassmorphism. What do you think? (Updated with new specs)',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
      isEdited: true,
      likeCount: 5,
      media: {
        create: [{ mediaId: media2.id, displayOrder: 0 }],
      },
    },
  });

  const post4 = await prisma.post.upsert({
    where: { id: post4Id },
    update: {},
    create: {
      id: post4Id,
      userId: sarah.id,
      content: 'Totally agree with @johndoe! Excited for what is coming next! 🔥',
      postType: 'repost',
      repostOfId: post1Id,
      status: 'active',
      audience: 'everyone',
      likeCount: 2,
    },
  });

  const post5 = await prisma.post.upsert({
    where: { id: post5Id },
    update: {},
    create: {
      id: post5Id,
      userId: michael.id,
      content: 'Coffee & Code morning setup! Minimalist desk vibes ☕💻',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
      likeCount: 7,
      media: {
        create: [{ mediaId: media3.id, displayOrder: 0 }],
      },
    },
  });

  const post6 = await prisma.post.upsert({
    where: { id: post6Id },
    update: {},
    create: {
      id: post6Id,
      userId: admin.id,
      content: 'Welcome to Flock Social! Please check out community guidelines and stay safe online. 🛡️',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
      likeCount: 12,
    },
  });

  const post7 = await prisma.post.upsert({
    where: { id: post7Id },
    update: {},
    create: {
      id: post7Id,
      userId: john.id,
      content: 'What is your favorite tech stack in 2026? Next.js + NestJS + Prisma is working like a charm. ⚡',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
      likeCount: 6,
    },
  });

  const post8 = await prisma.post.upsert({
    where: { id: post8Id },
    update: {},
    create: {
      id: post8Id,
      userId: mod.id,
      content: 'Friendly reminder to keep discussions productive and respectful across all feeds! 🌟',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
      likeCount: 3,
    },
  });

  const post9 = await prisma.post.upsert({
    where: { id: post9Id },
    update: {},
    create: {
      id: post9Id,
      userId: alex.id,
      content: 'Distributed consensus algorithms in Rust are mind-bendingly fun to write. 🦀',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
      likeCount: 8,
    },
  });

  const post10 = await prisma.post.upsert({
    where: { id: post10Id },
    update: {},
    create: {
      id: post10Id,
      userId: jane.id,
      content: 'Working on dark mode palette options. Deep Navy vs Cyber Charcoal? 🎨',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
      likeCount: 9,
      media: {
        create: [{ mediaId: media4.id, displayOrder: 0 }],
      },
    },
  });

  const post11 = await prisma.post.upsert({
    where: { id: post11Id },
    update: {},
    create: {
      id: post11Id,
      userId: sarah.id,
      content: 'Product launch roadmap for Q3 is looking super promising. Can not wait to share more! 🚀',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
      likeCount: 4,
    },
  });

  const post12 = await prisma.post.upsert({
    where: { id: post12Id },
    update: {},
    create: {
      id: post12Id,
      userId: michael.id,
      content: 'Sunset captured yesterday during travel. Nature is the ultimate artist 🌄',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
      likeCount: 11,
      media: {
        create: [{ mediaId: media5.id, displayOrder: 0 }],
      },
    },
  });

  const post13 = await prisma.post.upsert({
    where: { id: post13Id },
    update: {},
    create: {
      id: post13Id,
      userId: john.id,
      content: 'Just open-sourced a new micro-library for responsive state management! Check it out.',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
      likeCount: 5,
    },
  });

  const post14 = await prisma.post.upsert({
    where: { id: post14Id },
    update: {},
    create: {
      id: post14Id,
      userId: alex.id,
      content: 'Love this design direction by @janedoe! 🎨',
      postType: 'repost',
      repostOfId: post10Id,
      status: 'active',
      audience: 'everyone',
      likeCount: 3,
    },
  });

  const post16Id = generateSnowflake(116);
  const post17Id = generateSnowflake(117);
  const post18Id = generateSnowflake(118);
  const post19Id = generateSnowflake(119);
  const post20Id = generateSnowflake(120);
  const post21Id = generateSnowflake(121);
  const post22Id = generateSnowflake(122);
  const post23Id = generateSnowflake(123);
  const post24Id = generateSnowflake(124);
  const post25Id = generateSnowflake(125);

  await prisma.post.upsert({
    where: { id: post16Id },
    update: {},
    create: {
      id: post16Id,
      userId: jane.id,
      content: 'Design sprint workshop starts tomorrow! Excited to share our new UI kit. 🎨',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
    },
  });

  await prisma.post.upsert({
    where: { id: post17Id },
    update: {},
    create: {
      id: post17Id,
      userId: alex.id,
      content: 'Memory safety in Rust vs C++. Here is what we learned from our benchmark suite. 🦀',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
    },
  });

  await prisma.post.upsert({
    where: { id: post18Id },
    update: {},
    create: {
      id: post18Id,
      userId: michael.id,
      content: 'Late night coding session with lo-fi beats. What is on your focus playlist? 🎧',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
    },
  });

  await prisma.post.upsert({
    where: { id: post19Id },
    update: {},
    create: {
      id: post19Id,
      userId: sarah.id,
      content: 'User feedback synthesis report is complete! Key takeaway: speed & simplicity win. 💡',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
    },
  });

  await prisma.post.upsert({
    where: { id: post20Id },
    update: {},
    create: {
      id: post20Id,
      userId: john.id,
      content: 'PostgreSQL optimization tip: Always index your cursor columns and Snowflake IDs! ⚡',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
    },
  });

  await prisma.post.upsert({
    where: { id: post21Id },
    update: {},
    create: {
      id: post21Id,
      userId: admin.id,
      content: 'Monthly platform metrics summary: User engagement up 45% this sprint! 📊',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
    },
  });

  await prisma.post.upsert({
    where: { id: post22Id },
    update: {},
    create: {
      id: post22Id,
      userId: mod.id,
      content: 'Audit log monitoring active. All security policies strictly enforced. 🛡️',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
    },
  });

  await prisma.post.upsert({
    where: { id: post23Id },
    update: {},
    create: {
      id: post23Id,
      userId: jane.id,
      content: 'Clean typographic hierarchy is 80% of great web design. Keep line lengths under 75 characters. 📐',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
    },
  });

  await prisma.post.upsert({
    where: { id: post24Id },
    update: {},
    create: {
      id: post24Id,
      userId: alex.id,
      content: 'WebSocket connection auto-reconnect exponential backoff working seamlessly. 🚀',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
    },
  });

  await prisma.post.upsert({
    where: { id: post25Id },
    update: {},
    create: {
      id: post25Id,
      userId: michael.id,
      content: 'Weekend trip to the mountains. Fresh air and zero notifications! 🌲⛰️',
      postType: 'post',
      status: 'active',
      audience: 'everyone',
    },
  });

  // 5. Seed Comments & Replies
  const comment1Id = generateSnowflake(301);
  const reply1Id = generateSnowflake(302);
  const comment2Id = generateSnowflake(303);
  const comment3Id = generateSnowflake(304);
  const comment4Id = generateSnowflake(305);
  const comment5Id = generateSnowflake(306);
  const comment6Id = generateSnowflake(307);

  await prisma.comment.upsert({
    where: { id: comment1Id },
    update: {},
    create: {
      id: comment1Id,
      postId: post1Id,
      userId: jane.id,
      content: 'Welcome to the platform John! Great to have you here! 🎉',
      likeCount: 2,
    },
  });

  await prisma.comment.upsert({
    where: { id: reply1Id },
    update: {},
    create: {
      id: reply1Id,
      postId: post1Id,
      userId: john.id,
      parentCommentId: comment1Id,
      content: 'Thanks Jane! Excited to collaborate! 🙌',
      likeCount: 1,
    },
  });

  await prisma.comment.upsert({
    where: { id: comment2Id },
    update: {},
    create: {
      id: comment2Id,
      postId: post2Id,
      userId: john.id,
      content: 'That system architecture looks super clean Alex!',
      likeCount: 3,
    },
  });

  await prisma.comment.upsert({
    where: { id: comment3Id },
    update: {},
    create: {
      id: comment3Id,
      postId: post3Id,
      userId: alex.id,
      content: 'Glassmorphism dark mode specs look amazing!',
      likeCount: 2,
    },
  });

  await prisma.comment.upsert({
    where: { id: comment4Id },
    update: {},
    create: {
      id: comment4Id,
      postId: post5Id,
      userId: sarah.id,
      content: 'Love the desk setup! What monitor arm is that?',
      likeCount: 4,
    },
  });

  await prisma.comment.upsert({
    where: { id: comment5Id },
    update: {},
    create: {
      id: comment5Id,
      postId: post10Id,
      userId: michael.id,
      content: 'Deep Navy gets my vote! Very clean on OLED displays.',
      likeCount: 1,
    },
  });

  await prisma.comment.upsert({
    where: { id: comment6Id },
    update: {},
    create: {
      id: comment6Id,
      postId: post17Id,
      userId: john.id,
      content: 'Would love to see the Rust benchmarks blog post when published!',
      likeCount: 2,
    },
  });

  // 6. Seed Post Likes & Bookmarks
  await prisma.postLike.upsert({
    where: { postId_userId: { userId: jane.id, postId: post1Id } },
    update: {},
    create: { userId: jane.id, postId: post1Id },
  });
  await prisma.postLike.upsert({
    where: { postId_userId: { userId: alex.id, postId: post1Id } },
    update: {},
    create: { userId: alex.id, postId: post1Id },
  });
  await prisma.bookmark.upsert({
    where: { userId_postId: { userId: john.id, postId: post2Id } },
    update: {},
    create: { userId: john.id, postId: post2Id },
  });

  // 7. Auto Sync commentCount & likeCount for all posts to match actual DB records exactly
  const allPosts = await prisma.post.findMany({ select: { id: true } });
  for (const p of allPosts) {
    const cCount = await prisma.comment.count({ where: { postId: p.id } });
    const lCount = await prisma.postLike.count({ where: { postId: p.id } });
    await prisma.post.update({
      where: { id: p.id },
      data: { commentCount: cCount, likeCount: lCount },
    });
  }

  // 7. Seed Notifications (Follows, Likes, Comments, Reposts, System Warning)
  const notif1Id = generateSnowflake(401);
  const notif2Id = generateSnowflake(402);
  const notif3Id = generateSnowflake(403);
  const notif4Id = generateSnowflake(404);
  const notif5Id = generateSnowflake(405);

  await prisma.notification.upsert({
    where: { id: notif1Id },
    update: {},
    create: {
      id: notif1Id,
      receiverId: john.id,
      actorId: jane.id,
      type: 'follow',
      isRead: true,
    },
  });

  await prisma.notification.upsert({
    where: { id: notif2Id },
    update: {},
    create: {
      id: notif2Id,
      receiverId: john.id,
      actorId: alex.id,
      type: 'like',
      entityId: post1Id,
      isRead: false,
    },
  });

  await prisma.notification.upsert({
    where: { id: notif3Id },
    update: {},
    create: {
      id: notif3Id,
      receiverId: john.id,
      actorId: sarah.id,
      type: 'repost',
      entityId: post1Id,
      isRead: false,
    },
  });

  await prisma.notification.upsert({
    where: { id: notif4Id },
    update: {},
    create: {
      id: notif4Id,
      receiverId: john.id,
      actorId: mod.id,
      type: 'dm_message',
      isRead: false,
    },
  });

  await prisma.notification.upsert({
    where: { id: notif5Id },
    update: {},
    create: {
      id: notif5Id,
      receiverId: suspendedUser.id,
      actorId: admin.id,
      type: 'follow_request',
      isRead: false,
    },
  });

  // 8. Seed Direct & Group Conversations
  const directConvId = generateSnowflake(501);
  const groupConvId = generateSnowflake(502);

  // Direct DM Conversation between John & Jane
  await prisma.conversation.upsert({
    where: { id: directConvId },
    update: {},
    create: {
      id: directConvId,
      type: 'direct',
      members: {
        create: [
          { userId: john.id, role: 'member', folder: 'main', requestStatus: 'accepted' },
          { userId: jane.id, role: 'member', folder: 'main', requestStatus: 'accepted' },
        ],
      },
    },
  });

  const msg1Id = generateSnowflake(601);
  const msg2Id = generateSnowflake(602);

  await prisma.message.upsert({
    where: { id: msg1Id },
    update: {},
    create: {
      id: msg1Id,
      conversationId: directConvId,
      senderId: jane.id,
      content: 'Hey John, check out the new design system components!',
      messageType: 'text',
    },
  });

  await prisma.message.upsert({
    where: { id: msg2Id },
    update: {},
    create: {
      id: msg2Id,
      conversationId: directConvId,
      senderId: john.id,
      content: 'Looks awesome Jane! Really love the soft colors.',
      messageType: 'text',
    },
  });

  // Group Conversation: "Flock Engineering Team"
  await prisma.conversation.upsert({
    where: { id: groupConvId },
    update: {},
    create: {
      id: groupConvId,
      type: 'group',
      title: 'Flock Engineering Team',
      members: {
        create: [
          { userId: admin.id, role: 'owner', folder: 'main', requestStatus: 'accepted' },
          { userId: mod.id, role: 'monitor', folder: 'main', requestStatus: 'accepted' },
          { userId: alex.id, role: 'member', folder: 'main', requestStatus: 'accepted' },
          { userId: john.id, role: 'member', folder: 'main', requestStatus: 'accepted' },
        ],
      },
    },
  });

  const groupMsgId = generateSnowflake(603);
  await prisma.message.upsert({
    where: { id: groupMsgId },
    update: {},
    create: {
      id: groupMsgId,
      conversationId: groupConvId,
      senderId: admin.id,
      content: 'Welcome everyone to the Flock Core Engineering channel! 🚀',
      messageType: 'text',
    },
  });

  // 9. Seed Reports, Sanctions & Audit Logs
  const report1Id = generateSnowflake(701);
  const report2Id = generateSnowflake(702);

  // Pending Report on a post
  await prisma.report.upsert({
    where: { id: report1Id },
    update: {},
    create: {
      id: report1Id,
      reporterId: jane.id,
      targetType: 'post',
      targetId: post2Id,
      reason: 'spam',
      details: 'Please check if this contains unauthorized promotion.',
      status: 'pending',
    },
  });

  // Resolved Report resulting in suspension
  await prisma.report.upsert({
    where: { id: report2Id },
    update: {},
    create: {
      id: report2Id,
      reporterId: alex.id,
      targetType: 'user',
      targetId: suspendedUser.id,
      reason: 'harassment',
      details: 'Repeated offensive comments in public feeds.',
      status: 'resolved',
      reviewedById: mod.id,
      reviewedAt: new Date(Date.now() - 86400000),
      resolution: 'Account suspended for 7 days.',
    },
  });

  // Sanctions
  const sanction1Id = generateSnowflake(751);
  const sanction2Id = generateSnowflake(752);

  await prisma.userSanction.upsert({
    where: { id: sanction1Id },
    update: {},
    create: {
      id: sanction1Id,
      userId: suspendedUser.id,
      issuedById: mod.id,
      reportId: report2Id,
      type: 'suspension',
      reason: 'Repeated community violations',
      status: 'active',
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });

  await prisma.userSanction.upsert({
    where: { id: sanction2Id },
    update: {},
    create: {
      id: sanction2Id,
      userId: bannedUser.id,
      issuedById: admin.id,
      type: 'ban',
      reason: 'Permanent ban for severe abuse',
      status: 'active',
    },
  });

  // Audit Logs
  const audit1Id = generateSnowflake(781);
  await prisma.auditLog.upsert({
    where: { id: audit1Id },
    update: {},
    create: {
      id: audit1Id,
      adminId: admin.id,
      action: 'create',
      targetId: bannedUser.id,
      targetType: 'sanction',
      metadata: { reason: 'Permanent ban for severe abuse' },
    },
  });

  console.log('✅ Rich comprehensive dataset seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
