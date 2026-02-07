/**
 * Card resource resolver
 * @module services/card-resource-resolver
 * @description 统一处理卡片资源路径解析、ObjectURL 创建与释放
 */

import { getEditorSdk } from './sdk-service';
import { LOCAL_CORE_DEFAULTS } from './local-core-connector';

export type CardResolvedResourceSource = 'sdk' | 'direct-fetch';

export interface CardResolvedResource {
  fullPath: string;
  url: string;
  source: CardResolvedResourceSource;
}

function normalizePathSegment(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+/g, '/');
}

export function isDirectResourceUrl(path: string): boolean {
  return (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  );
}

export function buildCardResourceFullPath(cardPath: string, resourcePath: string): string {
  const normalizedCardPath = normalizePathSegment(cardPath);
  const normalizedResourcePath = normalizePathSegment(resourcePath);
  return `${normalizedCardPath}/${normalizedResourcePath}`;
}

async function resolveByDirectFetch(fullPath: string): Promise<string> {
  const encodedPath = fullPath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  const devServerUrl = import.meta.env.VITE_DEV_FILE_SERVER || LOCAL_CORE_DEFAULTS.baseUrl;
  const url = `${devServerUrl}/file/${encodedPath}?binary=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Direct fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.type !== 'file' || !data.binary || !data.content) {
    throw new Error('Unexpected direct fetch response format');
  }

  const binaryStr = atob(data.content);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: data.mimeType || 'application/octet-stream' });
  return URL.createObjectURL(blob);
}

export async function resolveCardResourceUrl(fullPath: string): Promise<CardResolvedResource> {
  try {
    const sdk = await getEditorSdk();
    const url = await sdk.resources.createObjectUrl(fullPath);
    return { fullPath, url, source: 'sdk' };
  } catch {
    const url = await resolveByDirectFetch(fullPath);
    return { fullPath, url, source: 'direct-fetch' };
  }
}

export async function releaseCardResourceUrl(resource: CardResolvedResource): Promise<void> {
  if (resource.source === 'sdk') {
    try {
      const sdk = await getEditorSdk();
      sdk.resources.releaseObjectUrl(resource.fullPath);
    } catch {
      // ignore release failures
    }
    return;
  }

  URL.revokeObjectURL(resource.url);
}
