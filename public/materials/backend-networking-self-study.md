# Backend Networking & Resource Management — Self-Study Module

**Track:** Backend engineering foundations  
**Level:** Beginner in networking → intermediate in Spring Boot internals  
**Primary language:** Java (use Java 25 or a supported JDK; basic exercises work on older JDKs)  
**Application context:** Spring Boot, PostgreSQL, outbound payment APIs, QRIS-style status polling  
**Recommended pace:** 8 weeks, 4–6 focused hours/week; go at your own pace.  
**Learning philosophy:** Observe → predict → experiment → explain → implement → test. Avoid looking up a full solution until you can articulate an approach.

> **Safety:** Use `example.com`, `localhost`, and services you own or are authorized to inspect. Do not packet-capture corporate/payment traffic, record production credentials, or load-test third parties without authorization. Never turn off TLS verification to make an error disappear.

---

## How to use this module

Each unit contains: **why it matters**, **concepts**, **experiments**, **implementation challenge**, **questions**, and **completion criteria**. Keep a learning journal in `notes/` with four headings: *Prediction*, *Observation*, *Explanation*, *What I still don't understand*. Save terminal outputs with secrets removed. Create your own diagrams.

**Suggested working repository**

```text
backend-networking-lab/
├── README.md
├── notes/
│   ├── 01-network-map.md
│   ├── 02-tcp.md
│   ├── 03-tls.md
│   ├── 04-http.md
│   ├── 05-pooling.md
│   ├── 06-concurrency.md
│   ├── 07-polling.md
│   └── 08-capstone.md
├── labs/
│   ├── java-sockets/
│   ├── http-client/
│   ├── spring-pool/
│   └── payment-reconciler/
└── evidence/
    └── .gitkeep
```

**Mastery rubric** for every unit:
- **0 — Unfamiliar:** Cannot explain the terms.
- **1 — Recognize:** Can identify terms and components.
- **2 — Explain:** Can explain the mechanism without copying notes.
- **3 — Apply:** Can perform the experiment and troubleshoot a variation.
- **4 — Teach:** Can justify design tradeoffs and explain failure modes.

Move on when you reach at least **3**. Revisit earlier units after the capstone.

## Roadmap

| Unit | Suggested week | Theme | Concrete output |
|---|---:|---|---|
| 0 | 1 | Map an HTTPS request | End-to-end annotated sequence diagram |
| 1 | 1–2 | IP, routing, ports, DNS, NAT | Address/port route inspection report |
| 2 | 2–3 | TCP, sockets, reliability | Java socket client/server + capture |
| 3 | 3–4 | TLS, PKI, certificates | Annotated handshake + PKIX incident report |
| 4 | 4–5 | HTTP and client behavior | Raw HTTP/1.1 + timing comparison |
| 5 | 5–6 | JDBC/HTTP connection pools | Hikari and HTTP-client saturation lab |
| 6 | 6–7 | Thread pools, blocking, resilience | Bounded-load experiment |
| 7 | 7–8 | Polling and distributed coordination | Durable status-check worker |
| 8 | After week 8 | Capstone | Mini payment status reconciler + design review |

---

# Unit 0 — Follow one request through the stack

### Goal
Explain how `restClient.get().uri("https://example.com").retrieve()` can become packets travelling between machines.

### Concept map

```text
Your code
  -> Spring REST abstraction
  -> concrete HTTP client
  -> DNS resolver (when needed)
  -> TCP socket / OS network stack (for HTTPS over HTTP/1.1 or HTTP/2)
  -> TLS negotiation + encrypted records
  -> IP packets and link-layer frames
  -> routers / NAT / possible proxy or load balancer
  -> destination server
  -> HTTP response over the established secure connection
```

The bullets describe **logical responsibilities**, not a perfectly serial timeline: the packets carrying the TCP and TLS handshakes themselves travel through routers. HTTP/3 is different: HTTP/3 runs over QUIC and UDP, not TCP.

### Activities
1. Draw the components in your own words: Java app, HTTP client, OS, DNS, router, gateway, destination.
2. Mark which components run on your host, inside your network, and on the remote side.
3. Color-code **protocol**, **implementation**, **resource**, and **business operation**.
4. Predict which steps vanish when the client reuses a connection.

### Check yourself
- Why is HTTPS not the same thing as TCP?
- Why is connection pooling not itself a protocol?
- How could a load balancer make the path different from a direct connection?

**Done when:** You can narrate the flow in under three minutes without notes.

---

# Unit 1 — IP, DNS, ports, routing and NAT

### Why this matters
It explains `UnknownHostException`, connection failures, network routing, egress IP whitelisting, and why the same domain can resolve to multiple servers.

### Learn
- IPv4 vs IPv6; private vs public addresses.
- Hostname versus IP address; A/AAAA/CNAME DNS records; TTL and caching.
- Resolver versus authoritative DNS server; DNS is not always a single request.
- IP routing and next hops; packets can take different paths.
- TCP ports and source/destination endpoints; ephemeral client port.
- Network Address Translation (NAT), especially outbound source-IP translation in cloud environments.
- The meaning of a TCP 4-tuple: `(source IP, source port, destination IP, destination port)`.

### Labs (macOS or Linux)

```bash
dig example.com A
dig example.com AAAA
nslookup example.com
curl -v https://example.com -o /dev/null
nc -vz example.com 443
```

On macOS, explore interfaces and routes:

```bash
ifconfig
route -n get 1.1.1.1
netstat -rn
```

On Linux, analogous commands include `ip addr`, `ip route`, and `ss`.

Write down **which command answers which question**. Do not treat `nc -vz` as a TLS certificate test: it tests TCP connectivity.

### Implementation challenge
Write a tiny Java CLI that accepts a hostname and prints all resolved IP addresses using Java's DNS resolution API. Then explain why resolved addresses can vary by machine or over time.

### Thought questions
1. Why can `ping` fail even when HTTPS succeeds?
2. A third party whitelists your application's IP. Why might it need your NAT gateway's address rather than your container's address?
3. What happens when DNS succeeds but port 443 is unreachable?
4. Why do DNS answers sometimes differ between your laptop and production?

**Evidence:** A short report with outputs, routing diagram, and explanations.

---

# Unit 2 — TCP and Java sockets

### Why this matters
This unit explains why a successful socket connection does not imply a completed payment, how read timeouts differ from connection timeouts, and how connection reuse works.

### Learn
- Connection-oriented transport; byte stream, **not** message boundaries.
- TCP three-way handshake: SYN → SYN-ACK → ACK.
- Sequence and acknowledgement numbers; retransmission, in-order delivery.
- Flow control versus congestion control.
- Round-trip time (RTT), packet loss, MTU.
- TCP flags: SYN, ACK, FIN, RST.
- Connection teardown, half-close, `TIME_WAIT`.
- TCP keepalive versus application-level keepalive.
- Why one application `write` does **not** guarantee one peer `read`.

### Lab A — Create a raw socket pair
Build a `ServerSocket` bound to `127.0.0.1:9090` and a client using `Socket`. Your protocol should use **length-prefixed messages**: send a 4-byte length before UTF-8 bytes, and read exactly that number of bytes. Implement the code yourself.

Minimum tests:
1. Connect and exchange `hello`.
2. Send a message larger than a typical single network packet.
3. Split the client's logical message into multiple writes; verify the server still reconstructs it.
4. Close the client cleanly; observe server behavior.
5. Stop the server while a client is communicating; document the observed exception.

**Optional hints (not a solution):** Look at `DataInputStream`, `DataOutputStream`, `readFully()`, `setSoTimeout()`, and try-with-resources.

### Lab B — Observe the handshake
Open Wireshark or use an authorized capture on your **local loopback** interface. Filter for the test port. For example, on macOS after confirming the interface name:

```bash
sudo tcpdump -i lo0 -nn 'tcp port 9090'
```

Capture connection establishment, message transmission, and close. Label SYN, SYN-ACK, ACK, and FIN/RST where visible. Packet offloading and capture position can affect details.

### Lab C — A TCP-connect test

```bash
nc -vz example.com 443
```

Explain exactly what it establishes and what it **does not** establish.

### Thought questions
1. The client has sent a request and times out before seeing a response. Can the server have processed it?
2. If a receiver reads 100 bytes, is that proof the sender wrote exactly 100 bytes?
3. What is different about a timeout waiting for a TCP connection versus a timeout waiting to read bytes?
4. What can happen if the client sends faster than the receiving application can consume?

**Done when:** You can explain a packet trace, reconstruct framed messages reliably, and describe a TCP failure without mixing it up with an HTTP status code.

---

# Unit 3 — TLS, certificates and the handshake

### Why this matters
This connects directly to Java `SSLHandshakeException`, `PKIX path building failed`, truststores, certificate chains, and secure communication with payment providers.

### Learn
- Confidentiality, integrity, server authentication.
- TLS 1.3 basic full handshake: ClientHello → ServerHello → encrypted server authentication/Finished → client Finished.
- Public/private key signatures, ephemeral key agreement, session keys, symmetric authenticated encryption.
- Root CA → intermediate CA → leaf/server certificate; Java truststore versus server keystore.
- SAN hostname matching, certificate validity and chain building.
- SNI and ALPN; `http/1.1` versus `h2`.
- TLS termination at reverse proxies; hop-by-hop security assumptions.
- TLS session resumption. Clarify why TLS is not simply “encrypt everything with the server's RSA public key.”

### Lab A — Inspect a real certificate

```bash
openssl s_client -connect example.com:443 -servername example.com -showcerts
openssl s_client -connect example.com:443 -servername example.com -tls1_3
```

Record the negotiated version/cipher, peer certificate hostname(s), issuer, and chain. Explain why `-servername` matters. Output can vary by environment and OpenSSL version.

### Lab B — Diagnose a controlled trust failure
Create a **local** HTTPS endpoint with a development certificate using tools you trust, and connect with Java **without** adding its CA to the Java truststore. Observe the exception. Then configure a dedicated development truststore that trusts the correct certificate/CA. Do not set “trust all,” turn off hostname verification, or globally modify the system truststore for this exercise.

Possible Java debug flag (development only):

```text
-Djavax.net.debug=ssl:handshake
```

### Incident exercise
Write an incident note: “Our Spring Boot app got PKIX path building failed after migrating from Java 11 to Java 25.” Include at least 4 hypotheses, checks for each, and a secure remediation plan. Distinguish **untrusted chain** from **hostname mismatch**.

### Questions
1. Why isn't TLS provided by TCP itself?
2. Can a validly encrypted TLS session be established to the *wrong* hostname?
3. Why might browser HTTPS work while the JVM fails certificate validation?
4. What would a TLS-terminating reverse proxy be able to observe?

**Done when:** You can interpret a TLS handshake and write a credible PKIX incident investigation.

---

# Unit 4 — HTTP, REST clients, and performance timing

### Why this matters
It connects Spring APIs to actual wire protocols, teaches why timeouts mean different things, and explains connection reuse.

### Learn
- HTTP method, path, version, status, headers, body.
- HTTP status vs business status (`HTTP 200` and `payment=PENDING` can coexist).
- HTTP/1.1 body framing and persistent connections.
- HTTP/2 binary frames, multiplexed streams, and protocol negotiation.
- HTTP/3 = HTTP over QUIC/UDP, not TCP.
- Idempotent method semantics versus business-operation idempotency.
- Synchronous client (`RestClient`, `RestTemplate`), declarative interface, and reactive `WebClient`.
- Underlying request factory and connection manager; APIs do not themselves guarantee a given pool behavior.
- Timeout taxonomy: pool acquisition, TCP connect, TLS handshake, response/read, overall deadline.
- Measuring DNS, connection establishment, TLS setup, first byte, total elapsed time.

### Lab A — Read a request

```bash
curl -v --http1.1 https://example.com -o /dev/null
curl -s -o /dev/null -w 'HTTP version: %{http_version}\n' https://example.com
```

Annotate host, request headers, response code, and what is encrypted on the wire.

### Lab B — Capture timings

```bash
curl -s -o /dev/null \
  -w 'DNS=%{time_namelookup}\nTCP=%{time_connect}\nTLS=%{time_appconnect}\nFirstByte=%{time_starttransfer}\nTotal=%{time_total}\n' \
  https://example.com
```

These are cumulative timestamps, **not independent stage durations**. Compare repeated requests, taking account of process and connection reuse (separate curl invocations generally cannot share the same in-process pool).

### Lab C — Reuse one HTTP client
Write a Java program that reuses **one** `java.net.http.HttpClient` or a shared Spring `RestClient` with an explicitly selected backend. Send several sequential requests to a **local service** and examine open sockets/captures. Repeat using a new client instance per request. Measure, but avoid assuming an exact number of connections—protocol selection and implementation matter.

### Diagnosis cases
- TCP connect succeeds; TLS fails: where do you look?
- TLS succeeds; HTTP 503: what does this say about the network?
- Pool acquisition takes 4 seconds; remote server responds in 20 ms: what is slow?
- Your payment `POST` times out; is retrying it blindly safe?

**Done when:** You can locate a timeout in the correct stage and distinguish HTTP success from business success.

**Version note:** Spring Framework 7 deprecates `RestTemplate` in favor of `RestClient`. Learn both when maintaining older code; favor `RestClient` in new imperative Spring work. `WebClient` supports non-blocking I/O, but it also needs capacity and timeout controls.

---

# Unit 5 — Database and HTTP connection pools

### Why this matters
This ties HikariCP and HTTP client pools to resource reuse, contention, saturation, and short transactions.

### Learn
- A pool **borrows and returns** reusable resources; it is not the same thing as a scheduler or executor.
- HikariCP: physical JDBC connection vs logical connection handle; max pool size; acquisition timeout; idle and lifetime policies.
- Database connection establishment: TCP and possibly TLS, database protocol initialization and authentication.
- Transactions: JDBC connections may be held through the scope of a database transaction.
- HTTP client: max total connections vs per-route constraints; HTTP/2 multiplexing changes the relationship between requests and connections.
- Why increasing pools can make a database or remote API *worse*, not better.
- Per-instance pool limits and total fleet connection budget.

### Core thought experiment
You have 4 replicas, each configured for a Hikari pool of 12 connections. There are 15 other connections needed by administrators, jobs, and monitoring. The **configured capacity budget** is `4 × 12 + 15 = 63`. Explain why actual active connections may be lower and why the DB needs additional headroom.

### Lab A — Hikari saturation
Create a local Spring Boot app using PostgreSQL (or isolated test PostgreSQL). Give HikariCP a very small `maximum-pool-size` (e.g., 2) and a short `connection-timeout`. Make two transactions hold connections long enough for a third borrower to wait, using a controlled test harness. Observe pending borrowers, acquisition latency, and timeouts. Avoid using sleep inside transactions in real application code.

Record:
- Active, idle, pending and timeout metrics.
- Which operations borrowed and returned connections.
- Exactly when the third operation failed.

### Lab B — HTTP pool saturation
Configure an HTTP client with a low per-route connection limit and issue parallel requests to **your own slow local HTTP server**. Observe waiting to acquire a connection versus waiting for a remote response. Compare with a sufficiently sized pool, while avoiding unbounded concurrency.

### Lab C — Transaction boundary reasoning
Assess this pseudocode:

```text
@Transactional
  update transaction -> call remote provider for 8 seconds -> update status
```

Describe when database resources might be held unnecessarily. Redesign as short DB steps separated by an external call. Explain how to recover from a crash or uncertain remote outcome without assuming a distributed ACID transaction.

### Important cautions
- Hikari's default `maximumPoolSize` is 10; `minimumIdle` normally defaults to `maximumPoolSize` when unset. Don't override dozens of values without evidence.
- `connectionTimeout` is **time to get a connection**, not a SQL statement timeout.
- Database connections are not HTTP connections; they may both ultimately use TCP underneath.
- Pool sizing must use metrics, query performance, transaction duration and database limits—not an arbitrary rule like “more is faster.”

**Done when:** You can create and explain resource saturation without blaming the wrong pool.

---

# Unit 6 — Threads, executors, queues and failure containment

### Why this matters
A service can have healthy connections but still become unresponsive when all request threads are blocked, or when a background queue grows without bound.

### Learn
- Process vs thread; blocking I/O vs non-blocking I/O.
- Incoming Tomcat worker threads versus an outbound HTTP client pool.
- Async `Executor`/`ThreadPoolTaskExecutor` versus `TaskScheduler`.
- Queue capacity and task rejection policies.
- Concurrency limit vs requests-per-second limit.
- Little's Law intuition: average in-flight work ≈ throughput × average time in system, under stable conditions.
- Backpressure; bulkheads; circuit breakers; retries/backoff/jitter.
- Virtual threads reduce the cost of many blocking tasks but do not create more DB or HTTP connections; bound concurrency against external systems regardless.

### Lab
Build a **local** HTTP endpoint that waits an adjustable time before returning. Have a separate caller issue a bounded batch of concurrent requests using an executor. Record throughput, p50/p95 latency, queue length, thread counts, and open connections if available.

Test three scenarios:
1. Small number of concurrent requests, fast remote service.
2. Same concurrency, slow remote service.
3. Much higher offered load with a **bounded** queue and explicit rejection behavior.

### Incident study
An external status API becomes 10× slower. Your service's Tomcat workers are busy, Hikari pending remains low, and outbound calls fill the HTTP client's per-route limit. Write down the likely bottleneck, which metrics you'd consult, and **why increasing Hikari pool size does not help**.

### Questions
- Why is a larger thread pool not necessarily better?
- What does `@Async` change, and what doesn't it change?
- When should work be rejected or deferred instead of queued indefinitely?
- Why does a virtual thread still need limits on downstream calls?

**Done when:** You can draw a dependency graph between thread, HTTP, and JDBC capacity.

---

# Unit 7 — Polling, webhooks, scheduling and reconciliation

### Why this matters
A QRIS-style transaction may remain pending for minutes. You must check it without keeping thousands of threads or connections open.

### Learn
- Polling = repeated status inquiry; pooling = reusable connection management.
- Short polling, long polling, database polling and reconciliation.
- Webhook/notification as push; polling as verification/fallback.
- `@Scheduled(fixedRate)`, `fixedDelay`, cron, and their actual scheduling behavior.
- A scheduler determines **when** work runs; workers determine **how much** runs concurrently.
- Persistent work state: `next_check_at`, `attempt_count`, `status`, `last_error`, `locked_until`/lease details when needed.
- Terminal states, provider-defined expiry, retries, capped exponential backoff with jitter.
- At-least-once processing, idempotent status updates, duplicate notifications, race conditions.
- Safe coordination across replicas (`FOR UPDATE SKIP LOCKED` transaction claiming, leases, or durable messaging). Lock only while claiming; do not hold a DB transaction open during external calls.
- Reconciliation and uncertain outcomes: a failed inquiry does not imply payment failure.

### Design problem
Create a transaction at 10:00:00 with `status=PENDING`. It should be checked **15 minutes after creation**, not every 15 minutes from app startup. Define a due timestamp (`next_check_at`) and a scheduler that discovers due rows. Explain what happens if the application is down at 10:15 and returns at 10:18.

### Suggested minimal schema (design, not mandatory SQL)

```text
payment_transaction
  id
  provider_reference (unique where appropriate)
  status
  created_at
  updated_at
  next_check_at
  attempt_count
  last_checked_at
  last_error_code
  claim_owner (optional)
  claim_until (optional)
```

### Design tasks
1. Draw state transitions: `PENDING` → `SUCCESS` / `FAILED` / `EXPIRED` **when the authoritative system actually reports them**.
2. Define what happens when polling and a webhook report success simultaneously.
3. Set a maximum number of concurrent provider requests and a bounded due-work batch size.
4. Explain what happens after process restart and during two-instance deployment.
5. Design observability: overdue work count, attempt rate, provider errors, uncertain outcomes, terminal outcomes, and processing lag.

### Challenge: failure injection
Run a fake provider that cycles through: `PENDING`, network timeout, `PENDING`, duplicate callback, `SUCCESS`. Ensure final status is correct and duplicate effects do not occur. Also test a crash after provider response but before local state is persisted.

### Questions
- Why is one sleeping thread per transaction a bad general design?
- Should a webhook always win over a status-check response?
- Why must status updates and business effects be idempotent?
- When should the worker stop polling?

**Done when:** Your design can survive restart, duplicate processing and temporary provider unavailability.

---

# Unit 8 — Capstone: Mini Payment Status Reconciler

**Objective:** Design and implement an end-to-end miniature payment reconciliation system that makes network, pool and concurrency behavior observable. Use only a local fake provider—never a production payment gateway.

## Requirements

**Service A — Fake provider**
- `POST /payments`: create a fake payment, return reference and `PENDING`.
- `GET /payments/{id}/status`: return current simulated status.
- Adjustable latency, error responses and connection drops for controlled tests.
- `POST /admin/payments/{id}/complete`: manually switch to `SUCCESS` in the local simulator.

**Service B — Payment application**
- `POST /payments`: persist local intent and invoke provider with a stable idempotency key when creating externally.
- `GET /payments/{id}`: expose local state.
- Background worker selects *due* pending payments in bounded batches.
- Outgoing calls use a **shared**, explicitly configured HTTP client.
- PostgreSQL is accessed through HikariCP.
- Separate database transactions from remote network calls.
- Persist attempts and schedule future checks.
- Handle duplicate callbacks and duplicate worker execution safely.

**Operational features**
- At least one repeatable integration test per failure mode.
- Configurable pool sizes, connection timeouts, response timeouts and concurrency limits.
- Basic counters/timers for database pool wait, HTTP acquisition/latency, polling attempts, failures and pending backlog.
- No logging of secrets or sensitive payment payloads.

## Architecture sketch

```text
Client -> Payment API --------------------------> PostgreSQL
                |                                   ^
                v                                   |
           HTTP client pool ----> Fake Provider     |
                ^                                   |
                |                                   |
 Scheduler -> claim due work -> bounded workers ----+
                         |
                         +----> query provider status
```

## Acceptance tests

- [ ] A first payment ends in `PENDING` and has a due timestamp.
- [ ] A pending payment is checked **when due**, not by holding a sleeping request thread.
- [ ] The worker uses the outbound HTTP connection pool and releases resources.
- [ ] `SUCCESS` stops further checks.
- [ ] Duplicate callbacks do not duplicate business effects.
- [ ] Timeout/connection reset produces an **uncertain/retryable** outcome, not automatic success/failure.
- [ ] Pool saturation is measurable and does not create unbounded queued tasks.
- [ ] A restart does not permanently lose due work.
- [ ] Two worker instances cannot process the same claim at the same time without coordination; duplicate delivery is still tolerated.
- [ ] The README contains a diagram, operational assumptions, tradeoffs, and failure-recovery explanations.

## Oral design review — no code allowed
Explain these scenarios in your own words:
1. 500 concurrent API requests, 10 JDBC connections, slow queries: what queues and why?
2. 1000 pending status inquiries, 20 HTTP connections: how do you enforce concurrency and rate limits?
3. Java reports `PKIX path building failed`: how do you investigate securely?
4. The provider processed a payment but the HTTP response was lost: what state do you record?
5. Two application instances poll the same transaction: how do you prevent harmful duplicate effects?
6. Your pool metrics look healthy but response latency has tripled: what layers do you inspect?

---

# Self-assessment — 20 questions

Answer in writing **before** checking the reference reading.

1. What are the different responsibilities of HTTP, TLS, TCP, IP and Ethernet/Wi-Fi?
2. What can a DNS resolver cache, and why can IP results vary?
3. What is the TCP 4-tuple?
4. What exactly happens in the TCP three-way handshake?
5. Why does TCP not preserve `write()` boundaries?
6. What can a TCP ACK prove—and what can it not prove about a payment?
7. Why does TLS use both asymmetric and symmetric cryptography?
8. What is SNI? What is ALPN?
9. What does a Java truststore trust?
10. Why can browser HTTPS succeed while a Java client fails PKIX validation?
11. Why is HTTP 200 not equivalent to a successful financial transaction?
12. Why is HTTP/2 multiplexing different from HTTP/1.1 reuse?
13. What is the difference between pool-acquisition timeout and connect timeout?
14. What does `connection.close()` mean on a pooled JDBC connection?
15. Why might an external HTTP call inside `@Transactional` cause DB pool saturation?
16. Why can't increasing Hikari's max size always improve throughput?
17. What's the difference between `TaskScheduler` and a task executor?
18. Why is a retry unsafe after an ambiguous payment `POST` without idempotency protection?
19. How do you persist polling progress across process restarts?
20. What metrics would prove your polling worker is overwhelming a downstream provider?

**Evaluation:** Give yourself 0–4 using the rubric. Any answer ≤2 becomes a follow-up experiment. Do not grade yourself by how polished the wording sounds: grade whether you can explain a counterexample and the failure mode.

---

# Practical study protocol — preventing AI dependency

For every lab:
1. Spend **15–30 minutes** formulating a prediction and trying it yourself.
2. Search official docs for the API or protocol, not a complete implementation.
3. If blocked, request a **hint** or a **review of your reasoning**, not the final code.
4. After making it work, remove the code from sight and reimplement the critical portion.
5. Write a paragraph describing *what you observed at the OS/network layer* and how it maps back to Java.
6. Repeat one experiment after a week without instructions.

Useful prompt to an AI tutor:

> I am following Unit N. Do not generate a full solution. Ask me what I predict, inspect my approach, give one graduated hint if needed, and evaluate my explanation against the completion criteria.

---

# Reference shelf

**Foundations**
- Kurose & Ross, *Computer Networking: A Top-Down Approach*.
- Stevens & Fall, *TCP/IP Illustrated, Volume 1*.
- TCP specification: https://www.rfc-editor.org/rfc/rfc9293
- TLS 1.3 specification: https://www.rfc-editor.org/rfc/rfc8446
- HTTP semantics: https://www.rfc-editor.org/rfc/rfc9110
- HTTP/1.1 messaging: https://www.rfc-editor.org/rfc/rfc9112
- HTTP/2: https://www.rfc-editor.org/rfc/rfc9113
- HTTP/3: https://www.rfc-editor.org/rfc/rfc9114

**Java/Spring**
- Spring HTTP clients: https://docs.spring.io/spring-framework/reference/integration/rest-clients.html
- Spring scheduling: https://docs.spring.io/spring-framework/reference/integration/scheduling.html
- HikariCP documentation: https://github.com/brettwooldridge/HikariCP
- Java `Socket`: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/Socket.html
- Java `HttpClient`: https://docs.oracle.com/en/java/javase/25/docs/api/java.net.http/java/net/http/HttpClient.html
- Wireshark user guide: https://www.wireshark.org/docs/wsug_html_chunked/

## Progress tracker

| Unit | First attempt | Evidence path | Score (0–4) | Revisit date |
|---|---|---|---:|---|
| 0 | | | | |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |

**Graduation criterion:** All unit scores ≥3; capstone acceptance tests checked; ability to explain the full network-to-application journey and a failure incident without looking at notes.
