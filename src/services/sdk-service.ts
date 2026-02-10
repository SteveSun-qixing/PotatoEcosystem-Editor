/**
 * SDK Service
 * @module services/sdk-service
 * @description 初始化并缓存编辑器使用的 ChipsSDK 实例
 */

import { ChipsSDK, type ChipsSDKOptions, CoreConnector } from '@chips/sdk';
import { LocalCoreConnector, LOCAL_CORE_DEFAULTS } from './local-core-connector';

const CORE_WS_URL = import.meta.env.VITE_CORE_WS_URL || 'ws://127.0.0.1:9527';

let sdkPromise: Promise<ChipsSDK> | null = null;
let connectorInstance: CoreConnector | null = null;

function createConnector(): CoreConnector {
  if (connectorInstance) return connectorInstance;

  if (import.meta.env.DEV) {
    connectorInstance = new LocalCoreConnector({
      baseUrl: import.meta.env.VITE_DEV_FILE_SERVER || LOCAL_CORE_DEFAULTS.baseUrl,
      rootPath: LOCAL_CORE_DEFAULTS.rootPath,
      workspaceRoot: LOCAL_CORE_DEFAULTS.workspaceRoot,
      externalRoot: LOCAL_CORE_DEFAULTS.externalRoot,
    });
  } else {
    connectorInstance = new CoreConnector({ url: CORE_WS_URL });
  }

  if (!connectorInstance) {
    throw new Error('Failed to create connector instance');
  }

  return connectorInstance;
}

export async function getEditorSdk(): Promise<ChipsSDK> {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      const connector = createConnector();
      const options: ChipsSDKOptions = {
        connectorInstance: connector,
        autoConnect: true,
        debug: import.meta.env.DEV,
      };
      const sdk = new ChipsSDK(options);
      await sdk.initialize();
      return sdk;
    })();
  }

  return sdkPromise;
}

export async function getEditorConnector(): Promise<CoreConnector> {
  const sdk = await getEditorSdk();
  return sdk.connector;
}
