/**
 * 测试卡片创建流程
 * 运行方式: npx tsx scripts/test-card-create.ts
 */

const DEV_FILE_SERVER = 'http://localhost:3456';
const WORKSPACE_ROOT = '/ProductFinishedProductTestingSpace/TestWorkspace';

/**
 * 将生态内路径转换为相对路径
 */
function toRelativePath(fullPath: string): string {
  const workspacePrefix = '/ProductFinishedProductTestingSpace/TestWorkspace';
  let relativePath = fullPath;
  if (fullPath.startsWith(workspacePrefix)) {
    relativePath = fullPath.slice(workspacePrefix.length + 1);
  }
  return relativePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

/**
 * 检查文件服务器
 */
async function checkDevFileServer(): Promise<boolean> {
  try {
    const response = await fetch(`${DEV_FILE_SERVER}/status`, { 
      method: 'GET',
      signal: AbortSignal.timeout(1000) 
    });
    return response.ok;
  } catch (e) {
    console.error('文件服务器检查失败:', e);
    return false;
  }
}

/**
 * 创建目录
 */
async function createDirectory(path: string): Promise<void> {
  console.log(`创建目录: ${path}`);
  const relativePath = toRelativePath(path);
  console.log(`相对路径: ${relativePath}`);
  
  const url = `${DEV_FILE_SERVER}/mkdir/${relativePath}`;
  console.log(`请求 URL: ${url}`);
  
  const response = await fetch(url, { method: 'POST' });
  const result = await response.json();
  console.log(`结果:`, result);
}

/**
 * 写入文件
 */
async function writeFile(path: string, content: string): Promise<void> {
  console.log(`写入文件: ${path}`);
  const relativePath = toRelativePath(path);
  console.log(`相对路径: ${relativePath}`);
  
  const url = `${DEV_FILE_SERVER}/file/${relativePath}`;
  console.log(`请求 URL: ${url}`);
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  const result = await response.json();
  console.log(`结果:`, result);
}

/**
 * 生成 ID
 */
function generateId(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 测试卡片创建流程 ===\n');
  
  // 1. 检查文件服务器
  console.log('1. 检查文件服务器...');
  const available = await checkDevFileServer();
  if (!available) {
    console.error('文件服务器不可用！请先运行: npm run dev:fs');
    process.exit(1);
  }
  console.log('文件服务器可用 ✓\n');
  
  // 2. 生成卡片信息
  const cardId = generateId();
  const cardName = '测试卡片';
  const basicCardId = generateId();
  
  console.log('2. 卡片信息:');
  console.log(`   ID: ${cardId}`);
  console.log(`   名称: ${cardName}`);
  console.log(`   基础卡片 ID: ${basicCardId}\n`);
  
  // 3. 创建目录结构
  console.log('3. 创建目录结构...');
  const cardPath = `${WORKSPACE_ROOT}/${cardId}`;
  await createDirectory(cardPath);
  await createDirectory(`${cardPath}/.card`);
  await createDirectory(`${cardPath}/content`);
  await createDirectory(`${cardPath}/cardcover`);
  console.log('');
  
  // 4. 写入元数据
  console.log('4. 写入元数据...');
  const timestamp = new Date().toISOString();
  const metadata = `chip_standards_version: "1.0"
card_id: "${cardId}"
name: "${cardName}"
created_at: "${timestamp}"
modified_at: "${timestamp}"
author: "Unknown"
tags: []
license: "CC BY-NC-SA 4.0"
version: "1.0.0"`;
  
  await writeFile(`${cardPath}/.card/metadata.yaml`, metadata);
  console.log('');
  
  // 5. 写入结构
  console.log('5. 写入结构...');
  const structure = `structure:
  - id: "${basicCardId}"
    type: "rich-text"
    config: {}
manifest:
  card_count: 1
  resource_count: 0
  resources: []`;
  
  await writeFile(`${cardPath}/.card/structure.yaml`, structure);
  console.log('');
  
  console.log('=== 测试完成 ===');
  console.log(`卡片路径: ${cardPath}`);
}

main().catch(console.error);
