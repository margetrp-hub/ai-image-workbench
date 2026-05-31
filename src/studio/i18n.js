export const LANGUAGE_STORAGE_KEY = 'image-sub2api-studio-language';

export const SUPPORTED_LANGUAGES = [
  { value: 'zh-CN', shortLabel: '中', label: '简体中文' },
  { value: 'en', shortLabel: 'EN', label: 'English' }
];

const dictionaries = {
  'zh-CN': {
    app: {
      title: '创作工作台',
      brand: '创作工作台',
      back: '返回画廊'
    },
    language: {
      switchTo: 'Switch to English',
      current: '当前语言：简体中文',
      button: '中'
    },
    workspace: {
      image: '图片创作',
      inspiration: '灵感库',
      video: '视频创作',
      history: '历史图库',
      desk: '工作台'
    },
    topbar: {
      navAria: '创作工作区',
      login: '登录',
      logout: '退出',
      light: '切换浅色',
      dark: '切换深色'
    },
    rail: {
      aria: '创作侧栏',
      collapse: '收起侧栏',
      expand: '展开侧栏',
      session: '会话',
      history: '历史图库',
      settings: '连接设置',
      brand: '工作台',
      brandMeta: '创作',
      newSession: '新建会话',
      workspaces: '工作区',
      project: '项目',
      all: '全部',
      current: '当前',
      noProject: '还没有项目',
      noProjectHint: '新建会话后，生成记录会出现在这里。',
      videoGeneration: '视频生成',
      unnamedSession: '未命名会话',
      nodeCount: '{count} 节点',
      video: '视频',
      imageCount: '{count} 张',
      delete: '删除',
      clearCurrent: '清空当前会话',
      loggedIn: '已登录用户',
      notLoggedIn: '未登录',
      hiddenKey: 'Key 已隐藏',
      chooseKey: '选择 Key',
      light: '切换浅色',
      dark: '切换深色'
    },
    lock: {
      protected: '素材库和提示词已保护，登录后加载。'
    },
    canvas: {
      toolbar: '画布工具',
      zoomOut: '缩小画布',
      zoomIn: '放大画布',
      reset: '重置',
      title: '画布',
      empty: '在底部输入想法并生成，第一张会成为 #1；选中任意图片后，再补充要求即可继续延伸。',
      recovering: '图片正在恢复，若仍为空请从历史图库重新打开本次会话'
    },
    references: {
      title: '参考图（可选）',
      maskTitle: '参考图与蒙版',
      collapse: '收起参考图',
      selected: '已选择 {count} 张',
      upload: '拖拽 / 粘贴 / 上传参考图',
      collapsedSelected: '参考图已收起，共 {count} 张',
      collapsedEmpty: '参考图已收起，点击展开拖拽、粘贴或上传。',
      maskCollapsed: '参考图与蒙版已收起，点击展开继续编辑。'
    },
    composer: {
      expand: '展开对话',
      collapse: '收起对话',
      title: '把想法说出来，先整理，再生成',
      selected: '基于画布 #{index}',
      defaultTitle: '提示词优化与生成',
      placeholderCanvas: '和 AI 说你想怎样延续这张画布：换背景、加产品、调整风格...',
      placeholder: '和 AI 说你的创作想法，它会帮你整理成可生成的提示词。',
      send: '发送到提示词助手，会调用对话模型并使用当前 Key 额度',
      queue: '生成队列',
      queueRunning: '1 个生成中',
      queueIdle: '当前空闲',
      queueWaiting: '{count} 个排队',
      statusGenerating: '正在生成',
      statusDone: '生成完成',
      statusReview: '需要确认',
      statusError: '生成异常',
      status: '生成状态',
      generate: '生成',
      retry: '重试',
      confirmRetry: '确认重试',
      queueMore: '加入队列'
    },
    params: {
      aria: '参数',
      current: '当前参数',
      expand: '展开参数栏',
      collapse: '收起参数栏',
      close: '收起参数',
      model: '模型',
      size: '尺寸',
      quality: '质量',
      count: '数量',
      generate: '生成',
      imageModel: '图片模型',
      videoModel: '视频模型',
      imageCount: '图片数量',
      aspect: '尺寸比例',
      apiSize: '接口尺寸',
      sizeHint: '这里是当前模型支持的 size 枚举；2K/4K 会写进提示词作为目标清晰度。',
      resolutionHint: '分辨率档位会追加到生成要求里',
      generateImage: '按当前参数生成图片',
      generateVideo: '按当前参数生成视频',
      retryParams: '重试当前参数',
      confirmRetry: '确认后重试',
      queueMore: '加入队列'
    },
    settings: {
      title: '连接',
      close: '关闭',
      key: '密钥',
      custom: '自定义',
      login: '登录',
      noKey: '暂无可用 Key',
      gateway: '接口地址',
      hint: '接口会自动选择：普通生图走 /v1/images/generations；参考图编辑和 Mask 走 /v1/images/edits。助手模型只用于底部提示词优化，会消耗当前 Key 额度。',
      assistantModel: '助手模型',
      previewFrames: '预览帧',
      clear: '清除',
      done: '完成'
    }
  },
  en: {
    app: {
      title: 'Creation Desk',
      brand: 'Creation Desk',
      back: 'Back to gallery'
    },
    language: {
      switchTo: '切换到简体中文',
      current: 'Current language: English',
      button: 'EN'
    },
    workspace: {
      image: 'Images',
      inspiration: 'Inspiration',
      video: 'Video',
      history: 'History',
      desk: 'Desk'
    },
    topbar: {
      navAria: 'Creation workspace',
      login: 'Log in',
      logout: 'Log out',
      light: 'Switch to light mode',
      dark: 'Switch to dark mode'
    },
    rail: {
      aria: 'Creation sidebar',
      collapse: 'Collapse sidebar',
      expand: 'Expand sidebar',
      session: 'Session',
      history: 'History',
      settings: 'Connection settings',
      brand: 'Desk',
      brandMeta: 'Create',
      newSession: 'New session',
      workspaces: 'Workspace',
      project: 'Projects',
      all: 'All',
      current: 'Current',
      noProject: 'No projects yet',
      noProjectHint: 'Generated sessions will appear here.',
      videoGeneration: 'Video generation',
      unnamedSession: 'Untitled session',
      nodeCount: '{count} nodes',
      video: 'Video',
      imageCount: '{count} images',
      delete: 'Delete',
      clearCurrent: 'Clear current session',
      loggedIn: 'Signed in',
      notLoggedIn: 'Not signed in',
      hiddenKey: 'Key hidden',
      chooseKey: 'Choose key',
      light: 'Switch to light mode',
      dark: 'Switch to dark mode'
    },
    lock: {
      protected: 'Assets and prompts are protected. Log in to load them.'
    },
    canvas: {
      toolbar: 'Canvas tools',
      zoomOut: 'Zoom out',
      zoomIn: 'Zoom in',
      reset: 'Reset',
      title: 'Canvas',
      empty: 'Describe an idea below and generate. The first image becomes #1; select any image, add a direction, and continue the branch.',
      recovering: 'Image is recovering. If it stays empty, reopen this session from History.'
    },
    references: {
      title: 'Reference images (optional)',
      maskTitle: 'References and mask',
      collapse: 'Collapse references',
      selected: '{count} selected',
      upload: 'Drag, paste, or upload references',
      collapsedSelected: 'References collapsed, {count} selected',
      collapsedEmpty: 'References collapsed. Click to drag, paste, or upload.',
      maskCollapsed: 'References and mask are collapsed. Click to continue editing.'
    },
    composer: {
      expand: 'Expand chat',
      collapse: 'Collapse chat',
      title: 'Describe it, refine it, then generate',
      selected: 'Based on canvas #{index}',
      defaultTitle: 'Prompt refinement and generation',
      placeholderCanvas: 'Tell AI how to continue this canvas: change background, add product, adjust style...',
      placeholder: 'Tell AI what you want to create. It will shape the idea into a generation-ready prompt.',
      send: 'Send to prompt assistant. This uses the current key quota.',
      queue: 'Generation queue',
      queueRunning: '1 running',
      queueIdle: 'Idle',
      queueWaiting: '{count} queued',
      statusGenerating: 'Generating',
      statusDone: 'Done',
      statusReview: 'Review needed',
      statusError: 'Generation issue',
      status: 'Generation status',
      generate: 'Generate',
      retry: 'Retry',
      confirmRetry: 'Confirm retry',
      queueMore: 'Queue'
    },
    params: {
      aria: 'Parameters',
      current: 'Current parameters',
      expand: 'Expand parameters',
      collapse: 'Collapse parameters',
      close: 'Close parameters',
      model: 'Model',
      size: 'Size',
      quality: 'Quality',
      count: 'Count',
      generate: 'Generate',
      imageModel: 'Image model',
      videoModel: 'Video model',
      imageCount: 'Image count',
      aspect: 'Aspect',
      apiSize: 'API size',
      sizeHint: 'These are the size values supported by the current model; 2K/4K is added to the prompt as the target clarity.',
      resolutionHint: 'Resolution tier is appended to the generation request.',
      generateImage: 'Generate image with current settings',
      generateVideo: 'Generate video with current settings',
      retryParams: 'Retry current settings',
      confirmRetry: 'Confirm and retry',
      queueMore: 'Queue'
    },
    settings: {
      title: 'Connection',
      close: 'Close',
      key: 'Key',
      custom: 'Custom',
      login: 'Log in',
      noKey: 'No available keys',
      gateway: 'Gateway URL',
      hint: 'Routes are selected automatically: text-to-image uses /v1/images/generations; references and Mask use /v1/images/edits. The assistant model only refines prompts and uses the current key quota.',
      assistantModel: 'Assistant model',
      previewFrames: 'Preview frames',
      clear: 'Clear',
      done: 'Done'
    }
  }
};

function getByPath(source, key) {
  return String(key || '').split('.').reduce((current, part) => (
    current && Object.prototype.hasOwnProperty.call(current, part) ? current[part] : undefined
  ), source);
}

export function normalizeLanguage(value) {
  const language = String(value || '').toLowerCase();
  if (language.startsWith('en')) return 'en';
  if (language.startsWith('zh')) return 'zh-CN';
  return 'zh-CN';
}

export function loadStudioLanguage() {
  try {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY) || navigator.language);
  } catch {
    return 'zh-CN';
  }
}

export function saveStudioLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLanguage(language));
  } catch {
    // Language preference is optional; the current tab can still switch.
  }
}

export function formatMessage(template, values = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => (
    values[key] === undefined || values[key] === null ? '' : String(values[key])
  ));
}

export function createTranslator(language) {
  const normalized = normalizeLanguage(language);
  const dictionary = dictionaries[normalized] || dictionaries['zh-CN'];
  const fallbackDictionary = dictionaries['zh-CN'];
  return (key, fallback = '', values = {}) => {
    const value = getByPath(dictionary, key);
    const fallbackValue = getByPath(fallbackDictionary, key);
    return formatMessage(value ?? fallbackValue ?? fallback ?? key, values);
  };
}

export function nextLanguage(language) {
  return normalizeLanguage(language) === 'en' ? 'zh-CN' : 'en';
}

