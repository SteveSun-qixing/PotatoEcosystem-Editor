/**
 * 编辑器插件服务
 * @module services/plugin-service
 */

import type { Component } from 'vue';
import yaml from 'yaml';
import type { ChipsSDK } from '@chips/sdk';
import type { PluginRegistration } from '@chips/sdk';
import { getEditorSdk } from './sdk-service';

interface PluginManifest {
  id?: string;
  name?: string;
  version?: string;
  description?: string;
  type?: string;
  cardType?: string;
  tags?: string[];
}

interface EditorPluginDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  cardTypes: string[];
  keywords?: string[];
  loadComponent?: () => Promise<Component>;
}

const manifestModules = import.meta.glob('../../../BasicCardPlugin/**/manifest.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const editorModules = import.meta.glob('../../../BasicCardPlugin/**/src/editor/*.vue');

function resolvePluginRootFromManifest(path: string): string {
  return path.replace(/\/manifest\.yaml$/, '');
}

function resolvePluginRootFromEditor(path: string): string {
  return path.replace(/\/src\/editor\/[^/]+$/, '');
}

function buildEditorModuleMap(): Map<string, Array<{ path: string; loader: () => Promise<unknown> }>> {
  const map = new Map<string, Array<{ path: string; loader: () => Promise<unknown> }>>();
  for (const [path, loader] of Object.entries(editorModules)) {
    const root = resolvePluginRootFromEditor(path);
    const entry = { path, loader };
    const list = map.get(root) ?? [];
    list.push(entry);
    map.set(root, list);
  }
  return map;
}

function selectEditorLoader(
  entries: Array<{ path: string; loader: () => Promise<unknown> }> = []
): (() => Promise<Component>) | undefined {
  if (entries.length === 0) return undefined;

  const scored = entries.map((entry) => {
    const fileName = entry.path.split('/').pop()?.toLowerCase() ?? '';
    const isEditor = fileName.endsWith('editor.vue');
    const isAuxiliary = fileName.includes('toolbar') || fileName.includes('content');
    const score = isEditor && !isAuxiliary ? 3 : isEditor ? 2 : fileName.includes('editor') ? 1 : 0;
    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return async () => {
    const bestEntry = scored[0];
    if (!bestEntry) {
      throw new Error('No plugin editor module found');
    }
    const module = await bestEntry.entry.loader();
    return (module as { default: Component }).default;
  };
}

function buildPluginDefinitions(): EditorPluginDefinition[] {
  const editorMap = buildEditorModuleMap();
  return Object.entries(manifestModules)
    .map(([path, raw]) => {
      try {
        const manifest = yaml.parse(raw as string) as PluginManifest;
        return { path, manifest };
      } catch {
        return null;
      }
    })
    .filter((entry): entry is { path: string; manifest: PluginManifest } => Boolean(entry))
    .filter((entry) => entry.manifest.type === 'base_card')
    .map((entry) => {
      const root = resolvePluginRootFromManifest(entry.path);
      const manifest = entry.manifest;
      const id = manifest.id ?? manifest.cardType ?? root;
      const name = manifest.name ?? id;
      const version = manifest.version ?? '0.0.0';
      const cardTypeId = manifest.cardType ?? manifest.id ?? id;
      const cardTypes = Array.from(new Set([cardTypeId, manifest.id].filter(Boolean))) as string[];
      const loadComponent = selectEditorLoader(editorMap.get(root));
      return {
        id,
        name,
        version,
        description: manifest.description,
        cardTypes,
        keywords: manifest.tags,
        loadComponent,
      };
    })
    .filter((plugin) => Boolean(plugin.id));
}

const BUILTIN_PLUGINS: EditorPluginDefinition[] = buildPluginDefinitions();

const componentCache = new Map<string, Component>();
let pluginsRegistered = false;

async function ensureRegistered(): Promise<ChipsSDK> {
  const sdk = await getEditorSdk();

  if (!pluginsRegistered) {
    for (const plugin of BUILTIN_PLUGINS) {
      const registration: PluginRegistration = {
        id: plugin.id,
        metadata: {
          id: plugin.id,
          name: plugin.name,
          version: plugin.version,
          description: plugin.description,
          keywords: plugin.keywords,
          chipStandardsVersion: '1.0.0',
        },
        activate: async () => {},
      };

      try {
        sdk.registerPlugin(registration);
      } catch {
        // ignore duplicate registration
      }

      try {
        await sdk.plugins.enable(plugin.id);
      } catch {
        // ignore enable errors for now
      }
    }
    pluginsRegistered = true;
  }

  return sdk;
}

export async function getEditorComponent(cardType: string): Promise<Component | null> {
  await ensureRegistered();
  const plugin = BUILTIN_PLUGINS.find((item) => item.cardTypes.includes(cardType));
  if (!plugin || !plugin.loadComponent) {
    return null;
  }

  if (componentCache.has(plugin.id)) {
    return componentCache.get(plugin.id) ?? null;
  }

  const component = await plugin.loadComponent();
  componentCache.set(plugin.id, component);
  return component;
}

export function getRegisteredPlugins(): EditorPluginDefinition[] {
  return [...BUILTIN_PLUGINS];
}
