export const PROVIDER_AUTH_MODES = Object.freeze({
  MANUAL: 'manual',
  GATEWAY: 'gateway'
});

export const PROVIDER_ROUTE_MODES = Object.freeze({
  IMAGES: 'images',
  RESPONSES: 'responses',
  AUTO: 'auto'
});

export const PROVIDER_ADAPTER_TYPES = Object.freeze({
  OPENAI_COMPATIBLE_HTTP: 'openai-compatible-http'
});

const OPENAI_COMPATIBLE_ROUTES = Object.freeze({
  generations: '/v1/images/generations',
  edits: '/v1/images/edits',
  assistant: '/v1/chat/completions',
  responses: '/v1/responses'
});

const OPENAI_IMAGE_CAPABILITIES = Object.freeze({
  textToImage: true,
  imageEdit: true,
  referenceImages: true,
  mask: true,
  streamingImages: false,
  modelSync: false,
  accountKeys: false
});

const OPENAI_IMAGE_PARAMETERS = Object.freeze({
  routeMode: PROVIDER_ROUTE_MODES.AUTO,
  sizes: Object.freeze(['1024x1024', '1024x1536', '1536x1024', 'auto']),
  resolutionTiers: Object.freeze(['1k', '2k', '4k']),
  qualities: Object.freeze(['low', 'medium', 'high', 'auto']),
  outputFormats: Object.freeze(['png', 'jpeg', 'webp']),
  countRange: Object.freeze([1, 4]),
  maxReferenceImages: 4,
  defaultImageModel: 'gpt-image-2',
  defaultAssistantModel: 'gpt-5.5'
});

export const IMAGE_PROVIDER_REGISTRY = Object.freeze([
  Object.freeze({
    id: 'openai-compatible',
    label: 'OpenAI-compatible API',
    authMode: PROVIDER_AUTH_MODES.MANUAL,
    adapterType: PROVIDER_ADAPTER_TYPES.OPENAI_COMPATIBLE_HTTP,
    routes: OPENAI_COMPATIBLE_ROUTES,
    capabilities: OPENAI_IMAGE_CAPABILITIES,
    parameters: OPENAI_IMAGE_PARAMETERS
  }),
  Object.freeze({
    id: 'newapi-compatible',
    label: 'NewAPI-compatible Gateway',
    authMode: PROVIDER_AUTH_MODES.MANUAL,
    adapterType: PROVIDER_ADAPTER_TYPES.OPENAI_COMPATIBLE_HTTP,
    routes: OPENAI_COMPATIBLE_ROUTES,
    capabilities: Object.freeze({
      ...OPENAI_IMAGE_CAPABILITIES,
      modelSync: true
    }),
    parameters: OPENAI_IMAGE_PARAMETERS
  }),
  Object.freeze({
    id: 'nano-banana-compatible',
    label: 'Nano Banana / Image Gateway',
    authMode: PROVIDER_AUTH_MODES.MANUAL,
    adapterType: PROVIDER_ADAPTER_TYPES.OPENAI_COMPATIBLE_HTTP,
    routes: OPENAI_COMPATIBLE_ROUTES,
    capabilities: Object.freeze({
      ...OPENAI_IMAGE_CAPABILITIES,
      modelSync: true
    }),
    parameters: Object.freeze({
      ...OPENAI_IMAGE_PARAMETERS,
      defaultImageModel: 'nano-banana'
    })
  }),
  Object.freeze({
    id: 'video-compatible',
    label: 'Video Model Gateway',
    authMode: PROVIDER_AUTH_MODES.MANUAL,
    adapterType: PROVIDER_ADAPTER_TYPES.OPENAI_COMPATIBLE_HTTP,
    routes: OPENAI_COMPATIBLE_ROUTES,
    capabilities: Object.freeze({
      ...OPENAI_IMAGE_CAPABILITIES,
      modelSync: true
    }),
    parameters: Object.freeze({
      ...OPENAI_IMAGE_PARAMETERS,
      defaultImageModel: 'gpt-image-2',
      defaultVideoModel: 'veo3'
    })
  }),
  Object.freeze({
    id: 'gateway-account',
    label: 'Gateway Account',
    authMode: PROVIDER_AUTH_MODES.GATEWAY,
    adapterType: PROVIDER_ADAPTER_TYPES.OPENAI_COMPATIBLE_HTTP,
    routes: Object.freeze({
      ...OPENAI_COMPATIBLE_ROUTES,
      profile: '/api/v1/user/profile',
      keys: '/api/v1/keys',
      models: '/v1/models'
    }),
    capabilities: Object.freeze({
      ...OPENAI_IMAGE_CAPABILITIES,
      modelSync: true,
      accountKeys: true
    }),
    parameters: OPENAI_IMAGE_PARAMETERS
  })
]);

export const DEFAULT_IMAGE_PROVIDER_ID = 'gateway-account';

export function normalizeProviderId(id, authMode = '') {
  const value = String(id || '').trim();
  if (findImageProvider(value)) return value;
  if (authMode === PROVIDER_AUTH_MODES.MANUAL) return 'openai-compatible';
  return DEFAULT_IMAGE_PROVIDER_ID;
}

export function findImageProvider(id) {
  return IMAGE_PROVIDER_REGISTRY.find((provider) => provider.id === id) || null;
}

export function getImageProvider(id, authMode = '') {
  return findImageProvider(normalizeProviderId(id, authMode)) || findImageProvider(DEFAULT_IMAGE_PROVIDER_ID);
}

export function providerUsesGatewayAccount(providerOrId) {
  const provider = typeof providerOrId === 'string' ? getImageProvider(providerOrId) : providerOrId;
  return provider?.authMode === PROVIDER_AUTH_MODES.GATEWAY;
}

export function providerSupports(providerOrId, capability) {
  const provider = typeof providerOrId === 'string' ? getImageProvider(providerOrId) : providerOrId;
  return Boolean(provider?.capabilities?.[capability]);
}

export function providerRoute(providerOrId, routeName) {
  const provider = typeof providerOrId === 'string' ? getImageProvider(providerOrId) : providerOrId;
  return provider?.routes?.[routeName] || '';
}
