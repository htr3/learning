# -*- coding: utf-8 -*-
"""Generate kafka.html with detailed interview answers."""

def card(qid, level, title, tag, vimp, body, section):
    vi = '<span class="level-vimp">⭐ VI</span>' if vimp else ''
    vimp_attr = ' data-vimp="true"' if vimp else ''
    return f"""        <article class="qa-card" data-id="{qid}" data-level="{level}" data-section="{section}"{vimp_attr}>
          <div class="qa-question"><h3>{title}</h3>
            <div class="qa-meta"><span class="level level-{level}">{level.capitalize()}</span>{vi}<span class="tag">{tag}</span><span class="chevron">▼</span></div></div>
          <div class="qa-answer">
{body}
            <div class="qa-footer"><label><input type="checkbox" class="mark-practiced"> Mark practiced</label></div>
          </div>
        </article>
"""

CARDS = []

def add(qid, level, title, tag, section, vimp, parts):
    body = "\n".join(parts)
    CARDS.append((section, card(qid, level, title, tag, vimp, body, section)))

# --- Fundamentals ---
add("what-is-kafka", "easy", "What is Apache Kafka? (plain English)", "Basics", "fundamentals", True, [
    '<h4>Quick answer</h4>',
    '<p>Kafka is a <strong>distributed event log</strong>: applications <strong>append</strong> events to topics; other applications <strong>read</strong> them later. Think of it as a durable, high-speed tape recorder many services can read at their own speed — not a mailbox that deletes mail after one person reads it.</p>',
    '<h4>Detailed explanation</h4>',
    '<p><strong>Why it exists:</strong> When Service A calls Service B over REST, both must be up at the same time. If B is slow or down, A fails or blocks. With Kafka, A writes <code>OrderCreated</code> to a topic and moves on. B (and C, D) consume when ready.</p>',
    '<ul>',
    '<li><strong>Topic:</strong> named stream of events (e.g. <code>order-events</code>)</li>',
    '<li><strong>Partition:</strong> topic split into ordered sub-logs for parallelism</li>',
    '<li><strong>Broker:</strong> Kafka server that stores partition data on disk</li>',
    '<li><strong>Producer:</strong> writes messages</li>',
    '<li><strong>Consumer:</strong> reads messages; consumers in a <strong>group</strong> share work</li>',
    '<li><strong>Offset:</strong> position (0, 1, 2…) in a partition — bookmark of what you read</li>',
    '</ul>',
    '<h4>Simple analogy</h4>',
    '<p><strong>JMS queue</strong> = one person takes a letter off the pile (gone forever). <strong>Kafka topic</strong> = newspaper printed daily — many readers can read the same edition; new readers can read old editions until papers are recycled (retention).</p>',
    '<h4>From your experience</h4>',
    '<p>At Optima/Amdocs you likely used <strong>Camel + JMS</strong> for integration. In interviews say: <em>"I understand event streaming concepts from async telco integrations; production was JMS-heavy, and I&apos;ve studied Kafka for event-driven microservices."</em> That is honest and strong.</p>',
    '<h4>Follow-ups</h4>',
    '<p>Is Kafka a database? No — it is a log with retention, not a query engine (though Kafka Streams can process in flight).</p>',
])

add("architecture", "easy", "Kafka architecture — cluster, brokers, ZooKeeper/KRaft", "Architecture", "fundamentals", True, [
    '<h4>Quick answer</h4>',
    '<p>A <strong>Kafka cluster</strong> is several <strong>brokers</strong> (servers). Topics are split into <strong>partitions</strong> spread across brokers. <strong>KRaft</strong> (new) or <strong>ZooKeeper</strong> (older) stores cluster metadata — who is leader for which partition.</p>',
    '<h4>Detailed explanation</h4>',
    '<pre><code>Producer -&gt; Broker (leader partition) -&gt; Follower replicas | Consumer group reads offsets</code></pre>',
    '<ul>',
    '<li><strong>Leader partition:</strong> broker that handles reads/writes for that partition</li>',
    '<li><strong>Followers:</strong> copy data for fault tolerance</li>',
    '<li><strong>Controller:</strong> one broker elected to manage partition leadership</li>',
    '</ul>',
    '<p>You do not need to operate ZooKeeper in interviews — know that metadata (topic list, partition leaders) must be coordinated. Kafka 3.x+ moves to <strong>KRaft</strong> (Kafka&apos;s own Raft quorum) to simplify ops.</p>',
    '<h4>Interview one-liner</h4>',
    '<p><em>"Kafka scales horizontally: more brokers and more partitions increase throughput; replication gives durability if a broker dies."</em></p>',
])

add("topic-partition-offset", "easy", "Topic vs partition vs offset (must know)", "Basics", "fundamentals", True, [
    '<h4>Quick answer</h4>',
    '<p><strong>Topic</strong> = category of events. <strong>Partition</strong> = ordered shard inside topic. <strong>Offset</strong> = sequence number within that partition. Ordering is <strong>only guaranteed inside one partition</strong>.</p>',
    '<h4>Detailed explanation</h4>',
    '<p>Topic <code>payments</code> with 3 partitions:</p>',
    '<ul>',
    '<li>Partition 0: offset 0,1,2… (maybe keys hash to accounts A–M)</li>',
    '<li>Partition 1: own offset sequence</li>',
    '<li>Partition 2: own offset sequence</li>',
    '</ul>',
    '<p>Two messages with different keys can land on different partitions and be processed <strong>out of order globally</strong> — that is normal. Design keys so related events share a partition.</p>',
    '<h4>Example</h4>',
    '<pre><code>Topic: order-events (6 partitions)\nKey: accountId -&gt; same partition -&gt; ordered per account</code></pre>',
    '<h4>Follow-ups</h4>',
    '<p>Can two topics share partitions? No — partitions belong to one topic only.</p>',
])

add("producer-flow", "easy", "How does a producer send a message?", "Producer", "fundamentals", False, [
    '<h4>Quick answer</h4>',
    '<p>Producer serializes record → picks partition (key hash or round-robin) → sends to <strong>leader</strong> broker → waits per <code>acks</code> setting → retries on transient failure.</p>',
    '<h4>Detailed explanation</h4>',
    '<ol>',
    '<li>Build <code>ProducerRecord(topic, key, value)</code></li>',
    '<li>Partitioner chooses partition index</li>',
    '<li>Batching: producer batches messages for efficiency (linger.ms, batch.size)</li>',
    '<li>Leader appends to log on disk; followers replicate</li>',
    '<li>Producer gets acknowledgment based on <code>acks</code></li>',
    '</ol>',
    '<h4>Example</h4>',
    '<pre><code>producer.send(new ProducerRecord&lt;&gt;("order-events", order.getAccountId(), order));\n// acks=all, enable.idempotence=true in producer config</code></pre>',
    '<h4>Follow-ups</h4>',
    '<p>What if no key? Round-robin across partitions — good throughput but no per-entity ordering.</p>',
])

add("consumer-flow", "easy", "How does a consumer read messages?", "Consumer", "fundamentals", False, [
    '<h4>Quick answer</h4>',
    '<p>Consumer joins a <strong>group</strong>, gets assigned partition(s), polls broker for records, processes, then <strong>commits offset</strong> (bookmark). Other consumers in same group do not read same partition.</p>',
    '<h4>Detailed explanation</h4>',
    '<ul>',
    '<li><strong>Poll loop:</strong> <code>consumer.poll(Duration)</code> returns batch</li>',
    '<li><strong>Processing:</strong> your code / @KafkaListener runs</li>',
    '<li><strong>Commit:</strong> auto or manual — tells broker "I am done up to offset N"</li>',
    '</ul>',
    '<p>If you crash <strong>before</strong> commit, message will be redelivered → <strong>at-least-once</strong>. Design handlers to tolerate duplicates.</p>',
    '<h4>Example</h4>',
    '<pre><code>ConsumerRecords records = consumer.poll(Duration.ofMillis(500));\nfor (ConsumerRecord r : records) { reportService.update(r.value()); }\nconsumer.commitSync(); // after success</code></pre>',
])

# --- Compare ---
add("vs-jms", "easy", "Kafka vs JMS / RabbitMQ (queue vs log)", "Compare", "compare", True, [
    '<h4>Quick answer</h4>',
    '<p><strong>Queue (JMS/Rabbit):</strong> message usually removed after one consumer ack. <strong>Kafka:</strong> message stays in log for retention period; many consumer <strong>groups</strong> each keep their own offset.</p>',
    '<h4>Detailed explanation</h4>',
    '<table style="width:100%;font-size:0.9rem;margin:0.5rem 0">',
    '<tr><th></th><th>JMS / traditional queue</th><th>Kafka</th></tr>',
    '<tr><td>Model</td><td>Queue / topic (often delete on read)</td><td>Distributed commit log</td></tr>',
    '<tr><td>Replay</td><td>Hard — message gone</td><td>Easy — reset offset or new group</td></tr>',
    '<tr><td>Throughput</td><td>Good for enterprise workloads</td><td>Very high, disk-sequential writes</td></tr>',
    '<tr><td>Routing</td><td>Selectors, DLQ patterns mature</td><td>Topic design + stream processors</td></tr>',
    '<tr><td>Your stack</td><td>Camel routes to ActiveMQ etc.</td><td>Often newer microservice estates</td></tr>',
    '</table>',
    '<h4>When to say JMS in interview</h4>',
    '<p>Telco OSS/BSS integrations, guaranteed delivery to <strong>one</strong> worker, complex routing — Camel + JMS is proven. Kafka when you need <strong>event history</strong>, analytics, many subscribers, or very high ingest (usage events, clickstream).</p>',
    '<h4>Follow-ups</h4>',
    '<p>Can Camel use Kafka? Yes — <code>kafka:topicName</code> component; same EIP concepts (retry, dead letter) apply.</p>',
])

add("kafka-when-use", "medium", "When is Kafka the right choice?", "Design", "compare", True, [
    '<h4>Quick answer</h4>',
    '<p>Use Kafka when you need <strong>high throughput</strong>, <strong>multiple independent consumers</strong>, <strong>replay</strong>, or an <strong>audit trail</strong> of events. Skip it for low-volume task queues where JMS + Camel is simpler.</p>',
    '<h4>Detailed explanation</h4>',
    '<p><strong>Good fits:</strong></p>',
    '<ul>',
    '<li>Order/account lifecycle events consumed by billing, reporting, notifications</li>',
    '<li>CDC (Debezium) streaming DB changes to search index or data warehouse</li>',
    '<li>Real-time metrics (fraud, network alarms) with stream processing</li>',
    '<li>Decoupling microservices — new service replays last 7 days of events on deploy</li>',
    '</ul>',
    '<p><strong>Poor fits:</strong></p>',
    '<ul>',
    '<li>Request-reply where caller waits for result (use REST/gRPC)</li>',
    '<li>Low message rate, need priority queues and complex selectors</li>',
    '<li>Team has no ops capacity for cluster tuning (partitions, retention, monitoring)</li>',
    '</ul>',
    '<h4>From your experience</h4>',
    '<p>Frame around Optima: <em>"We processed 1M+ transactions/day with Camel; async steps used messaging. Kafka would be the modern choice if we needed replayable event history across many downstream systems — I map that to the same decoupling goals we solved with JMS."</em></p>',
])

# --- Producers ---
add("producer-acks", "medium", "Producer acks: 0, 1, and all", "Producer", "producers", True, [
    '<h4>Quick answer</h4>',
    '<p><code>acks=0</code> fire-and-forget (fast, may lose). <code>acks=1</code> leader wrote (risk if leader dies before replicate). <code>acks=all</code> all in-sync replicas ack (safest standard prod choice).</p>',
    '<h4>Detailed explanation</h4>',
    '<ul>',
    '<li><strong>acks=0:</strong> producer does not wait — use only for metrics where loss OK</li>',
    '<li><strong>acks=1:</strong> leader persisted; follower may not have copy yet</li>',
    '<li><strong>acks=all:</strong> waits for ISR (in-sync replicas) — pairs with <code>min.insync.replicas=2</code> on broker</li>',
    '</ul>',
    '<p>Also set <code>retries</code> and <code>enable.idempotence=true</code> (Kafka 0.11+) to avoid duplicate writes on retry.</p>',
    '<h4>Example</h4>',
    '<pre><code>spring.kafka.producer.acks=all\nspring.kafka.producer.enable-idempotence=true</code></pre>',
    '<h4>Follow-ups</h4>',
    '<p>Does acks=all guarantee no duplicate consumption? No — that is consumer idempotency + offset commit timing.</p>',
])

add("ordering", "medium", "How do you guarantee ordering?", "Ordering", "producers", True, [
    '<h4>Quick answer</h4>',
    '<p>Ordering only <strong>within one partition</strong>. Put all related events on the same partition using a stable <strong>message key</strong> (e.g. <code>accountId</code>).</p>',
    '<h4>Detailed explanation</h4>',
    '<p>Partitioner: <code>hash(key) % numPartitions</code>. Same key → same partition → FIFO order for that key.</p>',
    '<p><strong>Rules:</strong></p>',
    '<ul>',
    '<li>One consumer thread per partition in a group (Kafka assigns 1:1)</li>',
    '<li>Do not increase partitions without understanding — changes key→partition mapping for new messages</li>',
    '<li>Global order for entire system? Use 1 partition (kills scale) or accept per-entity order</li>',
    '</ul>',
    '<h4>Example</h4>',
    '<pre><code>producer.send(new ProducerRecord&lt;&gt;("order-events", order.getAccountId(), order));</code></pre>',
    '<h4>Telco example</h4>',
    '<p>Provisioning steps for same subscriber ID must stay ordered; different subscribers can process in parallel on other partitions.</p>',
])

add("partition-count", "medium", "How many partitions should a topic have?", "Design", "producers", False, [
    '<h4>Quick answer</h4>',
    '<p>Enough for target throughput and consumer parallelism; upper bound roughly <strong>consumers you will ever run</strong>. Too many partitions = more overhead. Plan key strategy first.</p>',
    '<h4>Detailed explanation</h4>',
    '<ul>',
    '<li><strong>Throughput:</strong> each partition is ordered log on one broker leader — more partitions = more parallel writes/reads</li>',
    '<li><strong>Consumers:</strong> max useful consumers in group ≈ partition count</li>',
    '<li><strong>Over-partitioning:</strong> more files, more memory, longer rebalances</li>',
    '<li><strong>Changing count:</strong> only affects new messages&apos; mapping; do not change lightly in prod</li>',
    '</ul>',
    '<p>Starting point for many teams: 6–12 partitions per hot topic, measure lag and CPU, adjust.</p>',
    '<h4>Follow-ups</h4>',
    '<p>Can you decrease partitions? Kafka does not support decrease easily — create new topic and migrate.</p>',
])

# --- Consumers ---
add("consumer-groups", "medium", "Consumer groups and rebalancing", "Consumer", "consumers", True, [
    '<h4>Quick answer</h4>',
    '<p>Consumers with same <code>group.id</code> cooperate: each partition assigned to <strong>at most one</strong> consumer in the group. Add consumers to scale until you hit partition count. <strong>Rebalance</strong> redistributes partitions when members join/leave.</p>',
    '<h4>Detailed explanation</h4>',
    '<p>Scenario: topic has 6 partitions, group has 2 consumers → each gets 3 partitions. Add 4th consumer → 2 idle (6 partitions max). Add 6 consumers → 1 partition each (max parallelism).</p>',
    '<p><strong>Rebalance problems:</strong> during rebalance, consumption pauses ("stop the world") — can cause lag spikes. Mitigations: cooperative-sticky assignor, avoid bouncing consumers, static membership for short restarts.</p>',
    '<p><strong>Different groups:</strong> <code>billing-service</code> and <code>reporting-service</code> are separate groups — both read all messages independently (different offsets).</p>',
    '<h4>Follow-ups</h4>',
    '<p>What is consumer lag? Difference between log end offset and committed offset — main health metric.</p>',
])

add("semantics", "medium", "At-most-once, at-least-once, exactly-once", "Reliability", "consumers", True, [
    '<h4>Quick answer</h4>',
    '<p><strong>At-most-once:</strong> commit offset before process — may lose on crash. <strong>At-least-once:</strong> process then commit — may duplicate (most common). <strong>Exactly-once:</strong> Kafka transactions + idempotent producer + transactional consumer — complex, latency cost.</p>',
    '<h4>Detailed explanation</h4>',
    '<p><strong>Practical telco/billing approach (recommended in interviews):</strong></p>',
    '<ol>',
    '<li>Configure <strong>at-least-once</strong> delivery</li>',
    '<li>Make consumer <strong>idempotent</strong> (natural key + DB unique constraint, or dedup table)</li>',
    '<li>Commit offset <strong>after</strong> DB write succeeds</li>',
    '</ol>',
    '<pre><code>@Transactional void handle(OrderEvent e) { billingRepo.upsertByOrderId(e); }\n// commit offset after DB success</code></pre>',
    '<h4>Follow-ups</h4>',
    '<p>Exactly-once end-to-end (Kafka → DB → Kafka)? Use transactional outbox or Kafka Streams EOS — mention awareness, not claim deep prod unless true.</p>',
])

add("idempotent-consumer", "medium", "Idempotent consumer — how to implement", "Reliability", "consumers", True, [
    '<h4>Quick answer</h4>',
    '<p>Processing the same message twice must not double-charge or double-insert. Use business idempotency keys and database constraints.</p>',
    '<h4>Detailed explanation</h4>',
    '<ul>',
    '<li><strong>Natural key:</strong> <code>orderId</code> as primary key — second insert fails or upserts</li>',
    '<li><strong>Processed-events table:</strong> store <code>eventId</code> with unique index before side effects</li>',
    '<li><strong>Outbox + status:</strong> mark event processed in same TX as business update</li>',
    '</ul>',
    '<p>Same pattern you use when Camel redelivers JMS message after failure — Kafka duplicates are expected, not exceptional.</p>',
    '<h4>Example</h4>',
    '<pre><code>INSERT INTO processed_events (event_id) VALUES (?)\nON DUPLICATE KEY UPDATE event_id = event_id;</code></pre>',
])

add("offset-commit", "medium", "When should you commit offsets?", "Consumer", "consumers", False, [
    '<h4>Quick answer</h4>',
    '<p>Commit <strong>after</strong> side effects succeed (DB update, downstream call). Committing before processing risks message loss on crash.</p>',
    '<h4>Detailed explanation</h4>',
    '<p><strong>Auto commit (enable.auto.commit=true):</strong> easy for demos; can commit before your handler finishes → loss risk.</p>',
    '<p><strong>Manual / Spring:</strong> <code>ack-mode=RECORD</code> or <code>BATCH</code> after listener returns successfully. For slow handlers, tune <code>max.poll.interval.ms</code> so broker does not kick consumer out of group.</p>',
    '<h4>Follow-ups</h4>',
    '<p>Poison message blocking partition? Skip to DLT after N failures, commit offset for bad message so pipeline moves.</p>',
])

# --- Reliability ---
add("kafka-replication", "medium", "Replication, ISR, and leader election", "Reliability", "reliability", True, [
    '<h4>Quick answer</h4>',
    '<p>Each partition has one <strong>leader</strong> and N−1 <strong>followers</strong> (<strong>replication factor</strong>). Producers/consumers talk to leader; followers replicate. <strong>ISR</strong> = replicas caught up. If leader dies, a follower in ISR becomes leader.</p>',
    '<h4>Detailed explanation</h4>',
    '<p>Replication factor <strong>3</strong> on 3+ brokers is common: survive one broker loss. <code>min.insync.replicas=2</code> with <code>acks=all</code> means producer fails if only one replica alive — prevents silent data loss.</p>',
    '<ul>',
    '<li><strong>Unclean leader election:</strong> non-ISR replica becomes leader → possible data loss (usually disabled in prod)</li>',
    '<li><strong>Under-replicated partitions:</strong> alert — follower falling behind</li>',
    '</ul>',
    '<h4>Interview one-liner</h4>',
    '<p><em>"Replication is for durability; ISR defines which followers count as caught up for acks=all."</em></p>',
])

add("retention", "easy", "Retention, compaction, and replay", "Ops", "reliability", False, [
    '<h4>Quick answer</h4>',
    '<p><strong>Retention</strong> (time or size) deletes old segments. <strong>Compaction</strong> keeps latest value per key — changelog style. <strong>Replay</strong> = consumer reads from older offset or new consumer group starts at <code>earliest</code>.</p>',
    '<h4>Detailed explanation</h4>',
    '<ul>',
    '<li><code>retention.ms=604800000</code> (7 days) common for events</li>',
    '<li>Compacted topic: last state per <code>customerId</code> — useful for config/cache topics</li>',
    '<li>New microservice deploy: new <code>group.id</code> + <code>auto.offset.reset=earliest</code> rebuilds state (if retention still has data)</li>',
    '</ul>',
    '<h4>Follow-ups</h4>',
    '<p>Disk full? Increase retention only with disk planning; monitor broker disk %.</p>',
])

add("dlq", "medium", "Dead letter topic (DLT) for poison messages", "Reliability", "reliability", False, [
    '<h4>Quick answer</h4>',
    '<p>Message fails processing N times (bad JSON, null pointer, bad business data) → publish to <strong>DLT</strong> topic and commit offset on main topic so partition does not stall.</p>',
    '<h4>Detailed explanation</h4>',
    '<p>Same idea as Camel <code>deadLetterChannel</code> or JMS DLQ. Ops fixes data or code, replays from DLT manually.</p>',
    '<h4>Spring example</h4>',
    '<pre><code>@RetryableTopic(attempts = "3") @KafkaListener(topics = "order-events")</code></pre>',
    '<h4>Follow-ups</h4>',
    '<p>Always log correlationId when sending to DLT for support tickets (telco fallout debugging).</p>',
])

# --- Spring & Schema ---
add("spring-kafka", "medium", "Kafka with Spring Boot (practical guide)", "Spring", "spring", True, [
    '<h4>Quick answer</h4>',
    '<p>Add <code>spring-kafka</code>: configure bootstrap servers, use <code>KafkaTemplate</code> to send, <code>@KafkaListener</code> to receive, JSON serializers, error handler + retry/DLT.</p>',
    '<h4>Detailed explanation</h4>',
    '<pre><code>spring.kafka.bootstrap-servers: localhost:9092\nspring.kafka.consumer.group-id: reporting-service</code></pre>',
    '<pre><code>@KafkaListener(topics = "order-events", groupId = "reporting")\nvoid handle(OrderEvent e) { reportService.update(e); }</code></pre>',
    '<p><strong>Local practice:</strong> Docker Compose with Kafka + one Spring Boot app is enough to speak confidently — you do not need telco-scale cluster on laptop.</p>',
    '<h4>Follow-ups</h4>',
    '<p>Serialization: JSON for learning; Avro + Schema Registry in mature orgs.</p>',
])

add("schema-registry", "hard", "Schema Registry and schema evolution", "Schema", "spring", False, [
    '<h4>Quick answer</h4>',
    '<p>Central store for Avro/JSON/Protobuf schemas with version numbers. Producers embed schema id; consumers fetch schema to deserialize. <strong>Compatibility rules</strong> prevent breaking changes.</p>',
    '<h4>Detailed explanation</h4>',
    '<ul>',
    '<li><strong>Backward compatible:</strong> new schema can read old data (add optional field with default)</li>',
    '<li><strong>Forward compatible:</strong> old consumer can read new data (rare requirement)</li>',
    '<li><strong>Breaking change:</strong> remove required field, change type → new topic or careful migration</li>',
    '</ul>',
    '<p>Interview answer without deep Avro: <em>"I&apos;d treat events like API contracts — additive changes, version field in payload, contract tests for consumers."</em></p>',
    '<h4>Follow-ups</h4>',
    '<p>Avro vs JSON? Avro compact + enforced schema; JSON easier to debug in logs.</p>',
])

# --- Ops & Interview ---
add("troubleshooting", "hard", "Troubleshooting high consumer lag", "Ops", "ops", True, [
    '<h4>Quick answer</h4>',
    '<p><strong>Lag</strong> = how far behind consumers are. Causes: slow handler, too few consumers vs partitions, GC pauses, DB bottleneck, rebalance storm, poison message retry loop.</p>',
    '<h4>Detailed explanation</h4>',
    '<ol>',
    '<li><strong>Measure:</strong> lag per partition (Burrow, Kafka exporter, cloud metrics)</li>',
    '<li><strong>Scale:</strong> add consumers up to partition count</li>',
    '<li><strong>Optimize handler:</strong> batch DB writes, avoid synchronous external calls in hot path</li>',
    '<li><strong>Check downstream:</strong> MySQL slow queries — same as your Vodafone SQL tuning story</li>',
    '<li><strong>Poison pill:</strong> move to DLT after N tries</li>',
    '<li><strong>Rebalance:</strong> reduce unnecessary pod restarts during deploy</li>',
    '</ol>',
    '<h4>From your experience</h4>',
    '<p>Same incident mindset as Camel queue depth or JMS redelivery storms: metric → bottleneck → fix → alert. You already know ops thinking; map vocabulary to Kafka lag.</p>',
])

add("outbox-pattern", "hard", "Transactional outbox with Kafka", "Patterns", "ops", False, [
    '<h4>Quick answer</h4>',
    '<p>Write business row + outbox row in <strong>same DB transaction</strong>. Separate publisher polls outbox and publishes to Kafka — avoids "DB committed but message never sent".</p>',
    '<h4>Detailed explanation</h4>',
    '<pre><code>BEGIN; INSERT INTO orders (...); INSERT INTO outbox (...); COMMIT;\n-- relay publishes to Kafka topic order-events</code></pre>',
    '<p>Consumer still needs idempotency. Outbox solves <strong>producer-side</strong> dual-write problem. Debezium CDC is alternative (reads DB binlog → Kafka).</p>',
    '<h4>Follow-ups</h4>',
    '<p>Mention on microservices page too — shows you understand distributed consistency without claiming fake Kafka prod war stories.</p>',
])

add("event-driven-ms", "medium", "Kafka in event-driven microservices", "Architecture", "ops", False, [
    '<h4>Quick answer</h4>',
    '<p>Services publish facts (<code>AccountActivated</code>); others subscribe without publisher knowing them. Enables independent deploy and scale; tradeoff is <strong>eventual consistency</strong> and harder debugging.</p>',
    '<h4>Detailed explanation</h4>',
    '<ul>',
    '<li>Replace chained REST calls with events where delay OK</li>',
    '<li>Use correlationId in headers for distributed tracing</li>',
    '<li>Saga/choreography: multiple services react; compensating events on failure</li>',
    '</ul>',
    '<p>Choreography with Kafka = many listeners; orchestration = central coordinator (Camunda — your XL Axiata exposure).</p>',
])

add("camel-kafka", "medium", "Apache Camel + Kafka (bridge to your experience)", "Camel", "ops", True, [
    '<h4>Quick answer</h4>',
    '<p>Camel routes can consume/produce Kafka topics same as JMS — same EIP patterns: split, aggregate, retry, dead letter, wireTap.</p>',
    '<h4>Detailed explanation</h4>',
    '<pre><code>from("kafka:order-events?groupId=integration").to("jms:queue:billing-in");</code></pre>',
    '<p>Interview gold for you: <em>"I have deep Camel integration experience; Kafka is the log-backed transport Camel often fronts in modern estates. The hard part is reliability patterns — idempotency, DLQ, correlation — which I already applied on JMS at 1M+ txn/day."</em></p>',
])

add("limited-hands-on", "easy", "How to interview honestly with limited Kafka hands-on", "Interview", "ops", True, [
    '<h4>Quick answer</h4>',
    '<p>Lead with <strong>integration fundamentals</strong> (async, idempotency, ordering, DLQ) from Camel/JMS, then Kafka as the <strong>log-based</strong> implementation you have studied and practiced locally.</p>',
    '<h4>Detailed explanation</h4>',
    '<p><strong>Say:</strong></p>',
    '<ul>',
    '<li>"Production messaging was JMS/Camel; I understand consumer groups map to competing JMS consumers."</li>',
    '<li>"I built a small Spring Boot + Kafka Docker POC for order events — producer, listener, idempotent upsert."</li>',
    '<li>"For telco I would use accountId as partition key and at-least-once with idempotent billing writes."</li>',
    '</ul>',
    '<p><strong>Do not say:</strong> "I ran Kafka at 1M txn/day" unless true. <strong>Do say:</strong> "Same reliability patterns at scale on Camel; Kafka extends that with replay and higher throughput."</p>',
    '<h4>1-week learning plan</h4>',
    '<ol>',
    '<li>Day 1–2: read this page + draw producer/broker/consumer diagram</li>',
    '<li>Day 3–4: Docker Kafka + spring-kafka send/listen</li>',
    '<li>Day 5: implement idempotent consumer with H2/MySQL unique key</li>',
    '<li>Day 6–7: practice answers out loud — ordering, lag, acks, vs JMS</li>',
    '</ol>',
])

add("common-mistakes", "medium", "Common Kafka interview mistakes to avoid", "Interview", "ops", False, [
    '<h4>Quick answer</h4>',
    '<p>Top mistakes: claiming global ordering, ignoring duplicates, committing offset before DB write, confusing topic with queue deletion, not knowing partition/consumer limit.</p>',
    '<h4>Detailed explanation</h4>',
    '<ul>',
    '<li><strong>"Kafka guarantees order"</strong> → only per partition</li>',
    '<li><strong>"Exactly-once everywhere"</strong> → expensive; at-least-once + idempotent is the real world</li>',
    '<li><strong>"More consumers always faster"</strong> → capped by partition count</li>',
    '<li><strong>"Kafka replaces database"</strong> → it is a log, not source of truth for queries</li>',
    '<li><strong>No mention of monitoring lag</strong> → weak ops answer</li>',
    '</ul>',
])

SECTIONS = [
    ("fundamentals", "Fundamentals", "What Kafka is, architecture, topics, partitions, offsets.", 5),
    ("compare", "Kafka vs Queues", "When Kafka vs JMS/RabbitMQ and telco-style messaging.", 2),
    ("producers", "Producers & Partitions", "Sending messages, acks, keys, partition count.", 3),
    ("consumers", "Consumers & Semantics", "Groups, offsets, delivery guarantees, idempotency.", 4),
    ("reliability", "Durability & Retention", "Replication, retention, dead letter topics.", 3),
    ("spring", "Spring & Schema", "spring-kafka and schema evolution basics.", 2),
    ("ops", "Ops & Interview Strategy", "Lag, patterns, Camel bridge, honest framing.", 6),
]

def build():
    by_section = {}
    for sec, html in CARDS:
        by_section.setdefault(sec, []).append(html)

    parts = []
    total = len(CARDS)
    parts.append(f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kafka — Interview Prep</title>
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body data-page="kafka">
  <div class="layout">
    <aside class="sidebar"><h2>Interview Prep</h2><nav id="site-nav"></nav></aside>
    <main class="main">
      <header class="page-header">
        <h1>Kafka Interview Prep</h1>
        <p><strong>{total}</strong> questions in <strong>{len(SECTIONS)} sections</strong> — beginner-friendly deep answers. Built for learning even with limited hands-on; ties to your Camel/JMS experience.</p>
      </header>
      <div class="toolbar">
        <input type="search" id="search" placeholder="Search questions & answers...">
        <select id="level-filter" class="filter-select">
          <option value="all">All levels</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <label><input type="checkbox" id="vimp-only"> ⭐ Very important</label>
        <label><input type="checkbox" id="practice-mode"> Practice mode</label>
        <button type="button" class="btn" id="expand-all">Expand all</button>
        <button type="button" class="btn" id="collapse-all">Collapse all</button>
      </div>
      <div class="legend">
        <span><span class="level level-easy">Easy</span> fundamentals</span>
        <span><span class="level level-medium">Medium</span> 3 YOE depth</span>
        <span><span class="level level-hard">Hard</span> senior / tricky</span>
        <span><span class="level-vimp">⭐ VI</span> must practice before interview</span>
      </div>
      <div class="stats">
        <div class="stat-card"><strong id="stat-done">0</strong><span>Practiced</span></div>
        <div class="stat-card"><strong id="stat-total">0</strong><span>Total</span></div>
        <div class="stat-card"><strong id="stat-visible">0</strong><span>Showing</span></div>
        <div class="stat-card"><strong id="stat-pct">0%</strong><span>Progress</span></div>
      </div>
      <nav class="section-nav" aria-label="Kafka sections">""")

    for sid, title, _, _ in SECTIONS:
        parts.append(f'        <a href="#section-{sid}">{title}</a>')

    parts.append("      </nav>\n")

    for sid, title, desc, count in SECTIONS:
        parts.append(f"""      <section class="topic-section" id="section-{sid}">
        <h2>{title}</h2>
        <p class="section-desc">{desc}</p>
        <p class="section-meta">{count} questions in this section</p>
        <div class="qa-list">
""")
        parts.extend(by_section.get(sid, []))
        parts.append("        </div>\n      </section>\n")

    parts.append("""    </main>
  </div>
  <button class="mobile-toggle" id="sidebar-toggle" type="button">Menu</button>
  <script src="../assets/app.js"></script>
</body>
</html>
""")
    return "".join(parts)

if __name__ == "__main__":
    out = __file__.replace("gen_kafka.py", "kafka.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(build())
    print(f"Wrote {len(CARDS)} cards to kafka.html")
