/* ============================================================
   catalog.js — the component library shown in the left palette.

   Each component has: id, label, category, color (accent),
   tech (default technology), desc (tooltip/description) and an
   icon key. Icons are inline, stroke-based SVGs using
   currentColor so they inherit each component's accent colour.
   ============================================================ */

/* ---- icon inner-markup (24x24, stroke = currentColor) ---- */
const ICON = {
  client: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  browser: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M9.5 6.5h.01"/>',
  mobile: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
  dns: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  cdn: '<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="1.6"/><circle cx="19" cy="6" r="1.6"/><circle cx="5" cy="18" r="1.6"/><circle cx="19" cy="18" r="1.6"/><path d="M9.6 10.4 6.2 7M14.4 10.4 17.8 7M9.6 13.6 6.2 17M14.4 13.6 17.8 17"/>',
  gateway: '<path d="M4 20V9l8-5 8 5v11"/><path d="M4 20h16M9 20v-6h6v6M12 4v2"/>',
  balancer: '<circle cx="12" cy="4.5" r="2"/><path d="M12 6.5v4M5 18h14M12 10.5 5 18M12 10.5 19 18"/><circle cx="5" cy="19.5" r="2"/><circle cx="12" cy="19.5" r="2"/><circle cx="19" cy="19.5" r="2"/>',
  service: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  worker: '<path d="M10.3 4.3 9 6l-1.5.3-1.8-1a8 8 0 0 0-1.5 2.6l1.3 1.4L5.5 12l-1.4 1.4a8 8 0 0 0 1.5 2.6l1.8-1L9 15.4l.3 1.7 1.7.7"/><circle cx="12" cy="12" r="3"/><path d="M13.7 19.7 15 18l1.5-.3 1.8 1a8 8 0 0 0 1.5-2.6l-1.3-1.4"/>',
  cron: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  db: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  cache: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M13 8l-4 5h3l-1 3 4-5h-3z"/>',
  s3: '<path d="M5 7h14l-1.4 12.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8z"/><path d="M4 7l1.5-3h13L20 7M9 11v6M15 11v6"/>',
  queue: '<rect x="3" y="5" width="4" height="14" rx="1"/><rect x="10" y="5" width="4" height="14" rx="1"/><rect x="17" y="5" width="4" height="14" rx="1"/>',
  rabbit: '<path d="M8 3c0 2 1 3 2 3.5M16 3c0 2-1 3-2 3.5"/><rect x="6" y="7" width="12" height="12" rx="3"/><circle cx="9.5" cy="12" r="1"/><circle cx="14.5" cy="12" r="1"/><path d="M9 16h6"/>',
  docker: '<path d="M3 12h15c1.5 0 3-.7 3-2.5"/><rect x="4" y="9" width="3" height="3"/><rect x="7.5" y="9" width="3" height="3"/><rect x="11" y="9" width="3" height="3"/><rect x="7.5" y="5.5" width="3" height="3"/><path d="M3 12c0 4 2.5 6 7 6 6 0 9-4 9.5-7"/>',
  k8s: '<path d="M12 3l7.5 3.5v7L12 21l-7.5-4v-7z"/><circle cx="12" cy="12" r="2.5"/><path d="M12 4.5v3M12 16.5v3M6 8.5l2.5 1.5M15.5 14l2.5 1.5M18 8.5l-2.5 1.5M8.5 14 6 15.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  chart: '<path d="M4 4v16h16"/><path d="M7 15l3-4 3 3 4-6"/>',
  firewall: '<path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5z"/><path d="M4 9h16M9 5.5v3.5M15 12v3.5M4 12h16"/>',
  ec2: '<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01M11 7.5h4M11 16.5h4"/>',
  lambda: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 7l4 5-4 5M12 12l4 5"/>',
};

/** Full <svg> markup for a component icon. */
export function iconMarkup(iconKey, size = 20) {
  const inner = ICON[iconKey] || ICON.service;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

/** Ordered categories with a representative colour for the palette header dot. */
export const CATEGORIES = [
  { id: 'networking', label: 'Networking', color: '#38bdf8' },
  { id: 'backend', label: 'Backend', color: '#7C3AED' },
  { id: 'database', label: 'Database', color: '#34d399' },
  { id: 'storage', label: 'Storage', color: '#fbbf24' },
  { id: 'messaging', label: 'Messaging', color: '#f472b6' },
  { id: 'infrastructure', label: 'Infrastructure', color: '#22d3ee' },
  { id: 'monitoring', label: 'Monitoring', color: '#fb923c' },
  { id: 'security', label: 'Security', color: '#f87171' },
  { id: 'cloud', label: 'Cloud', color: '#818cf8' },
];

/** The component library. */
export const CATALOG = [
  // --- Networking ---
  { id: 'client', label: 'Client', category: 'networking', color: '#38bdf8', icon: 'client', tech: 'User', desc: 'An end-user or consuming application that initiates requests.' },
  { id: 'browser', label: 'Browser', category: 'networking', color: '#38bdf8', icon: 'browser', tech: 'Web', desc: 'A web browser rendering the client-side application.' },
  { id: 'mobile', label: 'Mobile', category: 'networking', color: '#38bdf8', icon: 'mobile', tech: 'iOS / Android', desc: 'A native mobile app client.' },
  { id: 'dns', label: 'DNS', category: 'networking', color: '#60a5fa', icon: 'dns', tech: 'Route 53', desc: 'Resolves domain names to IP addresses.' },
  { id: 'cdn', label: 'CDN', category: 'networking', color: '#22d3ee', icon: 'cdn', tech: 'CloudFront', desc: 'Edge cache that serves static assets close to users.' },
  { id: 'gateway', label: 'API Gateway', category: 'networking', color: '#818cf8', icon: 'gateway', tech: 'Kong / APIGW', desc: 'Single entry point: routing, auth, rate-limiting.' },
  { id: 'loadbalancer', label: 'Load Balancer', category: 'networking', color: '#34d399', icon: 'balancer', tech: 'Nginx / ELB', desc: 'Distributes traffic across healthy backend instances.' },

  // --- Backend ---
  { id: 'microservice', label: 'Microservice', category: 'backend', color: '#7C3AED', icon: 'service', tech: 'Spring / Node', desc: 'An independently deployable service owning one domain.' },
  { id: 'worker', label: 'Worker', category: 'backend', color: '#a855f7', icon: 'worker', tech: 'Consumer', desc: 'Background processor consuming jobs from a queue.' },
  { id: 'cron', label: 'Cron Job', category: 'backend', color: '#c084fc', icon: 'cron', tech: 'Scheduler', desc: 'Runs scheduled/periodic tasks.' },

  // --- Database ---
  { id: 'postgres', label: 'PostgreSQL', category: 'database', color: '#336791', icon: 'db', tech: 'SQL', desc: 'Relational, ACID-compliant database.' },
  { id: 'mysql', label: 'MySQL', category: 'database', color: '#00758F', icon: 'db', tech: 'SQL', desc: 'Popular open-source relational database.' },
  { id: 'mongodb', label: 'MongoDB', category: 'database', color: '#47A248', icon: 'db', tech: 'NoSQL', desc: 'Document-oriented NoSQL database.' },
  { id: 'redis', label: 'Redis', category: 'database', color: '#DC382D', icon: 'cache', tech: 'In-memory', desc: 'In-memory key-value store used for caching & queues.' },

  // --- Storage ---
  { id: 's3', label: 'S3', category: 'storage', color: '#E25444', icon: 's3', tech: 'Object Store', desc: 'Durable object storage for blobs and static files.' },
  { id: 'cache', label: 'Cache', category: 'storage', color: '#fbbf24', icon: 'cache', tech: 'Cache', desc: 'Generic caching layer to reduce read latency.' },

  // --- Messaging ---
  { id: 'kafka', label: 'Kafka', category: 'messaging', color: '#f472b6', icon: 'queue', tech: 'Event Stream', desc: 'Distributed log for high-throughput event streaming.' },
  { id: 'rabbitmq', label: 'RabbitMQ', category: 'messaging', color: '#FF6600', icon: 'rabbit', tech: 'Broker', desc: 'Message broker for reliable task queues.' },
  { id: 'queue', label: 'Queue', category: 'messaging', color: '#f9a8d4', icon: 'queue', tech: 'SQS', desc: 'A generic message queue decoupling producers & consumers.' },

  // --- Infrastructure ---
  { id: 'docker', label: 'Docker', category: 'infrastructure', color: '#2496ED', icon: 'docker', tech: 'Container', desc: 'Packages a service and its dependencies into a container.' },
  { id: 'kubernetes', label: 'Kubernetes', category: 'infrastructure', color: '#326CE5', icon: 'k8s', tech: 'Orchestrator', desc: 'Orchestrates, scales and self-heals containers.' },

  // --- Monitoring ---
  { id: 'elasticsearch', label: 'ElasticSearch', category: 'monitoring', color: '#FEC514', icon: 'search', tech: 'Search / Logs', desc: 'Full-text search and log analytics engine.' },
  { id: 'prometheus', label: 'Prometheus', category: 'monitoring', color: '#E6522C', icon: 'chart', tech: 'Metrics', desc: 'Time-series metrics collection and alerting.' },
  { id: 'grafana', label: 'Grafana', category: 'monitoring', color: '#fb923c', icon: 'chart', tech: 'Dashboards', desc: 'Observability dashboards over metrics & logs.' },

  // --- Security ---
  { id: 'firewall', label: 'Firewall', category: 'security', color: '#f87171', icon: 'firewall', tech: 'WAF', desc: 'Filters and blocks malicious or unwanted traffic.' },

  // --- Cloud ---
  { id: 'ec2', label: 'Compute', category: 'cloud', color: '#818cf8', icon: 'ec2', tech: 'VM / EC2', desc: 'A virtual machine / compute instance.' },
  { id: 'lambda', label: 'Serverless', category: 'cloud', color: '#a78bfa', icon: 'lambda', tech: 'Function', desc: 'Event-driven serverless function.' },
];

const BY_ID = new Map(CATALOG.map((c) => [c.id, c]));

/** Look up a component definition; falls back to a generic service. */
export function getComponent(id) {
  return BY_ID.get(id) || { id, label: id, category: 'backend', color: '#7C3AED', icon: 'service', tech: '', desc: '' };
}

/** Icon markup for a node (by its component type). */
export function nodeIcon(type, size = 20) {
  return iconMarkup(getComponent(type).icon, size);
}

/** Raw inner SVG markup for a node's icon (used by SVG/PNG export). */
export function nodeIconInner(type) {
  return ICON[getComponent(type).icon] || ICON.service;
}
