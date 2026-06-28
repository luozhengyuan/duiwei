import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/storage/database/shared/schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:VebIYD2qc0c0ZF7w95@cp-great-sunup-c99b88a8.pg2.aidap-global.cn-beijing.volces.com:5432/postgres?sslmode=require';

const client = postgres(connectionString, { max: 1, ssl: 'require' });
const db = drizzle(client, { schema });

async function main() {
  try {
    // Check if blog_posts table exists and has data
    const tables = await client`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables:', tables.map(t => t.table_name));

    const posts = await db.select().from(schema.blogPosts);
    console.log('Blog posts count:', posts.length);
    
    if (posts.length === 0) {
      console.log('No blog posts found. Inserting sample data...');
      const samplePosts = [
        {
          title: '如何自然地要女生微信',
          summary: '要微信不是目的，建立连接才是。学会在合适的时机、用自然的方式获取联系方式...',
          content: `要微信不是目的，建立连接才是。

很多人觉得要微信是一件很尴尬的事，其实关键在于"自然"。

## 核心原则

不要为了要微信而要微信。你们应该先有一定的互动和好感基础，这时候要微信就是顺理成章的事。

## 实用技巧

1. **找到共同话题**：先聊几句，发现共同兴趣后再说"加个微信，以后可以一起交流"
2. **借助场景**：在活动现场、课堂上、工作中，以"方便联系"为由要微信
3. **幽默化解**：如果气氛轻松，可以直接说"我觉得你挺有趣的，加个微信认识一下？"

## 注意事项

- 被拒绝也不要尴尬，微笑说"没关系"就好
- 不要死缠烂打
- 要了微信后不要马上发一堆消息，保持适度

记住，自信但不油腻，真诚但不卑微，这才是最吸引人的状态。`
        },
        {
          title: '聊天时如何避免冷场',
          summary: '冷场不可怕，可怕的是不知道怎么打破冷场。掌握几个实用技巧，让对话永远有话题...',
          content: `冷场不可怕，可怕的是不知道怎么打破冷场。

## 为什么会冷场？

大部分冷场是因为双方都在等对方先开口，或者话题已经聊完了但没人开新话题。

## 实用技巧

1. **提前准备话题库**：最近看的电影、有趣的新闻、生活中的小事
2. **学会开放式提问**：不要问"是/否"问题，问"你觉得...""你怎么看..."
3. **分享自己的故事**：先分享自己的经历，对方更容易接话
4. **观察细节**：对方的朋友圈、穿搭、兴趣爱好都是话题来源

## 冷场急救包

- "对了，最近有看什么好电影/剧吗？"
- "你周末一般喜欢做什么？"
- "我最近遇到一件特别有意思的事..."

记住，聊天不是考试，不需要每句话都精彩。放松自然，冷场了笑笑就好。`
        },
        {
          title: '第一次约会去哪里比较好',
          summary: '第一次约会的地点选择很关键，既要方便聊天又要避免尴尬。几个推荐场景分享...',
          content: `第一次约会的地点选择很关键。

## 选择原则

- **方便聊天**：不要太吵
- **时间可控**：1-2小时为宜，感觉不好可以提前结束
- **有退路**：不要选需要长时间待在一起的地方

## 推荐场景

1. **咖啡馆**：经典选择，环境轻松，随时可以结束
2. **书店/文创店**：边逛边聊，自然不尴尬
3. **公园散步**：成本低，氛围好，适合聊天
4. **小型展览/市集**：有话题可聊，不会冷场

## 不推荐

- 电影院（无法交流）
- 正式餐厅（压力大）
- 酒吧（氛围不对）
- 长途旅行（太亲密）

记住，第一次约会的目的是互相了解，不是展示财力。选一个轻松的地方，让双方都舒服最重要。`
        }
      ];
      
      await db.insert(schema.blogPosts).values(samplePosts);
      console.log('Inserted 3 sample blog posts');
    }
    
    await client.end();
  } catch (err) {
    console.error('Error:', err);
    await client.end();
    process.exit(1);
  }
}

main();
