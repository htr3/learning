/* ============================================================
   templates.js — ready-to-edit reference architectures.

   Each template is a full document. A small builder keeps the
   definitions readable: nodes are [key, type, x, y, label, tech]
   and edges are [fromKey, toKey, label, kind?].
   ============================================================ */
import { store } from './core/state.js';
import { getComponent } from './catalog.js';
import { uid } from './core/utils.js';
import { openMenu, confirmModal } from './core/ui.js';
import { viewport } from './viewport.js';

/* grid helpers for tidy layouts */
const COL = (c) => 40 + c * 250;
const ROW = (r) => 60 + r * 120;

function build(name, nodeDefs, edgeDefs) {
  const nodes = nodeDefs.map((d, i) => {
    const [key, type, c, r, label, tech, extra] = d;
    const comp = getComponent(type);
    return {
      id: key,
      type,
      label: label || comp.label,
      tech: tech != null ? tech : (comp.tech || ''),
      desc: comp.desc || '',
      x: COL(c), y: ROW(r), w: 168, h: 66,
      color: comp.color, bg: '', border: '',
      port: '', instances: (extra && extra.instances) || 1,
      notes: '', z: i + 1, locked: false, groupId: null,
    };
  });
  const edges = edgeDefs.map(([from, to, label, kind]) => ({
    id: uid('e'), from, to, kind: kind || 'curved', label: label || '', animated: true,
  }));
  return { version: 1, name, viewport: { x: 0, y: 0, zoom: 1 }, nodes, edges };
}

export const TEMPLATES = [
  {
    id: 'netflix', name: 'Netflix', desc: 'Video streaming: CDN delivery, playback & recommendations.',
    make: () => build('Netflix',
      [
        ['cli', 'mobile', 0, 1, 'Client'],
        ['cdn', 'cdn', 1, 0, 'CDN', 'Open Connect'],
        ['gw', 'gateway', 1, 1, 'API Gateway'],
        ['play', 'microservice', 2, 0, 'Playback API'],
        ['reco', 'microservice', 2, 1, 'Recommendations'],
        ['user', 'microservice', 2, 2, 'User Service'],
        ['cache', 'redis', 3, 0, 'Redis', 'Cache'],
        ['db', 'postgres', 3, 1, 'Metadata DB'],
        ['s3', 's3', 3, 2, 'Video Storage'],
        ['kafka', 'kafka', 2, 3, 'Kafka', 'Events'],
      ],
      [
        ['cli', 'cdn', 'HTTPS'], ['cli', 'gw', 'REST'],
        ['gw', 'play', 'REST'], ['gw', 'reco', 'gRPC'], ['gw', 'user', 'REST'],
        ['play', 's3', 'HTTP'], ['play', 'cache', 'TCP'],
        ['reco', 'db'], ['user', 'db'], ['reco', 'kafka', 'Kafka'],
      ]),
  },
  {
    id: 'youtube', name: 'YouTube', desc: 'Upload, transcode, and stream video at scale.',
    make: () => build('YouTube',
      [
        ['cli', 'browser', 0, 1, 'Client'],
        ['lb', 'loadbalancer', 1, 1, 'Load Balancer'],
        ['up', 'microservice', 2, 0, 'Upload Service'],
        ['worker', 'worker', 3, 0, 'Transcoder'],
        ['stream', 'microservice', 2, 1, 'Streaming API'],
        ['cdn', 'cdn', 3, 1, 'CDN'],
        ['s3', 's3', 3, 2, 'Blob Storage'],
        ['db', 'mysql', 2, 2, 'Metadata DB'],
        ['queue', 'kafka', 2, 3, 'Job Queue'],
      ],
      [
        ['cli', 'lb', 'HTTPS'], ['lb', 'up', 'REST'], ['lb', 'stream', 'REST'],
        ['up', 'queue', 'Kafka'], ['queue', 'worker', 'Kafka'],
        ['worker', 's3', 'HTTP'], ['stream', 'cdn', 'HTTPS'], ['cdn', 's3'],
        ['up', 'db'], ['stream', 'db'],
      ]),
  },
  {
    id: 'instagram', name: 'Instagram', desc: 'Photo sharing with feed fan-out and media CDN.',
    make: () => build('Instagram',
      [
        ['cli', 'mobile', 0, 1, 'Client'],
        ['gw', 'gateway', 1, 1, 'API Gateway'],
        ['post', 'microservice', 2, 0, 'Post Service'],
        ['feed', 'microservice', 2, 1, 'Feed Service'],
        ['media', 'microservice', 2, 2, 'Media Service'],
        ['fanout', 'worker', 3, 0, 'Fan-out Worker'],
        ['cache', 'redis', 3, 1, 'Feed Cache'],
        ['db', 'postgres', 3, 2, 'Posts DB'],
        ['cdn', 'cdn', 1, 0, 'CDN'],
        ['s3', 's3', 3, 3, 'Media Store'],
        ['kafka', 'kafka', 2, 3, 'Kafka'],
      ],
      [
        ['cli', 'cdn', 'HTTPS'], ['cli', 'gw', 'REST'],
        ['gw', 'post'], ['gw', 'feed'], ['gw', 'media'],
        ['post', 'kafka', 'Kafka'], ['kafka', 'fanout', 'Kafka'], ['fanout', 'cache', 'TCP'],
        ['feed', 'cache', 'TCP'], ['post', 'db'], ['media', 's3', 'HTTP'], ['cdn', 's3'],
      ]),
  },
  {
    id: 'whatsapp', name: 'WhatsApp', desc: 'Real-time messaging over persistent WebSockets.',
    make: () => build('WhatsApp',
      [
        ['cli', 'mobile', 0, 1, 'Client'],
        ['lb', 'loadbalancer', 1, 1, 'Load Balancer'],
        ['ws', 'microservice', 2, 1, 'WebSocket Gateway'],
        ['chat', 'microservice', 3, 0, 'Chat Service'],
        ['presence', 'microservice', 3, 2, 'Presence Service'],
        ['queue', 'kafka', 3, 1, 'Message Queue'],
        ['cache', 'redis', 4, 0, 'Session Cache'],
        ['db', 'mongodb', 4, 1, 'Message Store'],
        ['push', 'worker', 4, 2, 'Push Worker'],
      ],
      [
        ['cli', 'lb', 'HTTPS'], ['lb', 'ws', 'WebSocket'],
        ['ws', 'chat', 'gRPC'], ['ws', 'presence', 'gRPC'],
        ['chat', 'queue', 'Kafka'], ['queue', 'db'], ['queue', 'push', 'Kafka'],
        ['presence', 'cache', 'TCP'], ['chat', 'cache', 'TCP'],
      ]),
  },
  {
    id: 'uber', name: 'Uber', desc: 'Ride matching with geo-indexing and surge pricing.',
    make: () => build('Uber',
      [
        ['rider', 'mobile', 0, 0, 'Rider App'],
        ['driver', 'mobile', 0, 2, 'Driver App'],
        ['gw', 'gateway', 1, 1, 'API Gateway'],
        ['loc', 'microservice', 2, 0, 'Location Service'],
        ['match', 'microservice', 2, 1, 'Matching Service'],
        ['trip', 'microservice', 2, 2, 'Trip Service'],
        ['geo', 'redis', 3, 0, 'Geo Index', 'Redis GEO'],
        ['kafka', 'kafka', 3, 1, 'Kafka'],
        ['db', 'postgres', 3, 2, 'Trips DB'],
        ['surge', 'worker', 2, 3, 'Surge Worker'],
      ],
      [
        ['rider', 'gw', 'HTTPS'], ['driver', 'gw', 'WebSocket'],
        ['gw', 'loc'], ['gw', 'match'], ['gw', 'trip'],
        ['loc', 'geo', 'TCP'], ['match', 'geo', 'TCP'], ['match', 'kafka', 'Kafka'],
        ['kafka', 'surge', 'Kafka'], ['trip', 'db'], ['trip', 'kafka', 'Kafka'],
      ]),
  },
  {
    id: 'payment', name: 'Payment Gateway', desc: 'Idempotent charges, ledger and settlement.',
    make: () => build('Payment Gateway',
      [
        ['cli', 'client', 0, 1, 'Merchant'],
        ['gw', 'gateway', 1, 1, 'API Gateway'],
        ['pay', 'microservice', 2, 1, 'Payment Service'],
        ['fraud', 'microservice', 2, 0, 'Fraud Check'],
        ['bank', 'microservice', 3, 0, 'Bank Adapter'],
        ['ledger', 'postgres', 3, 1, 'Ledger DB'],
        ['outbox', 'kafka', 2, 2, 'Outbox / Kafka'],
        ['settle', 'worker', 3, 2, 'Settlement Worker'],
        ['cache', 'redis', 1, 0, 'Idempotency', 'Redis'],
      ],
      [
        ['cli', 'gw', 'HTTPS'], ['gw', 'pay', 'REST'], ['pay', 'cache', 'TCP'],
        ['pay', 'fraud', 'gRPC'], ['pay', 'bank', 'HTTPS'], ['pay', 'ledger'],
        ['pay', 'outbox', 'Kafka'], ['outbox', 'settle', 'Kafka'], ['settle', 'ledger'],
      ]),
  },
  {
    id: 'chat', name: 'Chat Application', desc: 'Generic real-time chat with presence and history.',
    make: () => build('Chat Application',
      [
        ['web', 'browser', 0, 0, 'Web Client'],
        ['app', 'mobile', 0, 2, 'Mobile Client'],
        ['lb', 'loadbalancer', 1, 1, 'Load Balancer'],
        ['ws', 'microservice', 2, 1, 'Realtime Service'],
        ['api', 'microservice', 2, 0, 'REST API'],
        ['kafka', 'kafka', 3, 1, 'Kafka'],
        ['cache', 'redis', 3, 0, 'Presence Cache'],
        ['db', 'mongodb', 3, 2, 'History DB'],
        ['notif', 'worker', 2, 2, 'Notification Worker'],
      ],
      [
        ['web', 'lb', 'HTTPS'], ['app', 'lb', 'HTTPS'],
        ['lb', 'ws', 'WebSocket'], ['lb', 'api', 'REST'],
        ['ws', 'kafka', 'Kafka'], ['kafka', 'db'], ['kafka', 'notif', 'Kafka'],
        ['ws', 'cache', 'TCP'], ['api', 'db'],
      ]),
  },
  {
    id: 'urlshortener', name: 'URL Shortener', desc: 'Base62 shortening with cache and analytics.',
    make: () => build('URL Shortener',
      [
        ['cli', 'browser', 0, 1, 'Client'],
        ['lb', 'loadbalancer', 1, 1, 'Load Balancer'],
        ['api', 'microservice', 2, 1, 'Shortener API'],
        ['cache', 'redis', 3, 0, 'Redis Cache'],
        ['db', 'postgres', 3, 1, 'URL DB'],
        ['kafka', 'kafka', 2, 2, 'Kafka'],
        ['analytics', 'worker', 3, 2, 'Analytics Worker'],
        ['es', 'elasticsearch', 4, 2, 'Analytics Store'],
      ],
      [
        ['cli', 'lb', 'HTTPS'], ['lb', 'api', 'REST'],
        ['api', 'cache', 'TCP'], ['api', 'db'], ['api', 'kafka', 'Kafka'],
        ['kafka', 'analytics', 'Kafka'], ['analytics', 'es'],
      ]),
  },
];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));
export const getTemplate = (id) => BY_ID.get(id);

/** Load a template into the editor (asks before overwriting existing work). */
export async function loadTemplate(id) {
  const t = getTemplate(id);
  if (!t) return;
  if (store.nodes.length) {
    const ok = await confirmModal({
      title: `Load "${t.name}" template?`,
      message: 'This replaces your current diagram. You can undo (Ctrl+Z) afterwards.',
      confirmText: 'Load template',
    });
    if (!ok) return;
  }
  store.loadDoc(t.make(), { reason: 'template' });
  setTimeout(() => viewport.fit(), 30);
}

/** Open the template picker menu near the given anchor element. */
export function openTemplatePicker(anchorEl) {
  const r = anchorEl.getBoundingClientRect();
  const docIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>';
  openMenu([
    { title: 'System design templates' },
    ...TEMPLATES.map((t) => ({ label: t.name, icon: docIcon, sub: `${t.make().nodes.length}`, onClick: () => loadTemplate(t.id) })),
  ], r.left, r.bottom + 6);
}
